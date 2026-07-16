import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { pushArticleToGithub, deleteArticleFromGithub } from "./github-push.functions";
import { generateArticleSource } from "./ts-generator";

const REPO_OWNER = "jeitinho";
const REPO_NAME = "rio-uncovered";
const REPO_BRANCH = "main";

const IdSchema = z.object({ contentId: z.string().uuid() });
const DeleteSchema = z.object({
  contentId: z.string().uuid(),
  confirmSlug: z.string().min(1),
});

type Ctx = { supabase: import("@supabase/supabase-js").SupabaseClient; userId: string };

async function loadArticle(supabase: Ctx["supabase"], contentId: string) {
  const { data: content, error } = await supabase
    .from("contents")
    .select(
      "id,slug,title,subtitle,excerpt,body_json,tags,published_at,reading_time_min,seo_title,seo_description,language,metadata,author_id,category_id,cover_media_id,type,status",
    )
    .eq("id", contentId)
    .single();
  if (error || !content) throw new Error(error?.message ?? "Contenu introuvable");
  if (!content.slug) throw new Error("Slug manquant");

  const [authorRes, categoryRes, coverRes] = await Promise.all([
    content.author_id
      ? supabase.from("authors").select("slug").eq("id", content.author_id).maybeSingle()
      : Promise.resolve({ data: null }),
    content.category_id
      ? supabase.from("content_categories").select("slug").eq("id", content.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    content.cover_media_id
      ? supabase.from("media").select("url").eq("id", content.cover_media_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const meta = (content.metadata as { cover_url?: string } | null) ?? {};
  return {
    content,
    authorSlug: (authorRes.data as { slug?: string } | null)?.slug ?? null,
    categorySlug: (categoryRes.data as { slug?: string } | null)?.slug ?? null,
    coverUrl: (coverRes.data as { url?: string } | null)?.url ?? meta.cover_url ?? null,
  };
}

function buildSource(a: Awaited<ReturnType<typeof loadArticle>>, published: boolean) {
  return generateArticleSource(
    {
      slug: a.content.slug!,
      title: a.content.title,
      subtitle: a.content.subtitle,
      excerpt: a.content.excerpt,
      cover_url: a.coverUrl,
      author_slug: a.authorSlug,
      category_slug: a.categorySlug,
      tags: a.content.tags ?? [],
      published_at: a.content.published_at,
      reading_time_min: a.content.reading_time_min,
      seo_title: a.content.seo_title,
      seo_description: a.content.seo_description,
      language: a.content.language ?? "fr",
      published,
    },
    a.content.body_json,
  );
}

async function logPublication(
  supabase: Ctx["supabase"],
  contentId: string,
  userId: string,
  action: "archive" | "delete" | "republish",
  status: "success" | "failed",
  payload: Record<string, unknown>,
  external?: { url?: string | null; ref?: string | null },
) {
  const { data: channel } = await supabase
    .from("channels")
    .select("id")
    .eq("slug", "github-blog")
    .maybeSingle();
  if (!channel?.id) return;
  await supabase.from("publications").insert({
    channel_id: channel.id,
    content_id: contentId,
    status,
    payload: { ...payload, action } as never,
    external_ref: external?.ref ?? null,
    external_url: external?.url ?? null,
    published_by: userId,
  });
}

// Archive: keep the file on GitHub but flip published=false, status -> archived.
export const archiveArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => IdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const a = await loadArticle(supabase, data.contentId);
    const source = buildSource(a, false);
    const targetPath = `src/content/articles/${a.content.slug}.ts`;
    const push = await pushArticleToGithub({
      data: {
        owner: REPO_OWNER, repo: REPO_NAME, branch: REPO_BRANCH,
        path: targetPath, content: source,
        message: `content: archive ${a.content.slug}`,
        allowUpdate: true,
      },
    });
    if (!push.ok) {
      await logPublication(supabase, data.contentId, userId, "archive", "failed", { error: push.error });
      return { ok: false as const, error: push.error };
    }
    await supabase.from("contents").update({ status: "archived" }).eq("id", data.contentId);
    await logPublication(supabase, data.contentId, userId, "archive", "success",
      { commit_url: push.commitUrl, commit_sha: push.commitSha, path: targetPath },
      { url: push.commitUrl, ref: push.commitSha },
    );
    return { ok: true as const, commitUrl: push.commitUrl, commitSha: push.commitSha };
  });

// Republish: flip published=true, status -> published.
export const republishArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => IdSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;
    const a = await loadArticle(supabase, data.contentId);
    const source = buildSource(a, true);
    const targetPath = `src/content/articles/${a.content.slug}.ts`;
    const push = await pushArticleToGithub({
      data: {
        owner: REPO_OWNER, repo: REPO_NAME, branch: REPO_BRANCH,
        path: targetPath, content: source,
        message: `content: republish ${a.content.slug}`,
        allowUpdate: true,
      },
    });
    if (!push.ok) {
      await logPublication(supabase, data.contentId, userId, "republish", "failed", { error: push.error });
      return { ok: false as const, error: push.error };
    }
    const publishedAt = a.content.published_at ?? new Date().toISOString();
    await supabase.from("contents").update({ status: "published", published_at: publishedAt }).eq("id", data.contentId);
    await logPublication(supabase, data.contentId, userId, "republish", "success",
      { commit_url: push.commitUrl, commit_sha: push.commitSha, path: targetPath },
      { url: push.commitUrl, ref: push.commitSha },
    );
    return { ok: true as const, commitUrl: push.commitUrl, commitSha: push.commitSha };
  });

// Real delete: admin/manager only, requires slug confirmation.
export const deleteArticle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => DeleteSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as Ctx;

    // Server-side role check — do NOT trust the UI.
    const { data: canManage, error: rpcError } = await supabase.rpc("can_manage", { _user_id: userId });
    if (rpcError) throw new Error(rpcError.message);
    if (!canManage) throw new Error("Forbidden: réservé aux administrateurs et managers");

    const a = await loadArticle(supabase, data.contentId);
    if (data.confirmSlug !== a.content.slug) {
      return { ok: false as const, error: "La confirmation ne correspond pas au slug de l'article." };
    }

    const targetPath = `src/content/articles/${a.content.slug}.ts`;
    const del = await deleteArticleFromGithub({
      data: {
        owner: REPO_OWNER, repo: REPO_NAME, branch: REPO_BRANCH,
        path: targetPath,
        message: `content: delete ${a.content.slug}`,
      },
    });
    if (!del.ok) {
      await logPublication(supabase, data.contentId, userId, "delete", "failed", { error: del.error });
      return { ok: false as const, error: del.error };
    }
    await supabase.from("contents").update({ status: "deleted" }).eq("id", data.contentId);
    await logPublication(supabase, data.contentId, userId, "delete", "success",
      { commit_url: del.commitUrl, commit_sha: del.commitSha, path: targetPath, already_gone: del.alreadyGone },
      { url: del.commitUrl, ref: del.commitSha },
    );
    return { ok: true as const, commitUrl: del.commitUrl, commitSha: del.commitSha, alreadyGone: del.alreadyGone };
  });
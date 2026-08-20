import type { Publisher, PublisherContext, PublisherResult } from "./types";
import { db } from "@/lib/db-client";
import { generateArticleSource, tiptapToSections } from "./ts-generator";
import { pushArticleToGithub } from "./github-push.functions";

const REPO_OWNER = "jeitinho";
const REPO_NAME = "rio-uncovered";
const REPO_BRANCH = "main";

type RequiredCheck = { ok: true } | { ok: false; missing: string[] };
function validateRequired(c: { slug: string | null; title: string | null; excerpt: string | null; body_json: unknown; seo_title: string | null; seo_description: string | null; tags: string[] | null; reading_time_min: number | null; author_slug: string | null; category_slug: string | null }): RequiredCheck {
  const missing: string[] = [];
  if (!c.slug) missing.push("slug"); if (!c.title) missing.push("titre"); if (!c.excerpt) missing.push("résumé"); if (!c.body_json) missing.push("contenu");
  if (!c.seo_title) missing.push("titre SEO"); if (!c.seo_description) missing.push("meta description"); if (!c.tags?.length) missing.push("tags"); if (c.reading_time_min == null) missing.push("temps de lecture"); if (!c.author_slug) missing.push("auteur"); if (!c.category_slug) missing.push("catégorie");
  return missing.length ? { ok: false, missing } : { ok: true };
}

export const githubPublisher: Publisher = {
  id: "github", label: "GitHub (blog.jeitinho.fr)", channelSlug: "github-blog", supportsContentType: (t) => t === "blog" || t === "guide",
  async publish(ctx: PublisherContext): Promise<PublisherResult> {
    const { data: content, error } = await db.from("contents").select("id,slug,title,subtitle,excerpt,body_json,tags,published_at,reading_time_min,seo_title,seo_description,language,metadata,author_id,category_id,cover_media_id,type").eq("id", ctx.contentId).single();
    if (error || !content) return { ok: false, error: `Contenu introuvable: ${error?.message ?? ctx.contentId}` };
    const c = content as any;
    if (!c.slug) return { ok: false, error: "Slug manquant." };

    const [authorRes, categoryRes, coverRes] = await Promise.all([
      c.author_id ? db.from("authors").select("slug").eq("id", c.author_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      c.category_id ? db.from("content_categories").select("slug").eq("id", c.category_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
      c.cover_media_id ? db.from("media").select("url").eq("id", c.cover_media_id).maybeSingle() : Promise.resolve({ data: null, error: null }),
    ]);
    const meta = (c.metadata as { cover_url?: string } | null) ?? {};
    const authorSlug = (authorRes.data as any)?.slug ?? null;
    const categorySlug = (categoryRes.data as any)?.slug ?? null;
    if (!ctx.dryRun) {
      const check = validateRequired({ slug: c.slug, title: c.title, excerpt: c.excerpt, body_json: c.body_json, seo_title: c.seo_title, seo_description: c.seo_description, tags: c.tags, reading_time_min: c.reading_time_min, author_slug: authorSlug, category_slug: categorySlug });
      if (!check.ok) return { ok: false, error: `Champs manquants: ${check.missing.join(", ")}` };
    }

    const sections = tiptapToSections(c.body_json);
    const source = generateArticleSource({ slug: c.slug, title: c.title, subtitle: c.subtitle, excerpt: c.excerpt, cover_url: (coverRes.data as any)?.url ?? meta.cover_url ?? null, author_slug: authorSlug, category_slug: categorySlug, tags: c.tags ?? [], published_at: c.published_at, reading_time_min: c.reading_time_min, seo_title: c.seo_title, seo_description: c.seo_description, language: c.language ?? "fr" }, c.body_json);
    const targetPath = `src/content/articles/${c.slug}.ts`;
    const importVar = c.slug.replace(/[-.]/g, "_");
    const payload = { target_path: targetPath, source, registry_hint: `Ajouter dans src/content/articles/index.ts : import ${importVar} from './${c.slug}';`, sections_count: sections.length, generated_at: new Date().toISOString(), dry_run: ctx.dryRun } as const;
    const { data: channel } = await db.from("channels").select("id").eq("slug", "github-blog").maybeSingle();

    if (ctx.dryRun) {
      if ((channel as any)?.id) await db.from("publications").insert({ channel_id: (channel as any).id, content_id: c.id, status: "pending", payload, published_by: ctx.triggeredBy, scheduled_at: null });
      return { ok: true, externalRef: targetPath, externalUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${REPO_BRANCH}/${targetPath}`, preview: source, payload };
    }

    const allowUpdate = !!c.published_at;
    let pushRes: any;
    try {
      pushRes = await pushArticleToGithub({ data: { owner: REPO_OWNER, repo: REPO_NAME, branch: REPO_BRANCH, path: targetPath, content: source, message: `content: publish ${c.slug}`, allowUpdate } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if ((channel as any)?.id) await db.from("publications").insert({ channel_id: (channel as any).id, content_id: c.id, status: "failed", payload: { ...payload, error: msg }, published_by: ctx.triggeredBy });
      return { ok: false, error: `Push GitHub échoué: ${msg}` };
    }
    if (!pushRes.ok) {
      if ((channel as any)?.id) await db.from("publications").insert({ channel_id: (channel as any).id, content_id: c.id, status: "failed", payload: { ...payload, error: pushRes.error, conflict: !!pushRes.conflict }, published_by: ctx.triggeredBy });
      return { ok: false, error: pushRes.conflict ? `Slug déjà utilisé sur GitHub (${targetPath}). Changez le slug ou republiez cet article existant.` : (pushRes.error ?? "Push GitHub échoué") };
    }

    const publishedAt = c.published_at ?? new Date().toISOString();
    await db.from("contents").update({ status: "published", published_at: publishedAt }).eq("id", c.id);
    const enriched = { ...payload, commit_url: pushRes.commitUrl, commit_sha: pushRes.commitSha, file_url: pushRes.fileUrl, updated: pushRes.updated };
    if ((channel as any)?.id) await db.from("publications").insert({ channel_id: (channel as any).id, content_id: c.id, status: "success", payload: enriched, external_ref: pushRes.commitSha ?? targetPath, external_url: pushRes.commitUrl ?? null, published_by: ctx.triggeredBy, published_at: publishedAt });
    return { ok: true, externalRef: pushRes.commitSha ?? targetPath, externalUrl: pushRes.commitUrl ?? pushRes.fileUrl ?? `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${REPO_BRANCH}/${targetPath}`, preview: source, payload: enriched };
  },
};

import type { Publisher, PublisherContext, PublisherResult } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { generateArticleSource, tiptapToSections } from "./ts-generator";
import { pushArticleToGithub } from "./github-push.functions";

const REPO_OWNER = "jeitinho";
const REPO_NAME = "rio-uncovered";
const REPO_BRANCH = "main";

type RequiredCheck = { ok: true } | { ok: false; missing: string[] };
function validateRequired(c: {
  slug: string | null;
  title: string | null;
  excerpt: string | null;
  body_json: unknown;
  seo_title: string | null;
  seo_description: string | null;
  tags: string[] | null;
  reading_time_min: number | null;
  author_slug: string | null;
  category_slug: string | null;
}): RequiredCheck {
  const missing: string[] = [];
  if (!c.slug) missing.push("slug");
  if (!c.title) missing.push("titre");
  if (!c.excerpt) missing.push("résumé");
  if (!c.body_json) missing.push("contenu");
  if (!c.seo_title) missing.push("titre SEO");
  if (!c.seo_description) missing.push("meta description");
  if (!c.tags || c.tags.length === 0) missing.push("tags");
  if (c.reading_time_min == null) missing.push("temps de lecture");
  if (!c.author_slug) missing.push("auteur");
  if (!c.category_slug) missing.push("catégorie");
  return missing.length ? { ok: false, missing } : { ok: true };
}

/**
 * GitHub Publisher — génère le fichier TypeScript attendu par le dépôt
 * blog.jeitinho.fr (rio-uncovered). Chaque article devient
 * `src/content/articles/<slug>.ts` exportant un objet `Article`.
 *
 * Le push GitHub effectif sera activé dans une étape ultérieure — pour
 * l'instant ce publisher fonctionne en mode aperçu / dry-run et
 * enregistre le résultat dans la table `publications`.
 */
export const githubPublisher: Publisher = {
  id: "github",
  label: "GitHub (blog.jeitinho.fr)",
  channelSlug: "github-blog",
  supportsContentType: (t) => t === "blog" || t === "guide",
  async publish(ctx: PublisherContext): Promise<PublisherResult> {
    const { data: content, error } = await supabase
      .from("contents")
      .select("id,slug,title,subtitle,excerpt,body_json,tags,published_at,reading_time_min,seo_title,seo_description,language,metadata,author_id,category_id,cover_media_id,type")
      .eq("id", ctx.contentId)
      .single();

    if (error || !content) {
      return { ok: false, error: `Contenu introuvable: ${error?.message ?? ctx.contentId}` };
    }
    if (!content.slug) return { ok: false, error: "Slug manquant." };

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
    const authorSlug = (authorRes.data as { slug?: string } | null)?.slug ?? null;
    const categorySlug = (categoryRes.data as { slug?: string } | null)?.slug ?? null;

    // Field validation (only enforced for a real push; preview stays permissive).
    if (!ctx.dryRun) {
      const check = validateRequired({
        slug: content.slug,
        title: content.title,
        excerpt: content.excerpt,
        body_json: content.body_json,
        seo_title: content.seo_title,
        seo_description: content.seo_description,
        tags: content.tags,
        reading_time_min: content.reading_time_min,
        author_slug: authorSlug,
        category_slug: categorySlug,
      });
      if (!check.ok) {
        return { ok: false, error: `Champs manquants: ${check.missing.join(", ")}` };
      }
    }

    const sections = tiptapToSections(content.body_json);
    const source = generateArticleSource(
      {
        slug: content.slug,
        title: content.title,
        subtitle: content.subtitle,
        excerpt: content.excerpt,
        cover_url: (coverRes.data as { url?: string } | null)?.url ?? meta.cover_url ?? null,
        author_slug: authorSlug,
        category_slug: categorySlug,
        tags: content.tags ?? [],
        published_at: content.published_at,
        reading_time_min: content.reading_time_min,
        seo_title: content.seo_title,
        seo_description: content.seo_description,
        language: content.language ?? "fr",
      },
      content.body_json,
    );

    const targetPath = `src/content/articles/${content.slug}.ts`;
    const importVar = content.slug.replace(/[-.]/g, "_");
    const registryHint = `Ajouter dans src/content/articles/index.ts : import ${importVar} from './${content.slug}';`;

    const payload: Record<string, unknown> = {
      target_path: targetPath,
      source,
      registry_hint: registryHint,
      sections_count: sections.length,
      generated_at: new Date().toISOString(),
      dry_run: ctx.dryRun,
    };

    const { data: channel } = await supabase
      .from("channels")
      .select("id")
      .eq("slug", "github-blog")
      .maybeSingle();

    // DRY RUN — aperçu, aucune écriture GitHub, statut inchangé.
    if (ctx.dryRun) {
      if (channel?.id) {
        await supabase.from("publications").insert({
          channel_id: channel.id,
          content_id: content.id,
          status: "pending",
          payload,
          published_by: ctx.triggeredBy,
          scheduled_at: null,
        });
      }
      return {
        ok: true,
        externalRef: targetPath,
        externalUrl: `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${REPO_BRANCH}/${targetPath}`,
        preview: source,
        payload,
      };
    }

    // REAL PUSH — autorise l'écrasement uniquement si l'article a déjà été publié.
    const allowUpdate = !!content.published_at;
    let pushRes;
    try {
      pushRes = await pushArticleToGithub({
        data: {
          owner: REPO_OWNER,
          repo: REPO_NAME,
          branch: REPO_BRANCH,
          path: targetPath,
          content: source,
          message: `content: publish ${content.slug}`,
          allowUpdate,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (channel?.id) {
        await supabase.from("publications").insert({
          channel_id: channel.id,
          content_id: content.id,
          status: "failed",
          payload: { ...payload, error: msg },
          published_by: ctx.triggeredBy,
        });
      }
      return { ok: false, error: `Push GitHub échoué: ${msg}` };
    }

    if (!pushRes.ok) {
      if (channel?.id) {
        await supabase.from("publications").insert({
          channel_id: channel.id,
          content_id: content.id,
          status: "failed",
          payload: { ...payload, error: pushRes.error, conflict: "conflict" in pushRes ? pushRes.conflict : false },
          published_by: ctx.triggeredBy,
        });
      }
      const conflict = "conflict" in pushRes && pushRes.conflict;
      return {
        ok: false,
        error: conflict
          ? `Slug déjà utilisé sur GitHub (${targetPath}). Changez le slug ou republiez cet article existant.`
          : (pushRes.error ?? "Push GitHub échoué"),
      };
    }

    // Succès — met à jour le contenu et enregistre la publication.
    const publishedAt = content.published_at ?? new Date().toISOString();
    await supabase
      .from("contents")
      .update({ status: "published", published_at: publishedAt })
      .eq("id", content.id);

    const enriched = {
      ...payload,
      commit_url: pushRes.commitUrl,
      commit_sha: pushRes.commitSha,
      file_url: pushRes.fileUrl,
      updated: pushRes.updated,
    };

    if (channel?.id) {
      await supabase.from("publications").insert({
        channel_id: channel.id,
        content_id: content.id,
        status: "published",
        payload: enriched,
        external_ref: pushRes.commitSha ?? targetPath,
        external_url: pushRes.commitUrl ?? null,
        published_by: ctx.triggeredBy,
        published_at: publishedAt,
      });
    }

    return {
      ok: true,
      externalRef: pushRes.commitSha ?? targetPath,
      externalUrl: pushRes.commitUrl ?? pushRes.fileUrl ?? `https://github.com/${REPO_OWNER}/${REPO_NAME}/blob/${REPO_BRANCH}/${targetPath}`,
      preview: source,
      payload: enriched,
    };
  },
};
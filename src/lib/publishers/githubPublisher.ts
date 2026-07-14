import type { Publisher, PublisherContext, PublisherResult } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { generateArticleSource, tiptapToSections } from "./ts-generator";

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
    const sections = tiptapToSections(content.body_json);
    const source = generateArticleSource(
      {
        slug: content.slug,
        title: content.title,
        subtitle: content.subtitle,
        excerpt: content.excerpt,
        cover_url: (coverRes.data as { url?: string } | null)?.url ?? meta.cover_url ?? null,
        author_slug: (authorRes.data as { slug?: string } | null)?.slug ?? null,
        category_slug: (categoryRes.data as { slug?: string } | null)?.slug ?? null,
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

    const payload = {
      target_path: targetPath,
      source,
      registry_hint: registryHint,
      sections_count: sections.length,
      generated_at: new Date().toISOString(),
      dry_run: ctx.dryRun,
    };

    // Trace dans la table `publications` (idempotent — best-effort).
    const { data: channel } = await supabase.from("channels").select("id").eq("slug", "github-blog").maybeSingle();
    if (channel?.id) {
      await supabase.from("publications").insert({
        channel_id: channel.id,
        content_id: content.id,
        status: ctx.dryRun ? "preview" : "queued",
        payload,
        published_by: ctx.triggeredBy,
        scheduled_at: null,
      });
    }

    return {
      ok: true,
      externalRef: targetPath,
      externalUrl: `https://github.com/jeitinho/rio-uncovered/blob/main/${targetPath}`,
      preview: source,
      payload,
    };
  },
};
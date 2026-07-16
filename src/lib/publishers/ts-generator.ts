// Generates the TypeScript article file expected by the blog.jeitinho.fr
// repo (rio-uncovered). Converts a Tiptap doc JSON into the `sections:
// Section[]` shape used by the existing blog architecture. See:
//   src/content/articles/<slug>.ts in the rio-uncovered repo.

type TiptapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
};

export type ArticleMeta = {
  slug: string;
  title: string;
  subtitle?: string | null;
  excerpt?: string | null;
  cover_url?: string | null;
  author_slug?: string | null;
  category_slug?: string | null;
  tags?: string[];
  published_at?: string | null;
  reading_time_min?: number | null;
  seo_title?: string | null;
  seo_description?: string | null;
  language?: string;
  published?: boolean;
};

function inlineText(node: TiptapNode): string {
  if (node.type === "text") {
    let t = node.text ?? "";
    for (const m of node.marks ?? []) {
      if (m.type === "bold") t = `**${t}**`;
      else if (m.type === "italic") t = `*${t}*`;
      else if (m.type === "code") t = `\`${t}\``;
      else if (m.type === "link") t = `[${t}](${(m.attrs?.href as string) ?? ""})`;
    }
    return t;
  }
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineText).join("");
}
function paragraphText(node: TiptapNode): string {
  return (node.content ?? []).map(inlineText).join("");
}
function listItems(node: TiptapNode): string[] {
  return (node.content ?? [])
    .map((li) => (li.content ?? []).map(paragraphText).join(" ").trim())
    .filter(Boolean);
}

export type Section =
  | { type: "p"; text: string }
  | { type: "h2" | "h3"; text: string }
  | { type: "ul" | "ol"; items: string[] }
  | { type: "quote"; text: string }
  | { type: "conseil" | "aeviter" | "bonasavoir"; text: string }
  | { type: "image"; src: string; alt?: string; caption?: string }
  | { type: "gallery"; images: { src: string; alt?: string; caption?: string }[] }
  | { type: "faq"; items: { q: string; a: string }[] }
  | { type: "button"; label: string; href: string; variant?: string }
  | { type: "video"; src: string; provider: string }
  | { type: "table"; rows: string[][] };

export function tiptapToSections(doc: unknown): Section[] {
  const root = (doc ?? { content: [] }) as TiptapNode;
  const nodes = root.content ?? [];
  const out: Section[] = [];
  let pendingFaq: { q: string; a: string }[] = [];
  const flushFaq = () => {
    if (pendingFaq.length) {
      out.push({ type: "faq", items: pendingFaq });
      pendingFaq = [];
    }
  };
  for (const n of nodes) {
    if (n.type === "faqItem") {
      const q = paragraphText(n.content?.[0] ?? { type: "faqQuestion" });
      const a = (n.content?.[1]?.content ?? []).map(paragraphText).join("\n\n");
      pendingFaq.push({ q, a });
      continue;
    }
    flushFaq();
    if (n.type === "heading") {
      const level = (n.attrs?.level as number) ?? 2;
      out.push({ type: level === 3 ? "h3" : "h2", text: paragraphText(n) });
    } else if (n.type === "paragraph") {
      const t = paragraphText(n);
      if (t.trim()) out.push({ type: "p", text: t });
    } else if (n.type === "bulletList") {
      out.push({ type: "ul", items: listItems(n) });
    } else if (n.type === "orderedList") {
      out.push({ type: "ol", items: listItems(n) });
    } else if (n.type === "blockquote") {
      out.push({ type: "quote", text: (n.content ?? []).map(paragraphText).join("\n") });
    } else if (n.type === "callout") {
      const variant = ((n.attrs?.variant as string) ?? "conseil") as "conseil" | "aeviter" | "bonasavoir";
      out.push({ type: variant, text: (n.content ?? []).map(paragraphText).join("\n") });
    } else if (n.type === "image") {
      out.push({ type: "image", src: (n.attrs?.src as string) ?? "", alt: (n.attrs?.alt as string) ?? undefined });
    } else if (n.type === "gallery") {
      const images = ((n.attrs?.images as { url: string; alt?: string; caption?: string }[]) ?? []).map((i) => ({
        src: i.url, alt: i.alt, caption: i.caption,
      }));
      out.push({ type: "gallery", images });
    } else if (n.type === "buttonBlock") {
      out.push({
        type: "button",
        label: (n.attrs?.label as string) ?? "",
        href: (n.attrs?.href as string) ?? "",
        variant: (n.attrs?.variant as string) ?? "primary",
      });
    } else if (n.type === "videoEmbed") {
      out.push({
        type: "video",
        src: (n.attrs?.src as string) ?? "",
        provider: (n.attrs?.provider as string) ?? "youtube",
      });
    } else if (n.type === "table") {
      const rows: string[][] = [];
      for (const tr of n.content ?? []) {
        const row: string[] = [];
        for (const cell of tr.content ?? []) row.push((cell.content ?? []).map(paragraphText).join(" "));
        rows.push(row);
      }
      out.push({ type: "table", rows });
    }
  }
  flushFaq();
  return out;
}

export function sectionsToSource(meta: ArticleMeta, sections: Section[]): string {
  const j = (v: unknown) => JSON.stringify(v, null, 2);
  const published = meta.published !== false;
  return `// AUTO-GENERATED by JEITINHO Platform — do not edit by hand.
// Slug: ${meta.slug}
import type { Article } from "../types";

export const article: Article = {
  slug: ${j(meta.slug)},
  title: ${j(meta.title)},
  subtitle: ${j(meta.subtitle ?? null)},
  excerpt: ${j(meta.excerpt ?? null)},
  cover_url: ${j(meta.cover_url ?? null)},
  author_slug: ${j(meta.author_slug ?? null)},
  category_slug: ${j(meta.category_slug ?? null)},
  tags: ${j(meta.tags ?? [])},
  published_at: ${j(meta.published_at ?? null)},
  reading_time_min: ${j(meta.reading_time_min ?? null)},
  seo_title: ${j(meta.seo_title ?? null)},
  seo_description: ${j(meta.seo_description ?? null)},
  language: ${j(meta.language ?? "fr")},
  sections: ${j(sections)},
};

// "published" is a JEITINHO Platform flag used to archive an article
// without removing its file from the repo. Consumers that don't know
// about this field can safely ignore it.
(article as unknown as { published: boolean }).published = ${JSON.stringify(published)};

export default article;
`;
}

export function generateArticleSource(meta: ArticleMeta, tiptapDoc: unknown): string {
  return sectionsToSource(meta, tiptapToSections(tiptapDoc));
}
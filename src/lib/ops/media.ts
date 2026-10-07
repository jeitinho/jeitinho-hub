import { supabase } from "@/integrations/supabase/client";
import { fetchBlogFeedViaServer } from "@/lib/ops/media-feed.functions";

/*
 * Données du module « Média » : planning éditorial (editorial_items) et
 * articles en ligne de blog.jeitinho.fr (flux RSS).
 * Lectures/écritures via RLS (can_edit_content).
 */

// Tables récentes : typage souple, les types générés restent la référence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

export const TZ = "America/Sao_Paulo";
export const BLOG_URL = "https://blog.jeitinho.fr";

/* ---------- Planning éditorial ---------- */

export type EditorialItem = {
  id: string;
  planned_at: string | null;
  deadline: string | null;
  kind: string;
  collection: string | null;
  title: string;
  owner: string | null;
  priority: string | null;
  status: string;
  channel: string | null;
  url: string | null;
  notes: string | null;
  external_ref: string | null;
  created_at: string;
  updated_at: string;
};

export type EditorialInput = Partial<Omit<EditorialItem, "created_at" | "updated_at">> & {
  title: string;
};

export const EDITORIAL_STATUSES = [
  { value: "idee", label: "Idée", tone: "bg-muted text-muted-foreground" },
  { value: "planifie", label: "Planifié", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  {
    value: "en_production",
    label: "En production",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    value: "a_relire",
    label: "À relire",
    tone: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  },
  {
    value: "publie",
    label: "Publié",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  { value: "abandonne", label: "Abandonné", tone: "bg-muted text-muted-foreground line-through" },
] as const;

/** Statuts terminés : pas de retard possible, pas d'étape suivante. */
export const DONE_STATUSES = ["publie", "abandonne"];

export function statusMeta(status: string) {
  return (
    EDITORIAL_STATUSES.find((s) => s.value === status) ?? {
      value: status,
      label: status,
      tone: "bg-muted text-muted-foreground",
    }
  );
}

/** Étape suivante du flux idée → planifié → production → relecture → publié. */
export function nextStatus(status: string): string | null {
  const flow = ["idee", "planifie", "en_production", "a_relire", "publie"];
  const i = flow.indexOf(status);
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

export const EDITORIAL_KINDS: Record<string, string> = {
  article: "Article",
  reportage: "Reportage",
  newsletter: "Newsletter",
  partenaire: "Partenaire",
  reseaux: "Réseaux sociaux",
};

export const EDITORIAL_PRIORITIES = ["Haute", "Moyenne", "Basse"] as const;
export const EDITORIAL_OWNERS = ["Rafael", "Lili", "Vidéaste"] as const;

export const PRIORITY_TONE: Record<string, string> = {
  Haute: "border-destructive/40 text-destructive",
  Moyenne: "border-amber-500/40 text-amber-700 dark:text-amber-300",
  Basse: "border-border text-muted-foreground",
};

const EDITORIAL_COLUMNS =
  "id,planned_at,deadline,kind,collection,title,owner,priority,status,channel,url,notes,external_ref,created_at,updated_at";

export async function fetchEditorialItems(): Promise<EditorialItem[]> {
  return check(
    await db
      .from("editorial_items")
      .select(EDITORIAL_COLUMNS)
      .order("planned_at", { ascending: true, nullsFirst: false }),
  );
}

export async function saveEditorialItem(row: EditorialInput): Promise<EditorialItem> {
  const { id, ...rest } = row;
  const q = id
    ? db.from("editorial_items").update(rest).eq("id", id)
    : db.from("editorial_items").insert(rest);
  return check(await q.select(EDITORIAL_COLUMNS).single());
}

export async function setEditorialStatus(id: string, status: string) {
  check(await db.from("editorial_items").update({ status }).eq("id", id));
}

export async function linkEditorialToArticle(id: string, url: string) {
  check(await db.from("editorial_items").update({ url, status: "publie" }).eq("id", id));
}

export async function deleteEditorialItem(id: string) {
  check(await db.from("editorial_items").delete().eq("id", id));
}

/* ---------- Dates (fuseau Rio, UTC-3 fixe depuis 2019) ---------- */

const dayFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Clé de jour « YYYY-MM-DD » à Rio. */
export function dayKey(d: Date | string): string {
  return dayFmt.format(typeof d === "string" ? new Date(d) : d);
}

export function todayKey() {
  return dayKey(new Date());
}

export function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Lundi de la semaine contenant `key`. */
export function mondayKey(key: string): string {
  const dow = (new Date(`${key}T12:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(key, -dow);
}

export function fmtDayKey(key: string, opts: Intl.DateTimeFormatOptions) {
  return new Date(`${key}T12:00:00Z`).toLocaleDateString("fr-FR", { ...opts, timeZone: "UTC" });
}

/** Heure locale Rio « HH:MM » d'un timestamp. */
export function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/** Valeur pour <input type="datetime-local"> (heure de Rio). */
export function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 3 * 3_600_000);
  return d.toISOString().slice(0, 16);
}

export function fromLocalInput(v: string): string | null {
  return v ? new Date(`${v}:00-03:00`).toISOString() : null;
}

export function isOverdue(item: Pick<EditorialItem, "deadline" | "status">, today = todayKey()) {
  return !!item.deadline && item.deadline < today && !DONE_STATUSES.includes(item.status);
}

/* ---------- Articles en ligne (RSS blog.jeitinho.fr) ---------- */

export type BlogArticle = {
  title: string;
  link: string;
  pubDate: string | null;
  categories: string[];
  description: string;
};

export type BlogFeed = { source: string; articles: BlogArticle[] };

export class FeedUnavailableError extends Error {
  constructor(detail: string) {
    super(detail);
    this.name = "FeedUnavailableError";
  }
}

export const FEED_PATHS = ["/rss.xml", "/feed.xml", "/rss"];

function textOf(el: Element, tag: string) {
  return el.getElementsByTagName(tag)[0]?.textContent?.trim() ?? "";
}

function stripHtml(s: string) {
  if (!s.includes("<")) return s;
  return new DOMParser().parseFromString(s, "text/html").body.textContent?.trim() ?? s;
}

/** Parse un flux RSS 2.0 (ou Atom) ; les liens relatifs sont résolus sur le blog. */
export function parseFeed(xml: string, base = BLOG_URL): BlogArticle[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("XML illisible");
  const nodes = Array.from(doc.getElementsByTagName("item"));
  const entries = nodes.length ? nodes : Array.from(doc.getElementsByTagName("entry"));
  const root = doc.documentElement?.nodeName.toLowerCase();
  if (!entries.length && root !== "rss" && root !== "feed" && root !== "rdf:rdf") {
    throw new Error("ce n'est pas un flux RSS");
  }
  return entries
    .map((el) => {
      const rawLink =
        textOf(el, "link") || el.getElementsByTagName("link")[0]?.getAttribute("href") || "";
      let link = rawLink;
      try {
        link = new URL(rawLink, base).toString();
      } catch {
        /* lien laissé tel quel */
      }
      const date = textOf(el, "pubDate") || textOf(el, "published") || textOf(el, "updated");
      const parsed = date ? new Date(date) : null;
      return {
        title: stripHtml(textOf(el, "title")),
        link,
        pubDate: parsed && !Number.isNaN(parsed.getTime()) ? parsed.toISOString() : null,
        categories: Array.from(el.getElementsByTagName("category"))
          .map((c) => c.textContent?.trim() || c.getAttribute("term") || "")
          .filter(Boolean),
        description: stripHtml(textOf(el, "description") || textOf(el, "summary")),
      };
    })
    .filter((a) => a.title)
    .sort((a, b) => (b.pubDate ?? "").localeCompare(a.pubDate ?? ""));
}

/**
 * Récupère le flux du blog. D'abord depuis le navigateur (rss.xml → feed.xml → rss) ;
 * si tout échoue (CORS le plus souvent), repli sur le relais serveur du manager.
 */
export async function fetchBlogFeed(): Promise<BlogFeed> {
  const errors: string[] = [];
  for (const path of FEED_PATHS) {
    const url = `${BLOG_URL}${path}`;
    try {
      // Requête « simple » (sans en-tête) pour éviter un preflight CORS.
      const res = await fetch(url);
      if (!res.ok) {
        errors.push(`${path} ${res.status}`);
        continue;
      }
      return { source: url, articles: parseFeed(await res.text()) };
    } catch (e) {
      errors.push(
        `${path} ${e instanceof TypeError ? "bloqué (CORS/réseau)" : (e as Error).message}`,
      );
    }
  }
  try {
    const relay = await fetchBlogFeedViaServer();
    if (relay.ok) return { source: relay.url, articles: parseFeed(relay.xml) };
    errors.push(`relais : ${relay.error}`);
  } catch (e) {
    errors.push(`relais : ${(e as Error).message}`);
  }
  throw new FeedUnavailableError(errors.join(" · "));
}

/** Normalise une URL d'article pour comparer planning ↔ RSS. */
export function normalizeUrl(u: string | null | undefined): string {
  if (!u) return "";
  try {
    const url = new URL(u, BLOG_URL);
    return `${url.hostname.replace(/^www\./, "")}${url.pathname.replace(/\/+$/, "")}`.toLowerCase();
  } catch {
    return u.trim().toLowerCase().replace(/\/+$/, "");
  }
}

export function fmtPubDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TZ,
  });
}

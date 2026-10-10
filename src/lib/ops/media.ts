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

/** Un seul flux partout : idée → en production → prêt à poster → publié (+ abandonné). */
export const EDITORIAL_STATUSES = [
  { value: "idee", label: "Idée", tone: "bg-muted text-muted-foreground" },
  {
    value: "en_production",
    label: "En production",
    tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    value: "planifie",
    label: "Prêt à poster",
    tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
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

/** Anciens statuts encore présents en base, affichés dans le flux actuel. */
export function normalizeStatus(status: string): string {
  return status === "a_relire" ? "en_production" : status;
}

export function statusMeta(status: string) {
  const s = normalizeStatus(status);
  return (
    EDITORIAL_STATUSES.find((x) => x.value === s) ?? {
      value: s,
      label: s,
      tone: "bg-muted text-muted-foreground",
    }
  );
}

/**
 * Étape suivante : idée → en production → prêt à poster → publié.
 * Même ordre que nextStep (accueil média), qui saute directement à « prêt ».
 */
export function nextStatus(status: string): string | null {
  const flow = ["idee", "en_production", "planifie", "publie"];
  const i = flow.indexOf(normalizeStatus(status));
  return i >= 0 && i < flow.length - 1 ? flow[i + 1] : null;
}

export const EDITORIAL_KINDS: Record<string, string> = {
  story: "Story",
  post: "Post",
  carrousel: "Carrousel",
  reel: "Reel",
  article: "Article",
  reportage: "Reportage",
  newsletter: "Newsletter",
  partenaire: "Partenaire",
  reseaux: "Réseaux sociaux",
};

/** Comptes / canaux de publication (liste fermée). */
export const EDITORIAL_CHANNELS: { value: string; label: string; short: string }[] = [
  { value: "ig_afrolove", label: "AFRO LOVE · @afrolove.brasil", short: "@afrolove.brasil" },
  {
    value: "ig_conciergerie",
    label: "Conciergerie · @jeitinho.conciergerie",
    short: "@jeitinho.conciergerie",
  },
  { value: "ig_media", label: "Média · @jeitinho.fr + TikTok", short: "@jeitinho.fr" },
  { value: "blog", label: "Blog", short: "Blog" },
  { value: "whatsapp", label: "WhatsApp", short: "WhatsApp" },
];

export function channelName(channel: string | null | undefined, short = false): string {
  if (!channel) return "";
  const c = EDITORIAL_CHANNELS.find((x) => x.value === channel);
  return c ? (short ? c.short : c.label) : channel;
}

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

/**
 * Mise à jour contrôlée : erreur Supabase OU aucune ligne modifiée (droits, id
 * inconnu) = échec explicite, jamais un faux succès.
 */
async function updateChecked(table: string, id: string, patch: Record<string, unknown>) {
  const { data, error } = await db.from(table).update(patch).eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data || data.length === 0)
    throw new Error("Rien n'a été modifié (contenu introuvable ou droits insuffisants).");
}

export async function setEditorialStatus(id: string, status: string) {
  await updateChecked("editorial_items", id, { status });
}

export async function rescheduleEditorial(id: string, plannedAt: string) {
  await updateChecked("editorial_items", id, { planned_at: plannedAt });
}

/** Groupe WhatsApp : posté (avec l'heure), annulé ou reporté. */
export async function setWhatsappPostStatus(id: string, status: "envoye" | "annule") {
  const patch: Record<string, unknown> = { status };
  if (status === "envoye") patch.sent_at = new Date().toISOString();
  await updateChecked("whatsapp_posts", id, patch);
}

export async function rescheduleWhatsapp(id: string, scheduledAt: string) {
  await updateChecked("whatsapp_posts", id, { scheduled_at: scheduledAt });
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

/**
 * En retard : pas terminé ET (deadline dépassée OU publication prévue déjà passée).
 */
export function isOverdue(
  item: Pick<EditorialItem, "deadline" | "status"> & { planned_at?: string | null },
  today = todayKey(),
  now = new Date(),
) {
  if (DONE_STATUSES.includes(item.status)) return false;
  if (item.deadline && item.deadline < today) return true;
  return !!item.planned_at && new Date(item.planned_at).getTime() < now.getTime();
}

/** Date à afficher dans le badge « En retard ». */
export function overdueSince(
  item: Pick<EditorialItem, "deadline"> & { planned_at?: string | null },
  today = todayKey(),
): string | null {
  if (item.deadline && item.deadline < today) return item.deadline;
  return item.planned_at ? dayKey(item.planned_at) : item.deadline;
}

const CAPTION_START = /^\s*L[ÉE]GENDES?\b[^:\n]*:\s*(.*)$/i;
const CAPTION_STOP =
  /^\s*(PROMPT|Collab\b|Source\b|NOTES\b|PROCESS\b|FORMAT\b|DÉJÀ PRODUIT|À faire\b|Article\s*:|Slide\s*\d|CARROUSEL\b|— —|---)/i;

/**
 * Extrait la ou les légendes des notes (bloc après « LÉGENDE : » jusqu'au
 * prochain repère : PROMPT, Collab, Source…). Null si aucune légende repérée.
 */
export function extractCaption(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const lines = notes.split(/\r?\n/);
  const blocks: string[] = [];
  let cur: string[] | null = null;
  const flush = () => {
    if (cur) {
      const t = cur.join("\n").trim();
      if (t) blocks.push(t);
    }
    cur = null;
  };
  for (const line of lines) {
    const m = line.match(CAPTION_START);
    if (m) {
      flush();
      cur = m[1] ? [m[1]] : [];
      continue;
    }
    if (!cur) continue;
    if (CAPTION_STOP.test(line)) {
      flush();
      continue;
    }
    cur.push(line);
  }
  flush();
  return blocks.length ? blocks.join("\n\n") : null;
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

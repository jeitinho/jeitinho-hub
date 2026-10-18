import { supabase } from "@/integrations/supabase/client";

/*
 * Espace community manager (rôle community_manager).
 * Tout passe par la RLS et des vues filtrées côté base :
 *  - editorial_items : seulement les comptes des pôles ouverts (cm_channels) ;
 *  - cm_events / cm_event_sales_daily / cm_event_tracking : infos soirée, billets vendus
 *    (nombres, jamais de montants) et ventes par lien relais ;
 *  - ig_media : stats Instagram des comptes ouverts ;
 *  - cm_agent_notes : derniers comptes rendus de l'agent AFRO LOVE ;
 *  - team_requests : ses demandes à Rafael (création via ask_rafael).
 */

// Vues et tables récentes : typage souple, les types générés restent la référence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

export const TZ = "America/Sao_Paulo";

/** Comptes (canaux) ouverts à la personne connectée. */
export async function fetchMyChannels(userId: string): Promise<string[]> {
  const res = await db.rpc("cm_channels", { _user_id: userId });
  return (check(res) as string[] | null) ?? [];
}

export type CmEvent = {
  id: string;
  name: string;
  edition: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue: string | null;
  neighborhood: string | null;
  capacity: number | null;
  presale_target: number | null;
  door_price: number | null;
  currency: string | null;
  status: string | null;
};

/** Soirées à venir (et celle d'hier soir, pour l'après-soirée). */
export async function fetchCmEvents(): Promise<CmEvent[]> {
  const since = new Date(Date.now() - 2 * 86_400_000).toISOString();
  return check(
    await db
      .from("cm_events")
      .select("*")
      .gte("starts_at", since)
      .order("starts_at", { ascending: true }),
  ) as CmEvent[];
}

export type SalesDay = { event_id: string; channel: string; day: string; tickets: number };

export async function fetchCmSales(eventId: string): Promise<SalesDay[]> {
  return check(
    await db
      .from("cm_event_sales_daily")
      .select("*")
      .eq("event_id", eventId)
      .order("day", { ascending: true }),
  ) as SalesDay[];
}

export type TrackingRow = {
  event_id: string;
  label: string;
  utm_source: string;
  url: string;
  tickets: number;
  last_sale: string | null;
};

export async function fetchCmTracking(eventId: string): Promise<TrackingRow[]> {
  const rows = check(
    await db.from("cm_event_tracking").select("*").eq("event_id", eventId),
  ) as TrackingRow[];
  return rows
    .map((r) => ({ ...r, tickets: Number(r.tickets) || 0 }))
    .sort((a, b) => b.tickets - a.tickets || a.label.localeCompare(b.label, "fr"));
}

/** Résumé des ventes : total, 7 derniers jours, par canal. */
export function summarizeSales(rows: SalesDay[], now = new Date()) {
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10);
  const byChannel: Record<string, number> = {};
  let total = 0;
  let week = 0;
  for (const r of rows) {
    total += r.tickets;
    if (r.day >= weekAgo) week += r.tickets;
    byChannel[r.channel] = (byChannel[r.channel] ?? 0) + r.tickets;
  }
  return { total, week, byChannel };
}

export type IgPost = {
  id: string;
  channel: string;
  kind: string | null;
  media_type: string | null;
  caption: string | null;
  permalink: string | null;
  posted_at: string;
  like_count: number | null;
  comments_count: number | null;
};

/** Publications Instagram des 30 derniers jours sur les comptes ouverts. */
export async function fetchCmIgPosts(): Promise<IgPost[]> {
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  return check(
    await db
      .from("ig_media")
      .select("id,channel,kind,media_type,caption,permalink,posted_at,like_count,comments_count")
      .gte("posted_at", since)
      .order("posted_at", { ascending: false })
      .limit(60),
  ) as IgPost[];
}

/** Engagement = likes + commentaires (les stories n'en ont pas). */
export function engagement(p: Pick<IgPost, "like_count" | "comments_count">) {
  return (p.like_count ?? 0) + (p.comments_count ?? 0);
}

export type AgentNote = { id: string; agent: string; summary: string | null; created_at: string };

export async function fetchCmAgentNotes(): Promise<AgentNote[]> {
  return check(
    await db
      .from("cm_agent_notes")
      .select("*")
      .not("summary", "is", null)
      .order("created_at", { ascending: false })
      .limit(5),
  ) as AgentNote[];
}

/* ---------- Demandes à Rafael ---------- */

export type TeamRequest = {
  id: string;
  requested_by: string;
  requester_name: string | null;
  pole: string | null;
  event_id: string | null;
  subject: string;
  details: string | null;
  needed_by: string | null;
  status: "ouverte" | "en_cours" | "faite" | "refusee";
  answer: string | null;
  handled_at: string | null;
  created_at: string;
};

export const REQUEST_STATUS: Record<TeamRequest["status"], { label: string; tone: string }> = {
  ouverte: { label: "Envoyée", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  en_cours: { label: "En cours", tone: "bg-amber-500/15 text-amber-700 dark:text-amber-300" },
  faite: { label: "Faite", tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" },
  refusee: { label: "Répondue", tone: "bg-muted text-muted-foreground" },
};

/** RLS : la personne voit ses demandes, les gestionnaires voient tout. */
export async function fetchTeamRequests(): Promise<TeamRequest[]> {
  return check(
    await db.from("team_requests").select("*").order("created_at", { ascending: false }).limit(100),
  ) as TeamRequest[];
}

export async function askRafael(input: {
  subject: string;
  details?: string;
  eventId?: string | null;
  neededBy?: string | null;
}): Promise<string> {
  const res = await db.rpc("ask_rafael", {
    p_subject: input.subject,
    p_details: input.details || null,
    p_event_id: input.eventId || null,
    p_needed_by: input.neededBy || null,
  });
  return check(res) as string;
}

/** Réponse de Rafael : « faite » ou « refusee » prévient la personne sur WhatsApp (trigger). */
export async function answerRequest(
  id: string,
  patch: { status: TeamRequest["status"]; answer?: string | null },
) {
  check(
    await db
      .from("team_requests")
      .update({ status: patch.status, answer: patch.answer ?? null })
      .eq("id", id),
  );
}

/* ---------- Médiathèque ---------- */

export type MediaItem = {
  id: string;
  file_name: string;
  storage_path: string | null;
  url: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  kind: string | null;
  caption: string | null;
  tags: string[] | null;
  drive_url: string | null;
  uploaded_by: string | null;
  created_at: string;
};

export const MEDIA_BUCKET = "mediatheque";
export const MEDIA_MAX_BYTES = 50 * 1024 * 1024;

export async function fetchMedia(): Promise<MediaItem[]> {
  return check(
    await db
      .from("media")
      .select(
        "id,file_name,storage_path,url,mime_type,size_bytes,kind,caption,tags,drive_url,uploaded_by,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(300),
  ) as MediaItem[];
}

export function mediaKind(mime: string | null | undefined): string {
  if (!mime) return "document";
  if (mime.startsWith("image/")) return "photo";
  if (mime.startsWith("video/")) return "video";
  return "document";
}

/** Nom de fichier sûr pour le stockage (accents, espaces). */
export function safeFileName(name: string): string {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 60);
  const ext =
    dot > 0
      ? name
          .slice(dot + 1)
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "")
      : "";
  return `${base || "fichier"}${ext ? `.${ext}` : ""}`;
}

export function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[,#]/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export async function uploadMedia(
  userId: string,
  file: File,
  meta: { caption?: string; tags?: string[] },
): Promise<MediaItem> {
  if (file.size > MEDIA_MAX_BYTES)
    throw new Error(
      "Fichier trop lourd (50 Mo max). Pour une vidéo longue, ajoute plutôt le lien Drive.",
    );
  const path = `${userId}/${Date.now()}-${safeFileName(file.name)}`;
  const up = await db.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type || undefined });
  if (up.error) throw new Error(up.error.message);
  const url = db.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl as string;
  const row = check(
    await db
      .from("media")
      .insert({
        file_name: file.name,
        storage_path: path,
        url,
        mime_type: file.type || null,
        size_bytes: file.size,
        kind: mediaKind(file.type),
        caption: meta.caption || null,
        tags: meta.tags?.length ? meta.tags : null,
        uploaded_by: userId,
      })
      .select()
      .single(),
  ) as MediaItem;
  return row;
}

/** Lien Drive (vidéos lourdes) enregistré sans fichier. */
export async function addDriveLink(
  userId: string,
  input: { name: string; driveUrl: string; caption?: string; tags?: string[] },
): Promise<MediaItem> {
  if (!/^https:\/\//.test(input.driveUrl)) throw new Error("Lien invalide.");
  return check(
    await db
      .from("media")
      .insert({
        file_name: input.name,
        drive_url: input.driveUrl,
        kind: "video",
        caption: input.caption || null,
        tags: input.tags?.length ? input.tags : null,
        uploaded_by: userId,
      })
      .select()
      .single(),
  ) as MediaItem;
}

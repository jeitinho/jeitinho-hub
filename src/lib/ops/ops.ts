import { supabase } from "@/integrations/supabase/client";

/*
 * Données des modules « opérations » : file À valider, journal des agents,
 * événements, groupe WhatsApp, ventes du Manuel, distribution OTA, partenaires.
 * Toutes les lectures/écritures passent par RLS (can_manage).
 */

// Tables récentes : typage souple, les types générés restent la référence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

/* ---------- File « À valider » (crm_tasks) ---------- */

export type ValidationTask = {
  id: string;
  kind: string;
  channel: string;
  status: string;
  stage: number | null;
  title: string;
  message_draft: string | null;
  due_at: string;
  created_at: string;
  quote_id: string | null;
  lead_id: string | null;
  prospect_id: string | null;
};

export const TASK_KIND_LABELS: Record<string, string> = {
  reponse_lead: "Réponse à un lead",
  relance_devis: "Relance de devis",
  relance_revendeur: "Revendeur Réveillon",
  partenaire_afrolove: "Relais AFRO LOVE",
  upsell_manuel: "Suivi acheteur Manuel",
};

export async function fetchValidationQueue(): Promise<ValidationTask[]> {
  return check(
    await db
      .from("crm_tasks")
      .select(
        "id,kind,channel,status,stage,title,message_draft,due_at,created_at,quote_id,lead_id,prospect_id",
      )
      .in("status", ["a_valider", "valide"])
      .order("due_at"),
  );
}

export async function setTaskStatus(id: string, status: "envoye" | "annule") {
  check(
    await db
      .from("crm_tasks")
      .update({ status, handled_at: new Date().toISOString() })
      .eq("id", id),
  );
}

export async function updateTaskDraft(id: string, message_draft: string) {
  check(await db.from("crm_tasks").update({ message_draft }).eq("id", id));
}

/* ---------- Journal des agents ---------- */

export type AgentRun = {
  id: string;
  agent: string;
  status: "ok" | "partiel" | "erreur";
  summary: string | null;
  report: string | null;
  started_at: string;
};

export type AgentDefinition = { key: string; name: string; schedule: string; output: string };

// Doit rester aligné avec les tâches planifiées Cowork (champ `agent` écrit dans agent_runs).
export const AGENTS: AgentDefinition[] = [
  {
    key: "boite-mail",
    name: "Boîte mail & admin",
    schedule: "Tous les jours 9h47",
    output: "Libellés Gmail, brouillons, récap finances le lundi",
  },
  {
    key: "chef-de-cabinet",
    name: "Chef de cabinet",
    schedule: "Tous les jours 10h23",
    output: "Brief du matin (mail + notification)",
  },
  {
    key: "leads-devis",
    name: "Leads & devis",
    schedule: "Toutes les 2 h, 10h07 → 22h07",
    output: "Leads + réponses à valider",
  },
  {
    key: "afrolove-pilotage",
    name: "AFRO LOVE — pilotage",
    schedule: "Tous les jours 11h13 (octobre)",
    output: "J-x, billets, contenus, checklist, bilan",
  },
  {
    key: "afrolove-partenaires",
    name: "AFRO LOVE — relais",
    schedule: "Lundi et jeudi 12h28 (jusqu'au 27/10)",
    output: "10 relais + pitchs à valider",
  },
  {
    key: "getyourguide",
    name: "GetYourGuide",
    schedule: "Lundi et jeudi 10h52",
    output: "Statuts des fiches, fiches prêtes à coller",
  },
  {
    key: "revendeurs-reveillon",
    name: "Revendeurs Réveillon",
    schedule: "Mardi et vendredi 11h37",
    output: "Relances revendeurs à valider",
  },
  {
    key: "studio-contenu",
    name: "Studio contenu",
    schedule: "Dimanche 18h41",
    output: "21 posts WhatsApp, carrousels, LinkedIn, Threads",
  },
  {
    key: "ventes-manuel",
    name: "Ventes Manuel",
    schedule: "Lundi 9h22",
    output: "Rapport ventes, suivis acheteurs",
  },
];

export async function fetchAgentRuns(limit = 200): Promise<AgentRun[]> {
  return check(
    await db
      .from("agent_runs")
      .select("id,agent,status,summary,report,started_at")
      .order("started_at", { ascending: false })
      .limit(limit),
  );
}

/* ---------- Événements ---------- */

export type EventRow = {
  id: string;
  name: string;
  edition: string | null;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  neighborhood: string | null;
  capacity: number | null;
  presale_target: number | null;
  door_price: number | null;
  currency: string;
  partner_ticket_commission: number;
  partner_vip_commission_pct: number;
  venue_share_pct: number;
  cofounder_share_pct: number;
  status: "planifie" | "en_vente" | "termine" | "annule";
  notes: string | null;
};

export type TicketCount = {
  id: string;
  event_id: string;
  channel: "sympla" | "shotgun" | "porte" | "invitation" | "autre";
  tickets: number;
  revenue: number | null;
  vip_tables: number;
  vip_revenue: number | null;
  note: string | null;
  recorded_at: string;
};

export type PartnerSale = {
  id: string;
  event_id: string;
  partner_id: string | null;
  partner_name: string;
  tickets: number;
  vip_revenue: number;
  paid: boolean;
  note: string | null;
};

export type Settlement = {
  event_id: string;
  ticket_revenue: number;
  vip_revenue: number;
  bar_revenue: number;
  drinks_cost: number;
  house_costs: number;
  other_costs: number;
  notes: string | null;
};

export const TICKET_CHANNELS: TicketCount["channel"][] = [
  "sympla",
  "shotgun",
  "porte",
  "invitation",
  "autre",
];

export async function fetchEvents(): Promise<EventRow[]> {
  return check(await db.from("events").select("*").order("starts_at", { ascending: false }));
}

export async function saveEvent(row: Partial<EventRow> & { name: string; starts_at: string }) {
  const { id, ...rest } = row;
  if (id) return check(await db.from("events").update(rest).eq("id", id));
  return check(await db.from("events").insert(rest));
}

export async function fetchEventDetail(eventId: string) {
  const [counts, partners, settlement] = await Promise.all([
    db
      .from("event_ticket_counts")
      .select("*")
      .eq("event_id", eventId)
      .order("recorded_at", { ascending: false }),
    db
      .from("event_partner_sales")
      .select("*")
      .eq("event_id", eventId)
      .order("tickets", { ascending: false }),
    db.from("event_settlements").select("*").eq("event_id", eventId).maybeSingle(),
  ]);
  return {
    counts: check<TicketCount[]>(counts),
    partners: check<PartnerSale[]>(partners),
    settlement: (settlement.error ? null : settlement.data) as Settlement | null,
  };
}

export async function addTicketCount(row: Omit<TicketCount, "id" | "recorded_at">) {
  check(await db.from("event_ticket_counts").insert(row));
}

export async function upsertPartnerSale(row: Omit<PartnerSale, "id"> & { id?: string }) {
  check(await db.from("event_partner_sales").upsert(row, { onConflict: "event_id,partner_name" }));
}

export async function saveSettlement(row: Settlement) {
  check(await db.from("event_settlements").upsert(row, { onConflict: "event_id" }));
}

/** Dernier relevé de chaque canal (les relevés sont cumulés). */
export function latestByChannel(counts: TicketCount[]) {
  const latest = new Map<string, TicketCount>();
  for (const c of counts) if (!latest.has(c.channel)) latest.set(c.channel, c);
  return latest;
}

/**
 * Partage AFRO LOVE : bénéfice = entrées + tables VIP + (bar − coût boissons) − custos da casa − autres frais
 * − commissions relais ; puis part du lieu (venue_share_pct) et partage de la part équipe entre co-fondateurs.
 */
export function computeSplit(event: EventRow, s: Settlement, partners: PartnerSale[]) {
  const commissions = partners.reduce(
    (sum, p) =>
      sum +
      p.tickets * Number(event.partner_ticket_commission) +
      (p.vip_revenue * Number(event.partner_vip_commission_pct)) / 100,
    0,
  );
  const barMargin = Number(s.bar_revenue) - Number(s.drinks_cost);
  const gross = Number(s.ticket_revenue) + Number(s.vip_revenue) + barMargin;
  const profit = gross - Number(s.house_costs) - Number(s.other_costs) - commissions;
  const venue = (profit * Number(event.venue_share_pct)) / 100;
  const team = profit - venue;
  const rafael = (team * Number(event.cofounder_share_pct)) / 100;
  const tareq = team - rafael;
  return { commissions, barMargin, gross, profit, venue, team, rafael, tareq };
}

/* ---------- Groupe WhatsApp ---------- */

export type WhatsappPost = {
  id: string;
  week_id: string | null;
  scheduled_at: string;
  slot: string;
  category: string;
  content: string;
  status: "brouillon" | "valide" | "envoye" | "erreur" | "annule";
  includes_manual_link: boolean;
  source_url: string | null;
  sent_at: string | null;
};

export async function fetchWhatsappPosts(fromIso: string, toIso: string): Promise<WhatsappPost[]> {
  return check(
    await db
      .from("whatsapp_posts")
      .select(
        "id,week_id,scheduled_at,slot,category,content,status,includes_manual_link,source_url,sent_at",
      )
      .gte("scheduled_at", fromIso)
      .lt("scheduled_at", toIso)
      .order("scheduled_at"),
  );
}

export async function setWhatsappStatus(id: string, status: WhatsappPost["status"]) {
  const patch: Record<string, unknown> = { status };
  if (status === "envoye") patch.sent_at = new Date().toISOString();
  check(await db.from("whatsapp_posts").update(patch).eq("id", id));
}

export async function updateWhatsappContent(id: string, content: string) {
  check(await db.from("whatsapp_posts").update({ content }).eq("id", id));
}

/* ---------- Ventes du Manuel ---------- */

export type ManualSale = {
  id: string;
  channel_id: string | null;
  customer_email: string | null;
  amount_total: number | null;
  currency: string | null;
  commission_rate: number | null;
  commission_amount: number | null;
  created_at: string;
};

export type SalesChannel = {
  id: string;
  name: string;
  slug: string | null;
  commission_rate: number;
  active: boolean;
};

export async function fetchManualSales() {
  const [sales, channels] = await Promise.all([
    db
      .from("sales")
      .select(
        "id,channel_id,customer_email,amount_total,currency,commission_rate,commission_amount,created_at",
      )
      .order("created_at", { ascending: false }),
    db.from("sales_channels").select("id,name,slug,commission_rate,active").order("name"),
  ]);
  return { sales: check<ManualSale[]>(sales), channels: check<SalesChannel[]>(channels) };
}

export async function saveSalesChannel(row: Partial<SalesChannel> & { name: string }) {
  const { id, ...rest } = row;
  if (id) return check(await db.from("sales_channels").update(rest).eq("id", id));
  return check(await db.from("sales_channels").insert(rest));
}

/* ---------- Distribution (OTA) ---------- */

export type OtaListing = {
  id: string;
  platform: string;
  experience_id: string | null;
  external_id: string | null;
  title: string;
  status: "brouillon" | "en_examen" | "a_corriger" | "en_ligne" | "refuse" | "archive";
  issue: string | null;
  url: string | null;
  bookings_count: number;
  reviews_count: number;
  rating: number | null;
  last_checked_at: string | null;
  notes: string | null;
};

export const OTA_STATUS_LABELS: Record<OtaListing["status"], string> = {
  brouillon: "Brouillon",
  en_examen: "En examen",
  a_corriger: "À corriger",
  en_ligne: "En ligne",
  refuse: "Refusé",
  archive: "Archivé",
};

export async function fetchOtaListings(): Promise<OtaListing[]> {
  return check(await db.from("ota_listings").select("*").order("updated_at", { ascending: false }));
}

export async function saveOtaListing(row: Partial<OtaListing> & { title: string }) {
  const { id, ...rest } = row;
  if (id) return check(await db.from("ota_listings").update(rest).eq("id", id));
  return check(await db.from("ota_listings").insert(rest));
}

export async function fetchExperienceOptions(): Promise<{ id: string; title: string }[]> {
  return check(await db.from("experiences").select("id,title").order("title"));
}

/* ---------- Partenaires ---------- */

export type Partner = {
  id: string;
  name: string;
  contact_name: string | null;
  email: string | null;
  phone: string | null;
  category: string | null;
  location: string | null;
  notes: string | null;
  website: string | null;
  is_active: boolean;
  created_at: string;
};

export const PARTNER_STATUSES = ["à contacter", "contacté", "partenaire", "refus"] as const;

export function partnerStatus(notes: string | null): string {
  const m = notes?.match(/Statut\s*:\s*([^|\n]+)/i);
  return m ? m[1].trim() : "";
}

export function withPartnerStatus(notes: string | null, status: string): string {
  if (!notes) return `Statut : ${status}`;
  if (/Statut\s*:/i.test(notes))
    return notes.replace(/Statut\s*:\s*[^|\n]+/i, `Statut : ${status}`);
  return `${notes} | Statut : ${status}`;
}

export async function fetchPartners(): Promise<Partner[]> {
  return check(await db.from("partners").select("*").order("created_at", { ascending: false }));
}

export async function savePartner(row: Partial<Partner> & { name: string }) {
  const { id, ...rest } = row;
  if (id) return check(await db.from("partners").update(rest).eq("id", id));
  return check(await db.from("partners").insert(rest));
}

/* ---------- Utilitaires ---------- */

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}

export function fmtMoney(value: number | null | undefined, currency = "BRL") {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function fmtDateTime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
  });
}

export function daysUntil(iso: string) {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

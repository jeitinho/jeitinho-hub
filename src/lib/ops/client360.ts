import { supabase } from "@/integrations/supabase/client";
import type { ClientRecord } from "@/lib/clients-gateway";
import { invoiceStatusLabel } from "@/lib/invoices/status";
import { quoteStatusLabel } from "@/lib/quotes/status";
import {
  OTA_BOOKING_STATUS_LABELS,
  TASK_KIND_LABELS,
  fmtDateTime,
  type OtaBooking,
} from "@/lib/ops/ops";
import { normalize, type Partner } from "@/lib/ops/partenaires";

/*
 * Fiche 360 : tout l'historique d'une personne (client ou partenaire) en une
 * chronologie unique, plus la valeur (encaissé, devis en cours, prochain événement).
 *
 * Rattachement d'un client :
 *  - devis, voyages, factures, paiements, tâches : client_id, ou via ses devis ;
 *  - demandes : prospects.client_id, prospects cités par ses devis/voyages, ou
 *    leads/prospects au même e-mail ou téléphone ; leads via leur prospect ;
 *  - rendez-vous : calendar_events.related_trip_id (seul lien existant) ;
 *  - Manuel : sales.customer_email = e-mail du client.
 * Montants toujours par devise, sans conversion. Lecture via RLS (can_manage).
 */

// Tables récentes : typage souple, les types générés restent la référence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

/** Boîte clients contact@jeitinho.fr = compte Google yesbrazilconciergerie@gmail.com. */
export const CLIENT_INBOX_ACCOUNT = "yesbrazilconciergerie@gmail.com";
const TZ = "America/Sao_Paulo";
// Rio : UTC−3 sans heure d'été depuis 2019.
const TZ_OFFSET = "-03:00";
/** sales.amount_total : entier Stripe (centimes). */
const SALES_MINOR_UNIT = 100;

/* ---------- Lignes brutes ---------- */

export type QuoteRow = {
  id: string;
  client_id: string | null;
  number: string | null;
  reference: string | null;
  title: string;
  status: string;
  currency: string;
  total_amount: number | null;
  created_at: string;
  sent_at: string | null;
  accepted_at: string | null;
  paid_at: string | null;
  period_start: string | null;
  period_end: string | null;
  prospect_id: string | null;
  language: string | null;
};

export type PaymentRow = {
  id: string;
  paid_at: string;
  amount: number;
  currency: string;
  kind: string;
  method: string | null;
  client_id: string | null;
  quote_id: string | null;
  trip_id: string | null;
  reference: string | null;
  notes?: string | null;
};

export type InvoiceRow = {
  id: string;
  number: string | null;
  title: string | null;
  status: string;
  currency: string;
  total_amount: number | null;
  issue_date: string | null;
  paid_at: string | null;
  created_at: string;
  client_id: string | null;
  quote_id: string | null;
  language: string | null;
};

export type TripRow = {
  id: string;
  reference: string | null;
  title: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  client_id: string | null;
  quote_id: string | null;
  source_prospect_id: string | null;
  party_size: number | null;
};

export type TaskRow = {
  id: string;
  kind: string;
  channel: string;
  status: string;
  title: string;
  due_at: string;
  handled_at: string | null;
  created_at: string;
  client_id: string | null;
  quote_id: string | null;
  lead_id: string | null;
  prospect_id: string | null;
  partner_id: string | null;
  message_draft?: string | null;
};

export type LeadRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  request_type: string | null;
  status: string;
  received_at: string | null;
  created_at: string;
  prospect_id: string | null;
  travel_start: string | null;
  travel_end: string | null;
  party_size: number | null;
  message?: string | null;
};

export type ProspectRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: string;
  created_at: string;
  client_id: string | null;
  travel_start: string | null;
  travel_end: string | null;
  party_size: number | null;
  message?: string | null;
};

export type CalendarRow = {
  id: string;
  title: string;
  kind: string | null;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  related_trip_id: string | null;
};

export type SaleRow = {
  id: string;
  customer_email: string | null;
  amount_total: number;
  currency: string;
  created_at: string;
};

export type OtaRow = Pick<
  OtaBooking,
  | "id"
  | "platform"
  | "booking_ref"
  | "client_id"
  | "activity_title"
  | "start_at"
  | "participants"
  | "activity_language"
  | "lead_language"
  | "price"
  | "currency"
  | "status"
  | "created_at"
>;

export type Client360Raw = {
  quotes: QuoteRow[];
  payments: PaymentRow[];
  invoices: InvoiceRow[];
  trips: TripRow[];
  tasks: TaskRow[];
  leads: LeadRow[];
  prospects: ProspectRow[];
  events: CalendarRow[];
  sales: SaleRow[];
  ota: OtaRow[];
};

type ClientLike = Pick<ClientRecord, "id" | "full_name" | "email" | "phone" | "created_at"> & {
  notes?: string | null;
};

const QUOTE_SELECT =
  "id,client_id,number,reference,title,status,currency,total_amount,created_at,sent_at,accepted_at,paid_at,period_start,period_end,prospect_id,language";
const PAYMENT_SELECT =
  "id,paid_at,amount,currency,kind,method,client_id,quote_id,trip_id,reference";
const INVOICE_SELECT =
  "id,number,title,status,currency,total_amount,issue_date,paid_at,created_at,client_id,quote_id,language";
const TRIP_SELECT =
  "id,reference,title,status,start_date,end_date,created_at,client_id,quote_id,source_prospect_id,party_size";
const TASK_SELECT =
  "id,kind,channel,status,title,due_at,handled_at,created_at,client_id,quote_id,lead_id,prospect_id,partner_id";
const LEAD_SELECT =
  "id,name,email,phone,source,request_type,status,received_at,created_at,prospect_id,travel_start,travel_end,party_size";
const PROSPECT_SELECT =
  "id,name,email,phone,source,status,created_at,client_id,travel_start,travel_end,party_size";
const EVENT_SELECT = "id,title,kind,starts_at,ends_at,all_day,location,related_trip_id";
const SALE_SELECT = "id,customer_email,amount_total,currency,created_at";
const OTA_SELECT =
  "id,platform,booking_ref,client_id,activity_title,start_at,participants,activity_language,lead_language,price,currency,status,created_at";

const EMPTY = Promise.resolve({ data: [], error: null });

function uniqueById<T extends { id: string }>(...lists: T[][]): T[] {
  const seen = new Map<string, T>();
  for (const list of lists) for (const row of list) if (!seen.has(row.id)) seen.set(row.id, row);
  return [...seen.values()];
}

/* ---------- Rapprochement par contact ---------- */

export function normEmail(e: string | null | undefined) {
  return (e ?? "").trim().toLowerCase();
}

export function phoneDigits(p: string | null | undefined) {
  return (p ?? "").replace(/\D/g, "");
}

/** Même numéro, au format national ou international (on compare les 9 derniers chiffres). */
export function samePhone(a: string | null | undefined, b: string | null | undefined) {
  const x = phoneDigits(a);
  const y = phoneDigits(b);
  if (x.length < 8 || y.length < 8) return false;
  if (x === y) return true;
  return x.length >= 9 && y.length >= 9 && x.slice(-9) === y.slice(-9);
}

function sameContact(
  row: { email: string | null; phone: string | null },
  c: Pick<ClientLike, "email" | "phone">,
) {
  const e = normEmail(c.email);
  return (!!e && normEmail(row.email) === e) || samePhone(row.phone, c.phone);
}

/** Demandes (prospects puis leads) rattachées au client. */
function matchDemandes(
  c: ClientLike,
  quotes: QuoteRow[],
  trips: TripRow[],
  prospects: ProspectRow[],
  leads: LeadRow[],
) {
  const cited = new Set<string>();
  for (const q of quotes) if (q.prospect_id) cited.add(q.prospect_id);
  for (const t of trips) if (t.source_prospect_id) cited.add(t.source_prospect_id);
  const myProspects = prospects.filter(
    (p) => p.client_id === c.id || cited.has(p.id) || (!p.client_id && sameContact(p, c)),
  );
  const prospectIds = new Set(myProspects.map((p) => p.id));
  const otherClientProspects = new Set(
    prospects.filter((p) => p.client_id && p.client_id !== c.id).map((p) => p.id),
  );
  const myLeads = leads.filter(
    (l) =>
      (l.prospect_id && prospectIds.has(l.prospect_id)) ||
      (!(l.prospect_id && otherClientProspects.has(l.prospect_id)) && sameContact(l, c)),
  );
  return { prospects: myProspects, leads: myLeads };
}

/* ---------- Lectures ---------- */

/**
 * Tout ce qui concerne un client (hors réservations plateformes : elles viennent de la
 * même requête que la liste OtaBookingsList, pour rester synchronisées).
 */
export async function fetchClient360Raw(client: ClientLike): Promise<Omit<Client360Raw, "ota">> {
  const id = client.id;
  const email = client.email?.trim();
  const [q, p, i, t, k, l, pr, s] = await Promise.all([
    db.from("quotes").select(QUOTE_SELECT).eq("client_id", id),
    db.from("payments").select(`${PAYMENT_SELECT},notes`).eq("client_id", id),
    db.from("invoices").select(INVOICE_SELECT).eq("client_id", id),
    db.from("trips").select(TRIP_SELECT).eq("client_id", id),
    db.from("crm_tasks").select(`${TASK_SELECT},message_draft`).eq("client_id", id),
    db.from("leads").select(`${LEAD_SELECT},message`),
    db.from("prospects").select(`${PROSPECT_SELECT},message`),
    email
      ? db.from("sales").select(SALE_SELECT).ilike("customer_email", email).gt("amount_total", 0)
      : EMPTY,
  ]);
  const quotes = check<QuoteRow[]>(q);
  const trips1 = check<TripRow[]>(t);
  const { prospects, leads } = matchDemandes(
    client,
    quotes,
    trips1,
    check<ProspectRow[]>(pr),
    check<LeadRow[]>(l),
  );

  const quoteIds = quotes.map((x) => x.id);
  const taskLinks = [
    quoteIds.length ? `quote_id.in.(${quoteIds.join(",")})` : null,
    prospects.length ? `prospect_id.in.(${prospects.map((x) => x.id).join(",")})` : null,
    leads.length ? `lead_id.in.(${leads.map((x) => x.id).join(",")})` : null,
  ].filter(Boolean);
  const [p2, i2, t2, k2] = await Promise.all([
    quoteIds.length
      ? db.from("payments").select(`${PAYMENT_SELECT},notes`).in("quote_id", quoteIds)
      : EMPTY,
    quoteIds.length ? db.from("invoices").select(INVOICE_SELECT).in("quote_id", quoteIds) : EMPTY,
    quoteIds.length ? db.from("trips").select(TRIP_SELECT).in("quote_id", quoteIds) : EMPTY,
    taskLinks.length
      ? db.from("crm_tasks").select(`${TASK_SELECT},message_draft`).or(taskLinks.join(","))
      : EMPTY,
  ]);
  const trips = uniqueById(trips1, check<TripRow[]>(t2));
  const events = trips.length
    ? check<CalendarRow[]>(
        await db
          .from("calendar_events")
          .select(EVENT_SELECT)
          .in(
            "related_trip_id",
            trips.map((x) => x.id),
          ),
      )
    : [];

  return {
    quotes,
    payments: uniqueById(check<PaymentRow[]>(p), check<PaymentRow[]>(p2)),
    invoices: uniqueById(check<InvoiceRow[]>(i), check<InvoiceRow[]>(i2)),
    trips,
    tasks: uniqueById(check<TaskRow[]>(k), check<TaskRow[]>(k2)),
    leads,
    prospects,
    events,
    sales: check<SaleRow[]>(s).filter((x) => normEmail(x.customer_email) === normEmail(email)),
  };
}

/** Données légères de tous les clients, pour la liste (dernière activité, encaissé, devis). */
export async function fetchAllClientActivity(): Promise<Client360Raw> {
  const [q, p, i, t, k, l, pr, e, s, o] = await Promise.all([
    db.from("quotes").select(QUOTE_SELECT).not("client_id", "is", null),
    db.from("payments").select(PAYMENT_SELECT),
    db.from("invoices").select(INVOICE_SELECT),
    db.from("trips").select(TRIP_SELECT),
    db
      .from("crm_tasks")
      .select(TASK_SELECT)
      .or("client_id.not.is.null,quote_id.not.is.null,lead_id.not.is.null,prospect_id.not.is.null"),
    db.from("leads").select(LEAD_SELECT),
    db.from("prospects").select(PROSPECT_SELECT),
    db.from("calendar_events").select(EVENT_SELECT).not("related_trip_id", "is", null),
    db.from("sales").select(SALE_SELECT).gt("amount_total", 0),
    db.from("ota_bookings").select(OTA_SELECT).not("client_id", "is", null),
  ]);
  return {
    quotes: check<QuoteRow[]>(q),
    payments: check<PaymentRow[]>(p),
    invoices: check<InvoiceRow[]>(i),
    trips: check<TripRow[]>(t),
    tasks: check<TaskRow[]>(k),
    leads: check<LeadRow[]>(l),
    prospects: check<ProspectRow[]>(pr),
    events: check<CalendarRow[]>(e),
    sales: check<SaleRow[]>(s),
    ota: check<OtaRow[]>(o),
  };
}

/* ---------- Partenaires ---------- */

type EventRef = { id: string; name: string; starts_at: string | null } | null;

export type PartnerSaleRow = {
  id: string;
  event_id: string;
  partner_id: string | null;
  partner_name: string;
  tickets: number;
  vip_revenue: number;
  paid: boolean;
  paid_at: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
  events: EventRef;
};

export type PartnerCodeRow = {
  id: string;
  event_id: string;
  partner_id: string | null;
  code: string;
  discount_pct: number;
  platform: string;
  uses: number;
  revenue: number;
  paid: boolean;
  created_at: string;
  events: EventRef;
};

export type PartnerTimelineRaw = {
  tasks: TaskRow[];
  sales: PartnerSaleRow[];
  codes: PartnerCodeRow[];
  payments: (PaymentRow & { event_id: string | null })[];
};

export async function fetchPartnerTimelineRaw(p: Partner): Promise<PartnerTimelineRaw> {
  const [k, s, c, pay] = await Promise.all([
    db.from("crm_tasks").select(`${TASK_SELECT},message_draft`).eq("partner_id", p.id),
    db.from("event_partner_sales").select("*, events(id,name,starts_at)"),
    db.from("event_promo_codes").select("*, events(id,name,starts_at)").eq("partner_id", p.id),
    db.from("payments").select(`${PAYMENT_SELECT},notes,event_id`).eq("partner_id", p.id),
  ]);
  const name = normalize(p.name);
  return {
    tasks: check<TaskRow[]>(k),
    // Même règle que l'onglet Liens (salesFor) : partner_id, sinon nom identique.
    sales: check<PartnerSaleRow[]>(s).filter(
      (x) =>
        x.partner_id === p.id || (!x.partner_id && !!name && normalize(x.partner_name) === name),
    ),
    codes: check<PartnerCodeRow[]>(c),
    payments: check<PartnerTimelineRaw["payments"]>(pay),
  };
}

/* ---------- Dates ---------- */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
// Les imports (Sheet, Drive) ont des horodatages à minuit UTC pile : ce sont des dates.
const MIDNIGHT_UTC_RE = /^(\d{4}-\d{2}-\d{2})[T ]00:00:00(\.0+)?(Z|\+00(:?00)?)$/;

export function stampOf(iso: string): { ts: number; day: string | null } {
  if (DATE_RE.test(iso)) return { ts: Date.parse(`${iso}T12:00:00${TZ_OFFSET}`), day: iso };
  const m = iso.match(MIDNIGHT_UTC_RE);
  if (m) return { ts: Date.parse(`${m[1]}T12:00:00${TZ_OFFSET}`), day: m[1] };
  return { ts: Date.parse(iso), day: null };
}

export function todayInRio(now = Date.now()) {
  return new Date(now - 3 * 3_600_000).toISOString().slice(0, 10);
}

export function fmtDay(day: string) {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Date affichée : jour seul pour les dates, jour + heure (Rio) sinon. */
export function fmtWhen(iso: string | null | undefined) {
  if (!iso) return "—";
  const { day } = stampOf(iso);
  return day ? fmtDay(day) : fmtDateTime(iso);
}

export function relativeDays(ts: number, now = Date.now()) {
  const today = Date.parse(`${todayInRio(now)}T12:00:00${TZ_OFFSET}`);
  const that = Date.parse(`${todayInRio(ts)}T12:00:00${TZ_OFFSET}`);
  const d = Math.round((that - today) / 86_400_000);
  if (d === 0) return "aujourd'hui";
  if (d === -1) return "hier";
  if (d === 1) return "demain";
  return d < 0 ? `il y a ${-d} j` : `dans ${d} j`;
}

function fmtRange(a: string | null, b: string | null) {
  if (!a) return null;
  if (!b || b === a) return fmtWhen(a);
  return `${fmtWhen(a)} → ${fmtWhen(b)}`;
}

/* ---------- Notes horodatées (clients.notes) ---------- */

const NOTE_RE = /^\[(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})\]\s*(.+)$/;

function rioStamp(d: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("fr-FR", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

/** Ajoute « [jj/mm/aaaa hh:mm] texte » en tête des notes (une ligne par note). */
export function prependNote(notes: string | null | undefined, text: string, now = new Date()) {
  const line = `[${rioStamp(now)}] ${text.trim().replace(/\s*\n+\s*/g, " / ")}`;
  const rest = (notes ?? "").trim();
  return rest ? `${line}\n${rest}` : line;
}

export function parseNotes(notes: string | null | undefined): { at: string; text: string }[] {
  const out: { at: string; text: string }[] = [];
  for (const raw of (notes ?? "").split("\n")) {
    const m = raw.trim().match(NOTE_RE);
    if (!m) continue;
    const [, dd, mm, yyyy, hh, mi, text] = m;
    const at = new Date(`${yyyy}-${mm}-${dd}T${hh}:${mi}:00${TZ_OFFSET}`);
    if (!Number.isNaN(at.getTime())) out.push({ at: at.toISOString(), text });
  }
  return out;
}

/* ---------- Libellés ---------- */

export type SourceInfo = { key: string; label: string; tone: string };

const TONES = {
  gyg: "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300",
  site: "border-sky-500/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
  manuel: "border-violet-500/40 bg-violet-500/10 text-violet-800 dark:text-violet-300",
  neutral: "border-border bg-muted/40 text-muted-foreground",
};

/** Badge de source : valeurs connues normalisées, texte libre conservé. */
export function sourceInfo(source: string | null | undefined): SourceInfo | null {
  const s = (source ?? "").trim();
  if (!s) return null;
  const k = s.toLowerCase();
  if (k === "getyourguide" || k === "gyg")
    return { key: "getyourguide", label: "GetYourGuide", tone: TONES.gyg };
  if (k === "site" || k.startsWith("jeitinho.fr") || k.startsWith("http"))
    return { key: "site", label: "Site", tone: TONES.site };
  if (k === "manuel" || k.startsWith("manuel"))
    return { key: "manuel", label: "Manuel", tone: TONES.manuel };
  if (k === "manual") return { key: "manual", label: "Saisie manuelle", tone: TONES.neutral };
  return { key: k, label: s, tone: TONES.neutral };
}

const LANGUAGE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "Anglais",
  pt: "Portugais",
  es: "Espagnol",
  de: "Allemand",
  it: "Italien",
};

export const TASK_STATUS_LABELS: Record<string, string> = {
  a_valider: "À valider",
  valide: "Validée",
  envoye: "Envoyée",
  annule: "Annulée",
};

const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  instagram: "Instagram",
  getyourguide: "GetYourGuide",
  sms: "SMS",
  phone: "Téléphone",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  converted: "Converti",
  lost: "Perdu",
  spam: "Spam",
};

const PROSPECT_STATUS_LABELS: Record<string, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  quoted: "Devis envoyé",
  negotiating: "Négociation",
  won: "Gagné",
  lost: "Perdu",
};

const TRIP_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  confirmed: "Confirmé",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

const QUOTE_EXTRA_STATUS: Record<string, string> = {
  paid: "Payé",
  ready: "Prêt",
  expired: "Expiré",
};

export function quoteStatus(s: string) {
  return QUOTE_EXTRA_STATUS[s] ?? quoteStatusLabel(s);
}

const PAYMENT_KIND_LABELS: Record<string, string> = { acompte: "Acompte", solde: "Solde" };
const PLATFORM_LABELS: Record<string, string> = { getyourguide: "GetYourGuide" };

/* ---------- Chronologie ---------- */

export type TimelineKind =
  | "demande"
  | "devis"
  | "paiement"
  | "facture"
  | "voyage"
  | "reservation"
  | "tache"
  | "rdv"
  | "vente"
  | "manuel"
  | "note";

export const TIMELINE_KIND_LABELS: Record<TimelineKind, string> = {
  demande: "Demandes",
  devis: "Devis",
  paiement: "Paiements",
  facture: "Factures",
  voyage: "Voyages",
  reservation: "Réservations",
  tache: "Tâches",
  rdv: "Rendez-vous",
  vente: "Ventes & codes",
  manuel: "Manuel",
  note: "Notes & fiche",
};

export type TimelineLink =
  | { to: "/devis/$id"; id: string }
  | { to: "/devis/factures/$id"; id: string }
  | { to: "/voyages/$id"; id: string }
  | { to: "/evenements"; id: string }
  | { to: "/crm" }
  | { to: "/a-valider" }
  | { to: "/distribution" }
  | { to: "/calendrier" }
  | { to: "/manuel" }
  | { to: "/finances" };

export type Money = { value: number; currency: string };

export type TimelineItem = {
  key: string;
  kind: TimelineKind;
  at: string;
  ts: number;
  /** Jour sans heure (colonne date, ou horodatage importé à minuit UTC). */
  day: string | null;
  title: string;
  detail?: string | null;
  status?: string | null;
  amount?: Money | null;
  link?: TimelineLink | null;
  message?: string | null;
  messageLabel?: string;
};

type ItemInput = Omit<TimelineItem, "ts" | "day" | "at"> & { at: string | null | undefined };

function pushItem(list: TimelineItem[], it: ItemInput) {
  if (!it.at) return;
  const s = stampOf(it.at);
  if (Number.isNaN(s.ts)) return;
  list.push({ ...it, at: it.at, ts: s.ts, day: s.day });
}

const join = (...parts: (string | null | undefined | false)[]) =>
  parts.filter(Boolean).join(" · ") || null;

const quoteLabel = (q: Pick<QuoteRow, "number" | "reference">) =>
  `Devis ${q.number ?? q.reference ?? ""}`.trim();

export function taskItem(t: TaskRow): ItemInput {
  const done = t.status === "envoye" || t.status === "annule";
  const at = done ? (t.handled_at ?? t.created_at) : t.created_at;
  return {
    key: `task-${t.id}`,
    kind: "tache",
    at,
    title: t.title,
    status: TASK_STATUS_LABELS[t.status] ?? t.status,
    // Tâche traitée : la date affichée est handled_at (date d'envoi) ; sinon on rappelle l'échéance.
    detail: join(
      TASK_KIND_LABELS[t.kind] ?? t.kind,
      CHANNEL_LABELS[t.channel] ?? t.channel,
      done ? null : `prévue le ${fmtDateTime(t.due_at)}`,
    ),
    message: t.message_draft ?? null,
    messageLabel: t.status === "envoye" ? "Message envoyé" : "Brouillon du message",
    link: { to: "/a-valider" },
  };
}

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return { value: Number(value), currency: (currency ?? "BRL").toUpperCase() };
}

export type CurrencyTotals = Record<string, number>;

function addTo(t: CurrencyTotals, m: Money | null) {
  if (!m || !m.value) return;
  t[m.currency] = (t[m.currency] ?? 0) + m.value;
}

const CURRENCY_ORDER = ["EUR", "BRL"];
export function currenciesOf(t: CurrencyTotals) {
  return Object.keys(t)
    .filter((c) => t[c] !== 0)
    .sort((a, b) => {
      const ia = CURRENCY_ORDER.indexOf(a);
      const ib = CURRENCY_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
}

export type OpenQuote = {
  id: string;
  label: string;
  title: string;
  status: string;
  currency: string;
  total: number;
  paid: number;
  remaining: number;
  /** Paiements du devis dans une autre devise : affichés, jamais déduits. */
  otherCurrencyPaid: CurrencyTotals;
  period_start: string | null;
};

export type Upcoming = {
  key: string;
  title: string;
  detail: string | null;
  at: string;
  ts: number;
  day: string | null;
  link: TimelineLink | null;
};

export type Client360 = {
  items: TimelineItem[];
  collected: CurrencyTotals;
  collectedBy: { payments: CurrencyTotals; ota: CurrencyTotals; manuel: CurrencyTotals };
  openQuotes: OpenQuote[];
  openRemaining: CurrencyTotals;
  upcoming: Upcoming[];
  lastActivity: { ts: number; at: string; day: string | null; title: string } | null;
  language: { label: string; from: string } | null;
};

const OPEN_QUOTE_STATUSES = new Set(["sent", "accepted"]);
const DATED_QUOTE_STATUSES = new Set(["accepted", "paid"]);

/**
 * Construit la fiche 360 d'un client. `raw` peut contenir les données de tous les
 * clients (liste) ou seulement les siennes (fiche) : le rattachement est refait ici.
 */
export function buildClient360(c: ClientLike, raw: Client360Raw, now = Date.now()): Client360 {
  const quotes = raw.quotes.filter((q) => q.client_id === c.id);
  const quoteIds = new Set(quotes.map((q) => q.id));
  const quoteById = new Map(quotes.map((q) => [q.id, q]));
  const viaQuote = (id: string | null) => !!id && quoteIds.has(id);

  const trips = raw.trips.filter((t) => t.client_id === c.id || viaQuote(t.quote_id));
  const tripIds = new Set(trips.map((t) => t.id));
  const { prospects, leads } = matchDemandes(c, quotes, trips, raw.prospects, raw.leads);
  const prospectIds = new Set(prospects.map((p) => p.id));
  const leadIds = new Set(leads.map((l) => l.id));

  const payments = raw.payments.filter((p) => p.client_id === c.id || viaQuote(p.quote_id));
  const invoices = raw.invoices.filter((i) => i.client_id === c.id || viaQuote(i.quote_id));
  const ota = raw.ota.filter((o) => o.client_id === c.id);
  const tasks = raw.tasks.filter(
    (t) =>
      t.client_id === c.id ||
      viaQuote(t.quote_id) ||
      (!!t.prospect_id && prospectIds.has(t.prospect_id)) ||
      (!!t.lead_id && leadIds.has(t.lead_id)),
  );
  const events = raw.events.filter((e) => !!e.related_trip_id && tripIds.has(e.related_trip_id));
  const email = normEmail(c.email);
  const sales = email
    ? raw.sales.filter((s) => normEmail(s.customer_email) === email && Number(s.amount_total) > 0)
    : [];

  const items: TimelineItem[] = [];
  const add = (it: ItemInput) => pushItem(items, it);

  /* Demandes */
  const prospectsWithLead = new Set(leads.map((l) => l.prospect_id).filter(Boolean));
  for (const l of leads) {
    const p = l.prospect_id ? prospects.find((x) => x.id === l.prospect_id) : undefined;
    add({
      key: `lead-${l.id}`,
      kind: "demande",
      at: l.received_at ?? l.created_at,
      title: `Demande reçue${l.source ? ` — ${l.source}` : ""}`,
      detail: join(
        l.request_type && l.request_type !== l.source ? l.request_type : null,
        fmtRange(l.travel_start, l.travel_end) &&
          `séjour ${fmtRange(l.travel_start, l.travel_end)}`,
        l.party_size ? `${l.party_size} pers.` : null,
        p ? `prospect : ${PROSPECT_STATUS_LABELS[p.status] ?? p.status}` : null,
      ),
      status: LEAD_STATUS_LABELS[l.status] ?? l.status,
      message: l.message ?? null,
      messageLabel: "Message du client",
      link: { to: "/crm" },
    });
  }
  for (const p of prospects) {
    if (prospectsWithLead.has(p.id)) continue;
    add({
      key: `prospect-${p.id}`,
      kind: "demande",
      at: p.created_at,
      title: `Prospect créé${p.source ? ` — ${p.source}` : ""}`,
      detail: join(
        fmtRange(p.travel_start, p.travel_end) &&
          `séjour ${fmtRange(p.travel_start, p.travel_end)}`,
        p.party_size ? `${p.party_size} pers.` : null,
      ),
      status: PROSPECT_STATUS_LABELS[p.status] ?? p.status,
      message: p.message ?? null,
      messageLabel: "Message du client",
      link: { to: "/crm" },
    });
  }

  /* Devis : chaque étape datée ; le statut actuel est porté par la plus récente. */
  for (const q of quotes) {
    const label = quoteLabel(q);
    const base = {
      kind: "devis" as const,
      detail: q.title,
      amount: money(q.total_amount, q.currency),
      link: { to: "/devis/$id", id: q.id } as TimelineLink,
    };
    // Devis importés : created_at = date d'import, postérieure à l'envoi réel.
    const importedLater = !!q.sent_at && Date.parse(q.created_at) > Date.parse(q.sent_at);
    const steps: TimelineItem[] = [];
    const step = (key: string, at: string | null, verb: string) =>
      pushItem(steps, { ...base, key: `quote-${key}-${q.id}`, at, title: `${label} ${verb}` });
    if (!importedLater) step("c", q.created_at, "créé");
    step("s", q.sent_at, "envoyé");
    step("a", q.accepted_at, "accepté");
    step("p", q.paid_at, "payé");
    steps.sort((a, b) => a.ts - b.ts);
    const latest = steps[steps.length - 1];
    if (latest) latest.status = quoteStatus(q.status);
    items.push(...steps);

    const dated =
      q.period_start &&
      (DATED_QUOTE_STATUSES.has(q.status) ||
        (q.status === "sent" && q.period_start >= todayInRio(now)));
    if (dated)
      add({
        key: `quote-d-${q.id}`,
        kind: "devis",
        at: q.period_start,
        title: q.title,
        detail: join(label, fmtRange(q.period_start, q.period_end)),
        status: quoteStatus(q.status),
        link: { to: "/devis/$id", id: q.id },
      });
  }

  /* Paiements */
  for (const p of payments) {
    const q = p.quote_id ? quoteById.get(p.quote_id) : undefined;
    add({
      key: `pay-${p.id}`,
      kind: "paiement",
      at: p.paid_at,
      title: `${PAYMENT_KIND_LABELS[p.kind] ?? "Paiement"} reçu`,
      detail: join(q ? `${quoteLabel(q)} · ${q.title}` : null, p.method, p.reference, p.notes),
      amount: money(p.amount, p.currency),
      link: p.quote_id ? { to: "/devis/$id", id: p.quote_id } : { to: "/finances" },
    });
  }

  /* Factures */
  for (const i of invoices) {
    const base = {
      kind: "facture" as const,
      detail: i.title,
      amount: money(i.total_amount, i.currency),
      link: { to: "/devis/factures/$id", id: i.id } as TimelineLink,
    };
    const label = `Facture ${i.number ?? ""}`.trim();
    add({
      ...base,
      key: `inv-e-${i.id}`,
      at: i.issue_date ?? i.created_at,
      title: `${label} émise`,
      status: invoiceStatusLabel(i.status),
    });
    add({ ...base, key: `inv-p-${i.id}`, at: i.paid_at, title: `${label} payée` });
  }

  /* Voyages */
  for (const t of trips) {
    const link: TimelineLink = { to: "/voyages/$id", id: t.id };
    add({
      key: `trip-c-${t.id}`,
      kind: "voyage",
      at: t.created_at,
      title: t.reference ? `Voyage ${t.reference} créé` : "Voyage créé",
      detail: t.title,
      link,
    });
    add({
      key: `trip-s-${t.id}`,
      kind: "voyage",
      at: t.start_date,
      title: `Voyage : ${t.title}`,
      detail: join(
        fmtRange(t.start_date, t.end_date),
        t.party_size ? `${t.party_size} pers.` : null,
      ),
      status: TRIP_STATUS_LABELS[t.status] ?? t.status,
      link,
    });
  }

  /* Réservations plateformes */
  for (const b of ota) {
    const platform = PLATFORM_LABELS[b.platform] ?? b.platform;
    add({
      key: `ota-r-${b.id}`,
      kind: "reservation",
      at: b.created_at,
      title: `Réservation ${platform} reçue`,
      detail: join(
        b.activity_title,
        b.participants ? `${b.participants} pers.` : null,
        b.booking_ref,
        b.start_at ? `pour le ${fmtDateTime(b.start_at)}` : "date à confirmer",
      ),
      amount: b.status === "annulee" ? null : money(b.price, b.currency),
      link: { to: "/distribution" },
    });
    add({
      key: `ota-s-${b.id}`,
      kind: "reservation",
      at: b.start_at,
      title: b.activity_title ?? `Activité ${platform}`,
      detail: join(
        platform,
        b.participants ? `${b.participants} pers.` : null,
        b.activity_language ? `tour en ${b.activity_language}` : null,
      ),
      status: OTA_BOOKING_STATUS_LABELS[b.status] ?? b.status,
      link: { to: "/distribution" },
    });
  }

  /* Tâches */
  for (const t of tasks) add(taskItem(t));

  /* Rendez-vous */
  for (const e of events) {
    add({
      key: `cal-${e.id}`,
      kind: "rdv",
      at: e.all_day ? todayInRio(Date.parse(e.starts_at)) : e.starts_at,
      title: e.title,
      detail: join(e.kind, e.location),
      link: { to: "/calendrier" },
    });
  }

  /* Manuel */
  for (const s of sales) {
    add({
      key: `sale-${s.id}`,
      kind: "manuel",
      at: s.created_at,
      title: "Achat du Manuel JEITINHO",
      amount: money(Number(s.amount_total) / SALES_MINOR_UNIT, s.currency),
      link: { to: "/manuel" },
    });
  }

  /* Notes et fiche */
  parseNotes(c.notes).forEach((n, idx) =>
    add({ key: `note-${idx}-${n.at}`, kind: "note", at: n.at, title: n.text }),
  );
  add({ key: "fiche", kind: "note", at: c.created_at, title: "Fiche client créée" });

  items.sort((a, b) => b.ts - a.ts || a.key.localeCompare(b.key));

  /* Valeur */
  const collectedBy = {
    payments: {} as CurrencyTotals,
    ota: {} as CurrencyTotals,
    manuel: {} as CurrencyTotals,
  };
  for (const p of payments) addTo(collectedBy.payments, money(p.amount, p.currency));
  for (const b of ota)
    if (b.status !== "annulee") addTo(collectedBy.ota, money(b.price, b.currency));
  for (const s of sales)
    addTo(collectedBy.manuel, money(Number(s.amount_total) / SALES_MINOR_UNIT, s.currency));
  const collected: CurrencyTotals = {};
  for (const t of Object.values(collectedBy))
    for (const [cur, v] of Object.entries(t)) collected[cur] = (collected[cur] ?? 0) + v;

  const openQuotes: OpenQuote[] = [];
  const openRemaining: CurrencyTotals = {};
  for (const q of quotes) {
    if (!OPEN_QUOTE_STATUSES.has(q.status) || q.paid_at) continue;
    const cur = (q.currency ?? "BRL").toUpperCase();
    let paid = 0;
    const other: CurrencyTotals = {};
    for (const p of payments) {
      if (p.quote_id !== q.id) continue;
      const pc = p.currency.toUpperCase();
      if (pc === cur) paid += Number(p.amount);
      else other[pc] = (other[pc] ?? 0) + Number(p.amount);
    }
    const total = Number(q.total_amount ?? 0);
    const remaining = Math.max(0, total - paid);
    if (remaining <= 0) continue;
    openRemaining[cur] = (openRemaining[cur] ?? 0) + remaining;
    openQuotes.push({
      id: q.id,
      label: q.number ?? q.reference ?? "—",
      title: q.title,
      status: q.status,
      currency: cur,
      total,
      paid,
      remaining,
      otherCurrencyPaid: other,
      period_start: q.period_start,
    });
  }
  openQuotes.sort((a, b) => (a.period_start ?? "9").localeCompare(b.period_start ?? "9"));

  /* Prochain événement : tour, voyage, devis daté, rendez-vous */
  const today = todayInRio(now);
  const upcoming: Upcoming[] = [];
  const addUpcoming = (u: Omit<Upcoming, "ts" | "day">) => {
    const s = stampOf(u.at);
    if (Number.isNaN(s.ts)) return;
    if (s.day ? s.day < today : s.ts < now - 3 * 3_600_000) return;
    upcoming.push({ ...u, ts: s.ts, day: s.day });
  };
  for (const b of ota)
    if (b.start_at && b.status !== "annulee")
      addUpcoming({
        key: `ota-${b.id}`,
        title: b.activity_title ?? "Activité",
        detail: join(
          PLATFORM_LABELS[b.platform] ?? b.platform,
          b.participants ? `${b.participants} pers.` : null,
        ),
        at: b.start_at,
        link: { to: "/distribution" },
      });
  for (const t of trips)
    if (t.start_date && t.status !== "cancelled")
      addUpcoming({
        key: `trip-${t.id}`,
        title: t.title,
        detail: join(`Voyage ${t.reference ?? ""}`.trim(), fmtRange(t.start_date, t.end_date)),
        at: t.start_date,
        link: { to: "/voyages/$id", id: t.id },
      });
  for (const q of quotes)
    if (q.period_start && (DATED_QUOTE_STATUSES.has(q.status) || q.status === "sent"))
      addUpcoming({
        key: `quote-${q.id}`,
        title: q.title,
        detail: join(
          `${quoteLabel(q)} (${quoteStatus(q.status).toLowerCase()})`,
          fmtRange(q.period_start, q.period_end),
        ),
        at: q.period_start,
        link: { to: "/devis/$id", id: q.id },
      });
  for (const e of events)
    addUpcoming({
      key: `cal-${e.id}`,
      title: e.title,
      detail: join("Rendez-vous", e.location),
      at: e.starts_at,
      link: { to: "/calendrier" },
    });
  upcoming.sort((a, b) => a.ts - b.ts);

  /* Dernière activité : élément passé le plus récent (hors création de la fiche) */
  const last = items.find((it) => it.ts <= now && it.key !== "fiche");
  const fiche = items.find((it) => it.key === "fiche");
  const lastSource = last ?? fiche;
  const lastActivity = lastSource
    ? { ts: lastSource.ts, at: lastSource.at, day: lastSource.day, title: lastSource.title }
    : null;

  /* Langue : réservation plateforme, sinon langue des devis / factures */
  const otaLang = ota.find((b) => b.lead_language)?.lead_language;
  const docLang = [...quotes, ...invoices].find((d) => d.language)?.language;
  const language = otaLang
    ? { label: otaLang, from: "réservation plateforme" }
    : docLang
      ? { label: LANGUAGE_LABELS[docLang] ?? docLang, from: "langue des devis" }
      : null;

  return {
    items,
    collected,
    collectedBy,
    openQuotes,
    openRemaining,
    upcoming,
    lastActivity,
    language,
  };
}

/* ---------- Chronologie partenaire ---------- */

export function buildPartnerTimeline(p: Partner, raw: PartnerTimelineRaw): TimelineItem[] {
  const items: TimelineItem[] = [];
  const add = (it: ItemInput) => pushItem(items, it);

  if (p.submitted_at)
    add({ key: "submitted", kind: "note", at: p.submitted_at, title: "Candidature reçue" });
  add({ key: "created", kind: "note", at: p.created_at, title: "Fiche partenaire créée" });
  if (p.last_contact_at)
    add({ key: "last-contact", kind: "note", at: p.last_contact_at, title: "Dernier contact" });
  if (p.next_action_at)
    add({
      key: "next-action",
      kind: "note",
      at: p.next_action_at,
      title: `Prochaine action${p.next_action ? ` : ${p.next_action}` : ""}`,
    });

  for (const t of raw.tasks) add(taskItem(t));

  for (const s of raw.sales) {
    const ev = s.events?.name ?? "Événement";
    const link: TimelineLink = { to: "/evenements", id: s.event_id };
    add({
      key: `sale-${s.id}`,
      kind: "vente",
      at: s.created_at,
      title: `Ventes enregistrées — ${ev}`,
      detail: join(
        `${s.tickets} billet${s.tickets > 1 ? "s" : ""}`,
        Number(s.vip_revenue) ? `VIP ${Number(s.vip_revenue).toLocaleString("fr-FR")}` : null,
        s.note,
      ),
      link,
    });
    if (s.updated_at && Date.parse(s.updated_at) - Date.parse(s.created_at) > 60_000)
      add({
        key: `sale-u-${s.id}`,
        kind: "vente",
        at: s.updated_at,
        title: `Ventes mises à jour — ${ev}`,
        detail: `${s.tickets} billet${s.tickets > 1 ? "s" : ""}`,
        link,
      });
    if (s.paid_at)
      add({
        key: `sale-p-${s.id}`,
        kind: "vente",
        at: s.paid_at,
        title: `Commission payée — ${ev}`,
        link,
      });
  }

  for (const c of raw.codes)
    add({
      key: `code-${c.id}`,
      kind: "vente",
      at: c.created_at,
      title: `Code promo ${c.code} créé`,
      detail: join(
        c.events?.name ?? null,
        `−${Number(c.discount_pct)} %`,
        c.platform,
        `${c.uses} util.`,
        c.paid ? "commission payée" : null,
      ),
      link: { to: "/evenements", id: c.event_id },
    });

  for (const pay of raw.payments)
    add({
      key: `pay-${pay.id}`,
      kind: "paiement",
      at: pay.paid_at,
      title: `Paiement enregistré${pay.kind ? ` — ${PAYMENT_KIND_LABELS[pay.kind] ?? pay.kind}` : ""}`,
      detail: join(pay.method, pay.reference, pay.notes),
      amount: money(pay.amount, pay.currency),
      link: pay.quote_id
        ? { to: "/devis/$id", id: pay.quote_id }
        : pay.event_id
          ? { to: "/evenements", id: pay.event_id }
          : { to: "/finances" },
    });

  return items.sort((a, b) => b.ts - a.ts || a.key.localeCompare(b.key));
}

/* ---------- Liens externes 1 clic ---------- */

/** Numéro pour wa.me : +indicatif conservé, 0X XX XX XX XX → France, DDD + numéro → Brésil. */
export function waDigits(phone: string | null | undefined) {
  const raw = (phone ?? "").trim();
  let d = phoneDigits(raw);
  if (!d) return null;
  if (raw.startsWith("+")) return d;
  if (d.startsWith("00")) return d.slice(2);
  if (d.length === 10 && d.startsWith("0")) return `33${d.slice(1)}`;
  if ((d.length === 10 || d.length === 11) && !d.startsWith("0")) d = `55${d}`;
  return d;
}

export function whatsappLink(phone: string | null | undefined, text?: string) {
  const d = waDigits(phone);
  if (!d) return null;
  return `https://wa.me/${d}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function gmailComposeLink(opts: {
  to: string;
  subject?: string;
  body?: string;
  account?: string;
}) {
  const params = [
    `authuser=${encodeURIComponent(opts.account ?? CLIENT_INBOX_ACCOUNT)}`,
    "view=cm",
    "fs=1",
    `to=${encodeURIComponent(opts.to)}`,
    opts.subject ? `su=${encodeURIComponent(opts.subject)}` : null,
    opts.body ? `body=${encodeURIComponent(opts.body)}` : null,
  ].filter(Boolean);
  return `https://mail.google.com/mail/?${params.join("&")}`;
}

export function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

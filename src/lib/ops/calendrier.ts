import { supabase } from "@/integrations/supabase/client";

/*
 * Calendrier unifié : agrège tout ce qui porte une date (réservations OTA,
 * voyages, devis, événements, billetterie, éditorial, WhatsApp, tâches,
 * rendez-vous manuels). Une requête par source, bornée à la période affichée.
 * Toutes les dates sont raisonnées dans le fuseau America/Sao_Paulo.
 */

// Tables récentes : typage souple, les types générés restent la référence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

/* ---------- Fuseau et clés de jour (YYYY-MM-DD) ---------- */

export const TZ = "America/Sao_Paulo";

const keyFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const timeFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
});
const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** Jour (YYYY-MM-DD) d'un instant, dans le fuseau de Rio. */
export function dayKey(d: Date | string): string {
  return keyFmt.format(typeof d === "string" ? new Date(d) : d);
}

export function todayKey() {
  return dayKey(new Date());
}

/** Heure HH:MM d'un instant, dans le fuseau de Rio. */
export function timeOf(iso: string): string {
  return timeFmt.format(new Date(iso));
}

function parseKey(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

/** Date UTC « neutre » pour l'arithmétique de calendrier sur une clé de jour. */
export function keyToUtcDate(key: string) {
  const { y, m, d } = parseKey(key);
  return new Date(Date.UTC(y, m - 1, d));
}

function utcDateToKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function addDays(key: string, n: number) {
  const d = keyToUtcDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return utcDateToKey(d);
}

export function addMonths(key: string, n: number) {
  const { y, m } = parseKey(key);
  return utcDateToKey(new Date(Date.UTC(y, m - 1 + n, 1)));
}

export function startOfMonth(key: string) {
  return key.slice(0, 8) + "01";
}

/** Lundi de la semaine contenant ce jour. */
export function mondayOf(key: string) {
  const dow = (keyToUtcDate(key).getUTCDay() + 6) % 7;
  return addDays(key, -dow);
}

export function diffDays(a: string, b: string) {
  return Math.round((keyToUtcDate(b).getTime() - keyToUtcDate(a).getTime()) / 86_400_000);
}

function tzOffsetMs(utcMs: number) {
  const p = Object.fromEntries(
    partsFmt.formatToParts(new Date(utcMs)).map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Instant ISO correspondant à « jour + heure locale » à Rio. */
export function zonedToIso(key: string, time = "00:00"): string {
  const { y, m, d } = parseKey(key);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh || 0, mm || 0);
  let ts = guess - tzOffsetMs(guess);
  ts = guess - tzOffsetMs(ts); // second passage si changement d'heure
  return new Date(ts).toISOString();
}

export function fmtDayLong(key: string) {
  return keyToUtcDate(key).toLocaleDateString("fr-FR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export function fmtDayShort(key: string) {
  return keyToUtcDate(key).toLocaleDateString("fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
  });
}

/* ---------- Modèle commun ---------- */

export type CalendarSource =
  "ota" | "trip" | "quote" | "event" | "lot" | "editorial" | "whatsapp" | "task" | "manual";

export const CALENDAR_SOURCES: CalendarSource[] = [
  "manual",
  "ota",
  "trip",
  "quote",
  "event",
  "lot",
  "editorial",
  "whatsapp",
  "task",
];

export type SourceLink =
  | { kind: "client"; id: string }
  | { kind: "trip"; id: string }
  | { kind: "quote"; id: string }
  | { kind: "event"; id: string }
  | { kind: "page"; to: "/distribution" | "/contenus" | "/whatsapp" | "/a-valider" };

export type CalendarItem = {
  /** Identifiant unique dans le calendrier (source + id). */
  key: string;
  source: CalendarSource;
  title: string;
  subtitle?: string | null;
  /** Premier et dernier jour (inclus), clés YYYY-MM-DD. */
  start: string;
  end: string;
  /** Heure de début HH:MM, null si journée entière / plage. */
  time: string | null;
  endTime?: string | null;
  /** Tri à l'intérieur d'un jour. */
  sortAt: string;
  status?: string | null;
  /** Élément « provisoire » (devis, lots de billetterie) : rendu discret. */
  tentative?: boolean;
  details: { label: string; value: string }[];
  link: SourceLink | null;
  /** Rendez-vous manuel éditable. */
  manual?: CalendarEventRow;
};

export type CalendarRange = { from: string; to: string }; // to exclusif

export type SourceResult = { source: CalendarSource; items: CalendarItem[]; error?: string };

/* ---------- Libellés ---------- */

const TRIP_STATUS: Record<string, string> = {
  draft: "Brouillon",
  confirmed: "Confirmé",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};
const QUOTE_STATUS: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  refused: "Refusé",
  paid: "Payé",
  ready: "Prêt",
  expired: "Expiré",
};
const OTA_STATUS: Record<string, string> = {
  confirmee: "Confirmée",
  modifiee: "Modifiée",
  realisee: "Réalisée",
  no_show: "No-show",
};
const EVENT_STATUS: Record<string, string> = {
  planifie: "Planifié",
  en_vente: "En vente",
  termine: "Terminé",
};
const EDITORIAL_STATUS: Record<string, string> = {
  idee: "Idée",
  planifie: "Planifié",
  en_production: "En production",
  publie: "Publié",
};
const EDITORIAL_KIND: Record<string, string> = {
  article: "Article",
  newsletter: "Newsletter",
  partenaire: "Partenaire",
  reportage: "Reportage",
};
const WA_STATUS: Record<string, string> = {
  brouillon: "Brouillon",
  valide: "Validé",
  envoye: "Envoyé",
  erreur: "Erreur",
};
const WA_SLOT: Record<string, string> = {
  info_du_jour: "Info du jour",
  bon_plan: "Bon plan",
  sortie: "Sortie",
  extra: "Extra",
};
const TASK_STATUS: Record<string, string> = { a_valider: "À valider", valide: "Validée" };

export const MANUAL_KINDS: { value: string; label: string }[] = [
  { value: "meeting", label: "Rendez-vous" },
  { value: "call", label: "Appel" },
  { value: "tournage", label: "Tournage" },
  { value: "reperage", label: "Repérage" },
  { value: "perso", label: "Personnel" },
  { value: "autre", label: "Autre" },
];
export const MANUAL_KIND_LABEL: Record<string, string> = Object.fromEntries(
  MANUAL_KINDS.map((k) => [k.value, k.label]),
);

const lbl = (map: Record<string, string>, v: string | null | undefined) =>
  v ? (map[v] ?? v) : "—";

function money(value: number | null | undefined, currency: string | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return null;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currency || "BRL",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function compact(details: { label: string; value: string | null | undefined }[]) {
  return details.filter((d): d is { label: string; value: string } => !!d.value);
}

/** Dernier jour d'un intervalle d'instants (fin exclusive à minuit = veille). */
export function endKeyOf(startIso: string, endIso: string | null) {
  if (!endIso || endIso <= startIso) return dayKey(startIso);
  return dayKey(new Date(new Date(endIso).getTime() - 1));
}

const q = (v: string) => `"${v}"`;

/* ---------- Sources ---------- */

type Bounds = {
  from: string;
  last: string;
  fromIso: string;
  toIso: string;
};

async function fetchOta(b: Bounds): Promise<CalendarItem[]> {
  const rows: {
    id: string;
    platform: string;
    booking_ref: string;
    activity_title: string | null;
    start_at: string;
    participants: number | null;
    participants_detail: string | null;
    lead_name: string | null;
    lead_phone: string | null;
    activity_language: string | null;
    price: number | null;
    currency: string | null;
    status: string;
    client_id: string | null;
  }[] = check(
    await db
      .from("ota_bookings")
      .select(
        "id,platform,booking_ref,activity_title,start_at,participants,participants_detail,lead_name,lead_phone,activity_language,price,currency,status,client_id",
      )
      .gte("start_at", b.fromIso)
      .lt("start_at", b.toIso)
      .neq("status", "annulee")
      .order("start_at"),
  );
  return rows.map((r) => {
    const pax = r.participants ? `${r.participants} pers.` : null;
    return {
      key: `ota:${r.id}`,
      source: "ota",
      title: r.activity_title || "Réservation GetYourGuide",
      subtitle: [r.lead_name, pax].filter(Boolean).join(" · ") || null,
      start: dayKey(r.start_at),
      end: dayKey(r.start_at),
      time: timeOf(r.start_at),
      sortAt: r.start_at,
      status: lbl(OTA_STATUS, r.status),
      details: compact([
        { label: "Référence", value: r.booking_ref },
        { label: "Client", value: r.lead_name },
        { label: "Participants", value: r.participants_detail || pax },
        { label: "Téléphone", value: r.lead_phone },
        { label: "Langue", value: r.activity_language },
        { label: "Montant", value: money(r.price, r.currency) },
      ]),
      link: r.client_id
        ? { kind: "client", id: r.client_id }
        : { kind: "page", to: "/distribution" },
    } satisfies CalendarItem;
  });
}

type TripRow = {
  id: string;
  reference: string;
  title: string;
  status: string;
  start_date: string;
  end_date: string | null;
  party_size: number | null;
  quote_id: string | null;
  clients: { full_name: string } | null;
};

async function fetchTrips(b: Bounds): Promise<{ items: CalendarItem[]; quoteIds: Set<string> }> {
  const rows: TripRow[] = check(
    await db
      .from("trips")
      .select(
        "id,reference,title,status,start_date,end_date,party_size,quote_id,clients(full_name)",
      )
      .neq("status", "cancelled")
      .not("start_date", "is", null)
      .lte("start_date", b.last)
      .or(`end_date.gte.${b.from},and(end_date.is.null,start_date.gte.${b.from})`)
      .order("start_date"),
  );
  const quoteIds = new Set(rows.map((r) => r.quote_id).filter((x): x is string => !!x));
  const items = rows.map((r) => {
    const end = r.end_date && r.end_date >= r.start_date ? r.end_date : r.start_date;
    const nights = diffDays(r.start_date, end);
    return {
      key: `trip:${r.id}`,
      source: "trip",
      title: r.title,
      subtitle: [r.clients?.full_name, r.party_size ? `${r.party_size} pers.` : null]
        .filter(Boolean)
        .join(" · "),
      start: r.start_date,
      end,
      time: null,
      sortAt: r.start_date,
      status: lbl(TRIP_STATUS, r.status),
      details: compact([
        { label: "Référence", value: r.reference },
        { label: "Client", value: r.clients?.full_name },
        { label: "Dates", value: `${fmtDayShort(r.start_date)} → ${fmtDayShort(end)}` },
        { label: "Durée", value: nights > 0 ? `${nights + 1} jours` : "1 jour" },
        { label: "Voyageurs", value: r.party_size ? String(r.party_size) : null },
      ]),
      link: { kind: "trip", id: r.id },
    } satisfies CalendarItem;
  });
  return { items, quoteIds };
}

type QuoteRow = {
  id: string;
  reference: string;
  number: string | null;
  title: string;
  status: string;
  period_start: string | null;
  period_end: string | null;
  valid_until: string | null;
  party_size: number | null;
  total_amount: number | null;
  currency: string;
  clients: { full_name: string } | null;
};

async function fetchQuotes(b: Bounds): Promise<QuoteRow[]> {
  return check(
    await db
      .from("quotes")
      .select(
        "id,reference,number,title,status,period_start,period_end,valid_until,party_size,total_amount,currency,clients(full_name)",
      )
      .in("status", ["draft", "sent", "accepted", "paid", "ready"])
      .or(
        [
          `and(period_start.lte.${b.last},period_end.gte.${b.from})`,
          `and(period_end.is.null,period_start.gte.${b.from},period_start.lte.${b.last})`,
          `and(status.eq.sent,valid_until.gte.${b.from},valid_until.lte.${b.last})`,
        ].join(","),
      )
      .order("period_start"),
  );
}

function quoteItems(rows: QuoteRow[], tripQuoteIds: Set<string>, b: Bounds): CalendarItem[] {
  const out: CalendarItem[] = [];
  for (const r of rows) {
    const ref = r.number || r.reference;
    const base = {
      source: "quote" as const,
      status: lbl(QUOTE_STATUS, r.status),
      tentative: true,
      link: { kind: "quote", id: r.id } as SourceLink,
    };
    const details = compact([
      { label: "Référence", value: ref },
      { label: "Client", value: r.clients?.full_name },
      { label: "Montant", value: money(r.total_amount, r.currency) },
      { label: "Voyageurs", value: r.party_size ? String(r.party_size) : null },
      {
        label: "Période",
        value: r.period_start
          ? `${fmtDayShort(r.period_start)} → ${fmtDayShort(r.period_end || r.period_start)}`
          : null,
      },
      { label: "Valable jusqu'au", value: r.valid_until ? fmtDayShort(r.valid_until) : null },
    ]);
    // Le voyage issu de ce devis est déjà affiché : pas de doublon.
    if (r.period_start && !tripQuoteIds.has(r.id)) {
      const end = r.period_end && r.period_end >= r.period_start ? r.period_end : r.period_start;
      if (r.period_start <= b.last && end >= b.from) {
        out.push({
          ...base,
          key: `quote:${r.id}`,
          title: r.title,
          subtitle: [r.clients?.full_name, ref].filter(Boolean).join(" · "),
          start: r.period_start,
          end,
          time: null,
          sortAt: r.period_start,
          details,
        });
      }
    }
    if (
      r.status === "sent" &&
      r.valid_until &&
      r.valid_until >= b.from &&
      r.valid_until <= b.last
    ) {
      out.push({
        ...base,
        key: `quote-exp:${r.id}`,
        title: `Expiration devis · ${r.title}`,
        subtitle: [r.clients?.full_name, ref].filter(Boolean).join(" · "),
        start: r.valid_until,
        end: r.valid_until,
        time: null,
        sortAt: r.valid_until,
        tentative: false,
        details,
      });
    }
  }
  return out;
}

async function fetchEvents(b: Bounds): Promise<CalendarItem[]> {
  const rows: {
    id: string;
    name: string;
    edition: string | null;
    starts_at: string;
    ends_at: string | null;
    venue: string | null;
    neighborhood: string | null;
    status: string;
    capacity: number | null;
  }[] = check(
    await db
      .from("events")
      .select("id,name,edition,starts_at,ends_at,venue,neighborhood,status,capacity")
      .neq("status", "annule")
      .lt("starts_at", b.toIso)
      .or(`ends_at.gte.${q(b.fromIso)},and(ends_at.is.null,starts_at.gte.${q(b.fromIso)})`)
      .order("starts_at"),
  );
  return rows.map((r) => {
    const long =
      r.ends_at && new Date(r.ends_at).getTime() - new Date(r.starts_at).getTime() > 86_400_000;
    const place = [r.venue, r.neighborhood].filter(Boolean).join(", ");
    return {
      key: `event:${r.id}`,
      source: "event",
      title: [r.name, r.edition].filter(Boolean).join(" — "),
      subtitle: place || null,
      start: dayKey(r.starts_at),
      end: long ? endKeyOf(r.starts_at, r.ends_at) : dayKey(r.starts_at),
      time: long ? null : timeOf(r.starts_at),
      endTime: r.ends_at ? timeOf(r.ends_at) : null,
      sortAt: r.starts_at,
      status: lbl(EVENT_STATUS, r.status),
      details: compact([
        { label: "Lieu", value: place },
        {
          label: "Horaires",
          value: `${timeOf(r.starts_at)}${r.ends_at ? ` → ${timeOf(r.ends_at)}` : ""}`,
        },
        { label: "Capacité", value: r.capacity ? String(r.capacity) : null },
      ]),
      link: { kind: "event", id: r.id },
    } satisfies CalendarItem;
  });
}

async function fetchLots(b: Bounds): Promise<CalendarItem[]> {
  const rows: {
    id: string;
    name: string;
    price: number;
    quantity: number | null;
    sales_start: string;
    sales_end: string | null;
    event_id: string;
    events: { name: string; status: string; starts_at: string; currency: string } | null;
  }[] = check(
    await db
      .from("event_ticket_lots")
      .select(
        "id,name,price,quantity,sales_start,sales_end,event_id,events(name,status,starts_at,currency)",
      )
      .not("sales_start", "is", null)
      .lte("sales_start", b.last)
      .or(`sales_end.gte.${b.from},sales_end.is.null`)
      .order("sales_start"),
  );
  return rows
    .filter((r) => r.events?.status !== "annule")
    .map((r) => {
      const fallbackEnd = r.events?.starts_at ? dayKey(r.events.starts_at) : r.sales_start;
      const rawEnd = r.sales_end || fallbackEnd;
      const end = rawEnd >= r.sales_start ? rawEnd : r.sales_start;
      return {
        key: `lot:${r.id}`,
        source: "lot",
        title: `${r.name} · ${r.events?.name ?? "Billetterie"}`,
        subtitle: money(r.price, r.events?.currency),
        start: r.sales_start,
        end,
        time: null,
        sortAt: r.sales_start,
        tentative: true,
        details: compact([
          { label: "Événement", value: r.events?.name },
          { label: "Prix", value: money(r.price, r.events?.currency) },
          { label: "Quantité", value: r.quantity ? String(r.quantity) : null },
          {
            label: "Vente",
            value: `${fmtDayShort(r.sales_start)} → ${r.sales_end ? fmtDayShort(r.sales_end) : "jour J"}`,
          },
        ]),
        link: { kind: "event", id: r.event_id },
      } satisfies CalendarItem;
    })
    .filter((it) => it.end >= b.from);
}

async function fetchEditorial(b: Bounds): Promise<CalendarItem[]> {
  const rows: {
    id: string;
    title: string;
    kind: string;
    owner: string | null;
    status: string;
    planned_at: string | null;
    deadline: string | null;
    channel: string | null;
    collection: string | null;
    priority: string | null;
  }[] = check(
    await db
      .from("editorial_items")
      .select("id,title,kind,owner,status,planned_at,deadline,channel,collection,priority")
      .or(
        [
          `and(planned_at.gte.${q(b.fromIso)},planned_at.lt.${q(b.toIso)})`,
          `and(planned_at.is.null,deadline.gte.${b.from},deadline.lte.${b.last})`,
        ].join(","),
      )
      .order("planned_at"),
  );
  return rows.map((r) => {
    const day = r.planned_at ? dayKey(r.planned_at) : (r.deadline as string);
    return {
      key: `editorial:${r.id}`,
      source: "editorial",
      title: r.title,
      subtitle: [lbl(EDITORIAL_KIND, r.kind), r.owner].filter(Boolean).join(" · "),
      start: day,
      end: day,
      time: r.planned_at ? timeOf(r.planned_at) : null,
      sortAt: r.planned_at ?? day,
      status: lbl(EDITORIAL_STATUS, r.status),
      details: compact([
        { label: "Type", value: lbl(EDITORIAL_KIND, r.kind) },
        { label: "Responsable", value: r.owner },
        { label: "Canal", value: r.channel },
        { label: "Collection", value: r.collection },
        { label: "Priorité", value: r.priority },
        { label: "Échéance", value: r.deadline ? fmtDayShort(r.deadline) : null },
      ]),
      link: { kind: "page", to: "/contenus" },
    } satisfies CalendarItem;
  });
}

async function fetchWhatsapp(b: Bounds): Promise<CalendarItem[]> {
  const rows: { id: string; scheduled_at: string; slot: string; status: string }[] = check(
    await db
      .from("whatsapp_posts")
      .select("id,scheduled_at,slot,status")
      .gte("scheduled_at", b.fromIso)
      .lt("scheduled_at", b.toIso)
      .neq("status", "annule")
      .order("scheduled_at"),
  );
  // Regroupés par jour : « 3 posts WhatsApp ».
  const byDay = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = dayKey(r.scheduled_at);
    byDay.set(k, [...(byDay.get(k) ?? []), r]);
  }
  return Array.from(byDay.entries()).map(([day, posts]) => {
    const toValidate = posts.filter((p) => p.status === "brouillon").length;
    const errors = posts.filter((p) => p.status === "erreur").length;
    return {
      key: `whatsapp:${day}`,
      source: "whatsapp",
      title: `${posts.length} post${posts.length > 1 ? "s" : ""} WhatsApp`,
      subtitle:
        [toValidate ? `${toValidate} à valider` : null, errors ? `${errors} en erreur` : null]
          .filter(Boolean)
          .join(" · ") || null,
      start: day,
      end: day,
      time: timeOf(posts[0].scheduled_at),
      sortAt: posts[0].scheduled_at,
      details: posts.map((p) => ({
        label: `${timeOf(p.scheduled_at)} · ${lbl(WA_SLOT, p.slot)}`,
        value: lbl(WA_STATUS, p.status),
      })),
      link: { kind: "page", to: "/whatsapp" },
    } satisfies CalendarItem;
  });
}

async function fetchTasks(b: Bounds): Promise<CalendarItem[]> {
  const rows: {
    id: string;
    kind: string;
    title: string;
    status: string;
    channel: string;
    due_at: string;
  }[] = check(
    await db
      .from("crm_tasks")
      .select("id,kind,title,status,channel,due_at")
      .in("status", ["a_valider", "valide"])
      .gte("due_at", b.fromIso)
      .lt("due_at", b.toIso)
      .order("due_at"),
  );
  return rows.map(
    (r) =>
      ({
        key: `task:${r.id}`,
        source: "task",
        title: r.title,
        subtitle: r.channel,
        start: dayKey(r.due_at),
        end: dayKey(r.due_at),
        time: timeOf(r.due_at),
        sortAt: r.due_at,
        status: lbl(TASK_STATUS, r.status),
        details: compact([
          { label: "Canal", value: r.channel },
          { label: "Échéance", value: `${fmtDayShort(dayKey(r.due_at))} ${timeOf(r.due_at)}` },
        ]),
        link: { kind: "page", to: "/a-valider" },
      }) satisfies CalendarItem,
  );
}

/* ---------- Rendez-vous manuels (calendar_events) ---------- */

export type CalendarEventRow = {
  id: string;
  title: string;
  description: string | null;
  kind: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  location: string | null;
  related_trip_id: string | null;
};

async function fetchManual(b: Bounds): Promise<CalendarItem[]> {
  const rows: CalendarEventRow[] = check(
    await db
      .from("calendar_events")
      .select("id,title,description,kind,starts_at,ends_at,all_day,location,related_trip_id")
      .lt("starts_at", b.toIso)
      .or(`ends_at.gte.${q(b.fromIso)},and(ends_at.is.null,starts_at.gte.${q(b.fromIso)})`)
      .order("starts_at"),
  );
  return rows.map((r) => {
    const start = dayKey(r.starts_at);
    const end = endKeyOf(r.starts_at, r.ends_at);
    const multi = end !== start;
    return {
      key: `manual:${r.id}`,
      source: "manual",
      title: r.title,
      subtitle: r.location,
      start,
      end,
      time: r.all_day || multi ? null : timeOf(r.starts_at),
      endTime: !r.all_day && r.ends_at ? timeOf(r.ends_at) : null,
      sortAt: r.starts_at,
      status: lbl(MANUAL_KIND_LABEL, r.kind),
      details: compact([
        { label: "Type", value: lbl(MANUAL_KIND_LABEL, r.kind) },
        { label: "Lieu", value: r.location },
        {
          label: "Horaires",
          value: r.all_day
            ? multi
              ? `${fmtDayShort(start)} → ${fmtDayShort(end)}`
              : "Journée entière"
            : `${timeOf(r.starts_at)}${r.ends_at ? ` → ${timeOf(r.ends_at)}` : ""}`,
        },
        { label: "Notes", value: r.description },
      ]),
      link: r.related_trip_id ? { kind: "trip", id: r.related_trip_id } : null,
      manual: r,
    } satisfies CalendarItem;
  });
}

export type ManualEventInput = {
  title: string;
  kind: string;
  description: string | null;
  location: string | null;
  all_day: boolean;
  starts_at: string;
  ends_at: string | null;
};

export async function saveCalendarEvent(input: ManualEventInput & { id?: string }) {
  const { id, ...rest } = input;
  if (id) {
    check(await db.from("calendar_events").update(rest).eq("id", id));
    return;
  }
  const { data } = await supabase.auth.getUser();
  check(await db.from("calendar_events").insert({ ...rest, created_by: data.user?.id ?? null }));
}

export async function deleteCalendarEvent(id: string) {
  check(await db.from("calendar_events").delete().eq("id", id));
}

/* ---------- Agrégation ---------- */

async function settle(
  source: CalendarSource,
  run: () => Promise<CalendarItem[]>,
): Promise<SourceResult> {
  try {
    return { source, items: await run() };
  } catch (e) {
    return { source, items: [], error: (e as Error).message };
  }
}

export async function fetchCalendar(range: CalendarRange): Promise<SourceResult[]> {
  const b: Bounds = {
    from: range.from,
    last: addDays(range.to, -1),
    fromIso: zonedToIso(range.from),
    toIso: zonedToIso(range.to),
  };
  // Les devis dépendent des voyages (dédoublonnage) : on lance tout en parallèle
  // et on croise les résultats ensuite.
  const tripsP = fetchTrips(b);
  const quotesP = fetchQuotes(b);
  const [ota, trips, quotes, events, lots, editorial, whatsapp, tasks, manual] = await Promise.all([
    settle("ota", () => fetchOta(b)),
    settle("trip", async () => (await tripsP).items),
    settle("quote", async () => {
      const [rows, t] = await Promise.all([
        quotesP,
        tripsP.catch(() => ({ quoteIds: new Set<string>() })),
      ]);
      return quoteItems(rows, t.quoteIds, b);
    }),
    settle("event", () => fetchEvents(b)),
    settle("lot", () => fetchLots(b)),
    settle("editorial", () => fetchEditorial(b)),
    settle("whatsapp", () => fetchWhatsapp(b)),
    settle("task", () => fetchTasks(b)),
    settle("manual", () => fetchManual(b)),
  ]);
  return [manual, ota, trips, quotes, events, lots, editorial, whatsapp, tasks];
}

/** Éléments couvrant un jour donné, triés (plages d'abord, puis par heure). */
export function itemsOnDay(items: CalendarItem[], day: string) {
  return items.filter((it) => it.start <= day && it.end >= day).sort(compareItems);
}

export function compareItems(a: CalendarItem, b: CalendarItem) {
  const aSpan = a.time === null ? 0 : 1;
  const bSpan = b.time === null ? 0 : 1;
  if (aSpan !== bSpan) return aSpan - bSpan;
  if (a.time !== b.time) return (a.time ?? "").localeCompare(b.time ?? "");
  return a.sortAt.localeCompare(b.sortAt);
}

/** Libellé horaire d'un élément, vu depuis un jour donné. */
export function whenLabel(item: CalendarItem, day?: string) {
  if (item.time) return item.endTime ? `${item.time} → ${item.endTime}` : item.time;
  if (item.start === item.end) return "Journée";
  if (day && day > item.start && day < item.end) return `En cours · fin ${fmtDayShort(item.end)}`;
  if (day && day === item.end && day !== item.start) return "Dernier jour";
  return `${fmtDayShort(item.start)} → ${fmtDayShort(item.end)}`;
}

/** Plage (multi-jours ou journée entière) : affichée en barre. */
export function isBand(item: CalendarItem) {
  return item.time === null && item.end !== item.start;
}

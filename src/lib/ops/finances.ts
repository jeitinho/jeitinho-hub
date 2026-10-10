import { supabase } from "@/integrations/supabase/client";
import { RATES } from "@/lib/currency";
import { paymentBalance } from "./payments-rules";

/*
 * Module Finances : CA encaissé par pôle, séparé par devise (pas de conversion
 * stockée en base). Sources :
 *  - Conciergerie : payments (acomptes / soldes liés aux devis, voyages, clients)
 *  - GetYourGuide : ota_bookings (statut ≠ annulee), daté au jour de l'activité
 *  - Manuel       : sales (Stripe, montants en centimes)
 *  - Événements   : event_settlements (bilan) sinon dernier relevé event_ticket_counts,
 *                   sinon payments rattachés à l'événement ; daté au jour de la soirée
 * Lecture via RLS (can_manage).
 */

// Tables récentes : typage souple, les types générés restent la référence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

/** sales.amount_total / commission_amount : entiers Stripe (centimes, devise en minuscules). */
const SALES_MINOR_UNIT = 100;

export const TZ = "America/Sao_Paulo";
// Rio/São Paulo : UTC−3 sans heure d'été depuis 2019.
const TZ_OFFSET = "-03:00";

export type Pole = "conciergerie" | "gyg" | "manuel" | "evenements";
export const POLES: Pole[] = ["conciergerie", "gyg", "manuel", "evenements"];
export const POLE_LABELS: Record<Pole, string> = {
  conciergerie: "Conciergerie (devis)",
  gyg: "GetYourGuide",
  manuel: "Manuel",
  evenements: "Événements",
};
export const POLE_COLORS: Record<Pole, string> = {
  conciergerie: "bg-primary",
  gyg: "bg-amber-500",
  manuel: "bg-sky-500",
  evenements: "bg-rose-500",
};

export type ObjectLink =
  | { kind: "devis"; id: string }
  | { kind: "client"; id: string }
  | { kind: "voyage"; id: string }
  | { kind: "evenement"; id: string }
  | { kind: "manuel" }
  | { kind: "distribution" };

export type Receipt = {
  id: string;
  pole: Pole;
  date: string; // ISO (date ou timestamp)
  month: string; // YYYY-MM, fuseau Rio
  amount: number;
  currency: string;
  label: string;
  detail: string | null;
  link: ObjectLink | null;
  provisional?: boolean;
  ts: number; // tri
};

function tsOf(iso: string) {
  return Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00${TZ_OFFSET}` : iso);
}

/* ---------- Mois ---------- */

const monthFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
});

export function monthOf(iso: string): string {
  // Colonne date (YYYY-MM-DD) : pas de conversion de fuseau.
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso.slice(0, 7);
  return monthFmt.format(new Date(iso)).slice(0, 7);
}

export function currentMonth(): string {
  return monthOf(new Date().toISOString());
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Les 12 mois se terminant par `last` (inclus), du plus ancien au plus récent. */
export function monthWindow(last: string, size = 12): string[] {
  return Array.from({ length: size }, (_, i) => shiftMonth(last, i - size + 1));
}

export function monthLabel(month: string, style: "long" | "short" = "long"): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("fr-FR", {
    month: style,
    year: style === "long" ? "numeric" : "2-digit",
    timeZone: "UTC",
  });
}

const monthStartIso = (month: string) =>
  new Date(`${month}-01T00:00:00${TZ_OFFSET}`).toISOString().replace(".000Z", "Z");

/* ---------- Encaissements ---------- */

type PaymentRow = {
  id: string;
  paid_at: string;
  amount: number;
  currency: string;
  kind: string;
  method: string | null;
  client_id: string | null;
  quote_id: string | null;
  trip_id: string | null;
  event_id: string | null;
  reference: string | null;
  quote: { reference: string; number: string | null; title: string } | null;
  client: { full_name: string | null } | null;
};

type SaleRow = {
  id: string;
  created_at: string;
  amount_total: number;
  currency: string;
  customer_email: string | null;
  commission_amount: number;
  channel: { name: string } | null;
};

type OtaRow = {
  id: string;
  booking_ref: string;
  platform: string;
  client_id: string | null;
  activity_title: string | null;
  lead_name: string | null;
  start_at: string | null;
  created_at: string;
  price: number | null;
  currency: string | null;
};

type EventLite = {
  id: string;
  name: string;
  edition: string | null;
  starts_at: string;
  currency: string;
};
type SettlementLite = {
  event_id: string;
  ticket_revenue: number;
  vip_revenue: number;
  bar_revenue: number;
};
type CountLite = {
  event_id: string;
  channel: string;
  revenue: number | null;
  vip_revenue: number | null;
  recorded_at: string;
};

const PAYMENT_KIND: Record<string, string> = { acompte: "Acompte", solde: "Solde" };

function quoteLabel(q: { reference: string; number: string | null; title: string } | null) {
  if (!q) return null;
  return `Devis ${q.number ?? q.reference} · ${q.title}`;
}

export async function fetchReceipts(firstMonth: string, lastMonth: string): Promise<Receipt[]> {
  const fromDate = `${firstMonth}-01`;
  const toDate = `${shiftMonth(lastMonth, 1)}-01`;
  const fromIso = monthStartIso(firstMonth);
  const toIso = monthStartIso(shiftMonth(lastMonth, 1));

  const [payRes, saleRes, otaRes, evRes] = await Promise.all([
    db
      .from("payments")
      .select(
        "id,paid_at,amount,currency,kind,method,client_id,quote_id,trip_id,event_id,reference,quote:quotes(reference,number,title),client:clients(full_name)",
      )
      .gte("paid_at", fromDate)
      .lt("paid_at", toDate),
    db
      .from("sales")
      .select(
        "id,created_at,amount_total,currency,customer_email,commission_amount,channel:sales_channels(name)",
      )
      .gt("amount_total", 0)
      .gte("created_at", fromIso)
      .lt("created_at", toIso),
    db
      .from("ota_bookings")
      .select(
        "id,booking_ref,platform,client_id,activity_title,lead_name,start_at,created_at,price,currency",
      )
      .neq("status", "annulee")
      .or(
        `and(start_at.gte."${fromIso}",start_at.lt."${toIso}"),and(start_at.is.null,created_at.gte."${fromIso}",created_at.lt."${toIso}")`,
      ),
    db
      .from("events")
      .select("id,name,edition,starts_at,currency")
      .neq("status", "annule")
      .gte("starts_at", fromIso)
      .lt("starts_at", toIso),
  ]);
  const payments = check<PaymentRow[]>(payRes);
  const sales = check<SaleRow[]>(saleRes);
  const ota = check<OtaRow[]>(otaRes);
  const events = check<EventLite[]>(evRes);

  const eventIds = [
    ...new Set([
      ...events.map((e) => e.id),
      ...payments.flatMap((p) => (p.event_id ? [p.event_id] : [])),
    ]),
  ];
  let settlements: SettlementLite[] = [];
  let counts: CountLite[] = [];
  if (eventIds.length) {
    const [sRes, cRes] = await Promise.all([
      db
        .from("event_settlements")
        .select("event_id,ticket_revenue,vip_revenue,bar_revenue")
        .in("event_id", eventIds),
      db
        .from("event_ticket_counts")
        .select("event_id,channel,revenue,vip_revenue,recorded_at")
        .in("event_id", eventIds)
        .order("recorded_at", { ascending: false }),
    ]);
    settlements = check<SettlementLite[]>(sRes);
    counts = check<CountLite[]>(cRes);
  }
  const settled = new Map(settlements.map((s) => [s.event_id, s]));
  // Relevés cumulés : on garde le dernier par canal.
  const countsByEvent = new Map<string, Map<string, CountLite>>();
  for (const c of counts) {
    const m = countsByEvent.get(c.event_id) ?? new Map<string, CountLite>();
    if (!m.has(c.channel)) m.set(c.channel, c);
    countsByEvent.set(c.event_id, m);
  }
  const hasEventFigures = (id: string) => settled.has(id) || countsByEvent.has(id);

  const out: Receipt[] = [];

  for (const p of payments) {
    const isEvent = !!p.event_id && !p.quote_id && !p.trip_id;
    // Pas de double comptage : un paiement d'événement ne compte que si la soirée n'a ni bilan ni relevé.
    if (isEvent && hasEventFigures(p.event_id!)) continue;
    const link: ObjectLink | null = p.quote_id
      ? { kind: "devis", id: p.quote_id }
      : p.trip_id
        ? { kind: "voyage", id: p.trip_id }
        : p.event_id
          ? { kind: "evenement", id: p.event_id }
          : p.client_id
            ? { kind: "client", id: p.client_id }
            : null;
    out.push({
      id: `pay-${p.id}`,
      pole: isEvent ? "evenements" : "conciergerie",
      date: p.paid_at,
      ts: tsOf(p.paid_at),
      month: monthOf(p.paid_at),
      amount: Number(p.amount),
      currency: p.currency.toUpperCase(),
      label: quoteLabel(p.quote) ?? p.client?.full_name ?? p.reference ?? "Encaissement",
      detail: [PAYMENT_KIND[p.kind] ?? p.kind, p.method, p.quote ? p.client?.full_name : null]
        .filter(Boolean)
        .join(" · "),
      link,
    });
  }

  for (const s of sales) {
    out.push({
      id: `sale-${s.id}`,
      pole: "manuel",
      date: s.created_at,
      ts: tsOf(s.created_at),
      month: monthOf(s.created_at),
      amount: Number(s.amount_total) / SALES_MINOR_UNIT,
      currency: s.currency.toUpperCase(),
      label: "Vente du Manuel",
      detail: [s.channel?.name, s.customer_email].filter(Boolean).join(" · ") || null,
      link: { kind: "manuel" },
    });
  }

  for (const b of ota) {
    if (b.price == null) continue;
    const date = b.start_at ?? b.created_at;
    out.push({
      id: `ota-${b.id}`,
      pole: "gyg",
      date,
      ts: tsOf(date),
      month: monthOf(date),
      amount: Number(b.price),
      currency: (b.currency ?? "BRL").toUpperCase(),
      label: b.activity_title ?? `Réservation ${b.booking_ref}`,
      detail: [b.platform, b.booking_ref, b.lead_name].filter(Boolean).join(" · "),
      link: b.client_id ? { kind: "client", id: b.client_id } : { kind: "distribution" },
    });
  }

  for (const e of events) {
    const s = settled.get(e.id);
    const latest = countsByEvent.get(e.id);
    let amount: number | null = null;
    let provisional = false;
    if (s) amount = Number(s.ticket_revenue) + Number(s.vip_revenue) + Number(s.bar_revenue);
    else if (latest) {
      amount = [...latest.values()].reduce(
        (sum, c) => sum + Number(c.revenue ?? 0) + Number(c.vip_revenue ?? 0),
        0,
      );
      provisional = true;
    }
    if (amount == null || amount === 0) continue;
    out.push({
      id: `evt-${e.id}`,
      pole: "evenements",
      date: e.starts_at,
      ts: tsOf(e.starts_at),
      month: monthOf(e.starts_at),
      amount,
      currency: e.currency.toUpperCase(),
      label: [e.name, e.edition].filter(Boolean).join(" — "),
      detail: s
        ? "Bilan : entrées + VIP + bar (CA brut)"
        : "Dernier relevé billetterie (provisoire)",
      link: { kind: "evenement", id: e.id },
      provisional,
    });
  }

  return out.sort((a, b) => b.ts - a.ts);
}

/* ---------- Agrégats ---------- */

export type CurrencyTotals = Record<string, number>;

export function sumByCurrency(rows: Receipt[]): CurrencyTotals {
  const t: CurrencyTotals = {};
  for (const r of rows) t[r.currency] = (t[r.currency] ?? 0) + r.amount;
  return t;
}

export function totalsByPole(rows: Receipt[]): Record<Pole, CurrencyTotals> {
  const out = Object.fromEntries(POLES.map((p) => [p, {} as CurrencyTotals])) as Record<
    Pole,
    CurrencyTotals
  >;
  for (const r of rows) out[r.pole][r.currency] = (out[r.pole][r.currency] ?? 0) + r.amount;
  return out;
}

const CURRENCY_ORDER = ["EUR", "BRL"];

export function sortedCurrencies(t: CurrencyTotals): string[] {
  return Object.keys(t)
    .filter((c) => t[c] !== 0)
    .sort((a, b) => {
      const ia = CURRENCY_ORDER.indexOf(a);
      const ib = CURRENCY_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
}

/**
 * Conversion indicative en EUR avec les taux d'affichage fixes de src/lib/currency.ts.
 * Renvoie null si une devise n'a pas de taux connu.
 */
export function toEurIndicative(t: CurrencyTotals): number | null {
  let sum = 0;
  for (const [cur, v] of Object.entries(t)) {
    const rate = (RATES as Record<string, number>)[cur];
    if (!rate) return null;
    sum += v / rate;
  }
  return sum;
}

export const BRL_PER_EUR = RATES.BRL;

/* ---------- Devis acceptés non payés ---------- */

export type OpenQuote = {
  id: string;
  label: string;
  title: string;
  client_id: string | null;
  client_name: string | null;
  currency: string;
  total: number;
  paid: number; // encaissé, dans la devise du devis (autres devises converties au taux indicatif)
  remaining: number;
  otherCurrencyPayments: CurrencyTotals; // encaissements dans une autre devise (convertis et déduits)
  unconvertedPayments: CurrencyTotals; // devises sans taux connu (non déduites, à vérifier)
  accepted_at: string | null;
  deposit_pct: number;
};

export async function fetchOpenQuotes(): Promise<OpenQuote[]> {
  const quotes = check<
    {
      id: string;
      reference: string;
      number: string | null;
      title: string;
      client_id: string | null;
      currency: string;
      total_amount: number;
      accepted_at: string | null;
      deposit_pct: number;
      client: { full_name: string | null } | null;
    }[]
  >(
    await db
      .from("quotes")
      .select(
        "id,reference,number,title,client_id,currency,total_amount,accepted_at,deposit_pct,client:clients(full_name)",
      )
      .eq("status", "accepted")
      .order("accepted_at", { ascending: true, nullsFirst: false }),
  );
  if (!quotes.length) return [];
  const pays = check<{ quote_id: string; amount: number; currency: string; kind: string }[]>(
    await db
      .from("payments")
      .select("quote_id,amount,currency,kind")
      .in(
        "quote_id",
        quotes.map((q) => q.id),
      ),
  );
  // Acompte / solde / total moins remboursements ; autres devises converties au taux fixe.
  // Un devis déjà soldé (reste 0) n'est plus « à encaisser ».
  return quotes
    .map((q) => {
      const b = paymentBalance(
        Number(q.total_amount),
        q.currency,
        pays.filter((p) => p.quote_id === q.id),
        RATES,
      );
      return {
        id: q.id,
        label: q.number ?? q.reference,
        title: q.title,
        client_id: q.client_id,
        client_name: q.client?.full_name ?? null,
        currency: b.currency,
        total: b.total,
        paid: b.paid,
        remaining: b.remaining,
        otherCurrencyPayments: b.otherCurrencies,
        unconvertedPayments: b.unconverted,
        accepted_at: q.accepted_at,
        deposit_pct: q.deposit_pct,
      };
    })
    .filter((q) => q.remaining > 0.01);
}

/* ---------- Commissions dues ---------- */

export type ChannelCommission = {
  channel_id: string;
  name: string;
  rate: number;
  currency: string;
  sales: number;
  revenue: number;
  commission: number;
  periodCommission: number;
};

export type RelayCommission = {
  id: string;
  event_id: string;
  event_label: string;
  partner_id: string | null;
  partner_name: string;
  tickets: number;
  currency: string;
  amount: number;
};

/**
 * Manuel : commissions non versées par canal revendeur (sales.commission_amount dont
 * commission_paid_at est vide — le versement se coche sur la page Manuel).
 * Événements : relais non payés (event_partner_sales.paid = false).
 */
export async function fetchCommissions(firstMonth: string, lastMonth: string) {
  const fromIso = monthStartIso(firstMonth);
  const toIso = monthStartIso(shiftMonth(lastMonth, 1));
  const [salesRes, chanRes, relayRes] = await Promise.all([
    db
      .from("sales")
      .select("channel_id,amount_total,currency,commission_amount,created_at")
      .gt("commission_amount", 0)
      .is("commission_paid_at", null),
    db.from("sales_channels").select("id,name,commission_rate"),
    db
      .from("event_partner_sales")
      .select(
        "id,event_id,partner_id,partner_name,tickets,vip_revenue,event:events(name,edition,currency,partner_ticket_commission,partner_vip_commission_pct)",
      )
      .eq("paid", false),
  ]);
  const sales = check<
    {
      channel_id: string | null;
      amount_total: number;
      currency: string;
      commission_amount: number;
      created_at: string;
    }[]
  >(salesRes);
  const channels = check<{ id: string; name: string; commission_rate: number }[]>(chanRes);
  const relays = check<
    {
      id: string;
      event_id: string;
      partner_id: string | null;
      partner_name: string;
      tickets: number;
      vip_revenue: number;
      event: {
        name: string;
        edition: string | null;
        currency: string;
        partner_ticket_commission: number;
        partner_vip_commission_pct: number;
      } | null;
    }[]
  >(relayRes);

  const byKey = new Map<string, ChannelCommission>();
  for (const s of sales) {
    const ch = channels.find((c) => c.id === s.channel_id);
    const cur = s.currency.toUpperCase();
    const key = `${s.channel_id ?? "none"}|${cur}`;
    const row = byKey.get(key) ?? {
      channel_id: s.channel_id ?? "",
      name: ch?.name ?? "Canal inconnu",
      rate: Number(ch?.commission_rate ?? 0),
      currency: cur,
      sales: 0,
      revenue: 0,
      commission: 0,
      periodCommission: 0,
    };
    row.sales += 1;
    row.revenue += Number(s.amount_total) / SALES_MINOR_UNIT;
    row.commission += Number(s.commission_amount) / SALES_MINOR_UNIT;
    const t = Date.parse(s.created_at);
    if (t >= Date.parse(fromIso) && t < Date.parse(toIso))
      row.periodCommission += Number(s.commission_amount) / SALES_MINOR_UNIT;
    byKey.set(key, row);
  }

  const relayRows: RelayCommission[] = relays
    .map((r) => {
      const e = r.event;
      const amount = e
        ? r.tickets * Number(e.partner_ticket_commission) +
          (Number(r.vip_revenue) * Number(e.partner_vip_commission_pct)) / 100
        : 0;
      return {
        id: r.id,
        event_id: r.event_id,
        event_label: e ? [e.name, e.edition].filter(Boolean).join(" — ") : "Événement",
        partner_id: r.partner_id,
        partner_name: r.partner_name,
        tickets: r.tickets,
        currency: (e?.currency ?? "BRL").toUpperCase(),
        amount,
      };
    })
    .filter((r) => r.amount > 0);

  return {
    channels: [...byKey.values()].sort((a, b) => b.commission - a.commission),
    relays: relayRows.sort((a, b) => b.amount - a.amount),
  };
}

/* ---------- Manuel : ventes et versement des commissions ---------- */

export type ManuelSale = {
  id: string;
  channel_id: string | null;
  customer_email: string | null;
  amount_total: number | null;
  currency: string | null;
  commission_rate: number | null;
  commission_amount: number | null;
  commission_paid_at: string | null;
  created_at: string;
};

export type ManuelChannel = {
  id: string;
  name: string;
  slug: string | null;
  commission_rate: number;
  active: boolean;
};

export async function fetchManuelSales() {
  const [sales, channels] = await Promise.all([
    db
      .from("sales")
      .select(
        "id,channel_id,customer_email,amount_total,currency,commission_rate,commission_amount,commission_paid_at,created_at",
      )
      .order("created_at", { ascending: false }),
    db.from("sales_channels").select("id,name,slug,commission_rate,active").order("name"),
  ]);
  return { sales: check<ManuelSale[]>(sales), channels: check<ManuelChannel[]>(channels) };
}

/**
 * Coche / décoche « Commission versée » sur une vente du Manuel.
 * Passe par la RPC set_sale_commission_paid (la table sales n'est pas modifiable en direct).
 */
export async function setSaleCommissionPaid(id: string, paid: boolean) {
  const res = await db.rpc("set_sale_commission_paid", { p_sale_id: id, p_paid: paid });
  if (res.error) {
    if (/set_sale_commission_paid|function/i.test(res.error.message))
      throw new Error(
        "Action pas encore disponible : la mise à jour de la base (lot 3) n'est pas appliquée.",
      );
    throw new Error(res.error.message);
  }
}

/** Commissions encore dues (centimes Stripe → unités), ventes dont la commission n'est pas versée. */
export function unpaidCommission(
  sales: Pick<ManuelSale, "commission_amount" | "commission_paid_at">[],
) {
  return sales.reduce(
    (sum, s) =>
      s.commission_paid_at ? sum : sum + Number(s.commission_amount ?? 0) / SALES_MINOR_UNIT,
    0,
  );
}

/**
 * Taux de commission saisi en pourcentage (« 10 » ou « 10 % » ou « 12,5 ») → fraction stockée
 * dans sales_channels.commission_rate (0.10). Retourne null si la saisie est invalide.
 */
export function parseCommissionPercent(input: string): number | null {
  const t = input.replace("%", "").replace(",", ".").trim();
  if (!t) return 0;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return Math.round(n * 100) / 10000;
}

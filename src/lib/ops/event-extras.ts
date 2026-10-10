import { supabase } from "@/integrations/supabase/client";
import type { PartnerSale } from "./ops";

/*
 * Soirées (AFRO LOVE) : lots de billets, codes promo, relais (ajout / modification /
 * paiement / suppression) et suppression d'un relevé de billetterie. RLS : can_manage.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

export type PartnerOption = { id: string; name: string; kind: string; is_active: boolean };

/** Partenaires actifs (relais d'événement en tête) pour les listes de choix. */
export async function fetchEventPartners() {
  const rows = check<PartnerOption[]>(
    await db.from("partners").select("id,name,kind,is_active").order("name"),
  );
  return rows;
}

/* ---------- Relais ---------- */

/**
 * Ajoute ou met à jour la ligne d'un relais pour une soirée, sans toucher à « Payé ».
 * Ligne existante trouvée par id, sinon par partenaire, sinon par nom (sans casse).
 */
export async function savePartnerSale(
  existing: PartnerSale[],
  row: {
    id?: string;
    event_id: string;
    partner_id: string | null;
    partner_name: string;
    tickets: number;
    vip_revenue: number;
  },
) {
  const name = row.partner_name.trim();
  if (!name) throw new Error("Nom du relais obligatoire");
  const match =
    (row.id && existing.find((p) => p.id === row.id)) ||
    (row.partner_id && existing.find((p) => p.partner_id === row.partner_id)) ||
    existing.find((p) => p.partner_name.trim().toLowerCase() === name.toLowerCase());
  const values = {
    partner_id: row.partner_id,
    partner_name: name,
    tickets: row.tickets,
    vip_revenue: row.vip_revenue,
  };
  if (match) {
    check(await db.from("event_partner_sales").update(values).eq("id", match.id));
    return "updated" as const;
  }
  check(
    await db.from("event_partner_sales").insert({ ...values, event_id: row.event_id, paid: false }),
  );
  return "created" as const;
}

export async function setPartnerSalePaid(id: string, paid: boolean) {
  check(
    await db
      .from("event_partner_sales")
      .update({ paid, paid_at: paid ? new Date().toISOString() : null })
      .eq("id", id),
  );
}

export async function deletePartnerSale(id: string) {
  check(await db.from("event_partner_sales").delete().eq("id", id));
}

/* ---------- Relevés de billetterie ---------- */

export async function deleteTicketCount(id: string) {
  check(await db.from("event_ticket_counts").delete().eq("id", id));
}

/* ---------- Lots de billets ---------- */

export type TicketLot = {
  id: string;
  event_id: string;
  name: string;
  price: number | null;
  quantity: number | null;
  sales_start: string | null;
  sales_end: string | null;
  sort: number;
  notes: string | null;
};

export async function fetchTicketLots(eventId: string) {
  return check<TicketLot[]>(
    await db
      .from("event_ticket_lots")
      .select("*")
      .eq("event_id", eventId)
      .order("sort")
      .order("sales_start", { ascending: true, nullsFirst: false }),
  );
}

export async function saveTicketLot(row: Omit<TicketLot, "id"> & { id?: string }) {
  if (!row.name.trim()) throw new Error("Nom du lot obligatoire");
  if (row.sales_start && row.sales_end && row.sales_end < row.sales_start)
    throw new Error("La fin des ventes doit être après le début");
  const { id, ...values } = row;
  if (id) check(await db.from("event_ticket_lots").update(values).eq("id", id));
  else check(await db.from("event_ticket_lots").insert(values));
}

export async function deleteTicketLot(id: string) {
  check(await db.from("event_ticket_lots").delete().eq("id", id));
}

/* ---------- Codes promo ---------- */

export const PROMO_PLATFORMS = [
  { value: "sympla", label: "Sympla" },
  { value: "shotgun", label: "Shotgun" },
  { value: "sympla_shotgun", label: "Sympla et Shotgun" },
] as const;

export type PromoCode = {
  id: string;
  event_id: string;
  partner_id: string | null;
  code: string;
  discount_pct: number;
  platform: string;
  uses: number;
  revenue: number;
  vip_revenue: number;
  paid: boolean;
};

export async function fetchPromoCodes(eventId: string) {
  return check<PromoCode[]>(
    await db.from("event_promo_codes").select("*").eq("event_id", eventId).order("code"),
  );
}

export async function savePromoCode(row: Omit<PromoCode, "id"> & { id?: string }) {
  const code = row.code.trim().toUpperCase();
  if (!code) throw new Error("Code obligatoire");
  const { id, ...rest } = row;
  const values = { ...rest, code };
  const res = id
    ? await db.from("event_promo_codes").update(values).eq("id", id)
    : await db.from("event_promo_codes").insert(values);
  if (res.error) {
    if (/duplicate|unique/i.test(res.error.message))
      throw new Error(`Le code ${code} existe déjà pour cette soirée`);
    throw new Error(res.error.message);
  }
}

export async function deletePromoCode(id: string) {
  check(await db.from("event_promo_codes").delete().eq("id", id));
}

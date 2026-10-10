import { supabase } from "@/integrations/supabase/client";
import { RATES } from "@/lib/currency";
import type { PaymentKind } from "./payments-rules";

/*
 * Paiements clients (table payments) rattachés à un devis et/ou un voyage.
 * Lecture / écriture via RLS (can_manage). Le passage automatique du devis en « Payé »
 * est fait en base par un trigger sur payments (voir sql lot3).
 */

export * from "./payments-rules";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

/** Taux d'affichage fixes (src/lib/currency.ts) : unités de devise pour 1 EUR. */
export const PAYMENT_RATES: Record<string, number> = { ...RATES };

export type PaymentRow = {
  id: string;
  paid_at: string;
  amount: number;
  currency: string;
  kind: PaymentKind;
  method: string | null;
  client_id: string | null;
  quote_id: string | null;
  trip_id: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
};

const SELECT =
  "id,paid_at,amount,currency,kind,method,client_id,quote_id,trip_id,reference,notes,created_at";

/** Paiements d'un devis, ou d'un voyage (+ ceux du devis source du voyage). */
export async function fetchPayments(scope: { quoteId?: string | null; tripId?: string | null }) {
  const filters: string[] = [];
  if (scope.tripId) filters.push(`trip_id.eq.${scope.tripId}`);
  if (scope.quoteId) filters.push(`quote_id.eq.${scope.quoteId}`);
  if (!filters.length) return [] as PaymentRow[];
  return check<PaymentRow[]>(
    await db
      .from("payments")
      .select(SELECT)
      .or(filters.join(","))
      .order("paid_at", { ascending: true })
      .order("created_at", { ascending: true }),
  );
}

export type NewPayment = {
  paid_at: string;
  amount: number;
  currency: string;
  kind: PaymentKind;
  method: string | null;
  notes: string | null;
  client_id: string | null;
  quote_id: string | null;
  trip_id: string | null;
};

export async function addPayment(row: NewPayment) {
  if (!(row.amount > 0)) throw new Error("Le montant doit être supérieur à 0.");
  if (!row.paid_at) throw new Error("La date du paiement est obligatoire.");
  check(await db.from("payments").insert(row));
}

export async function deletePayment(id: string) {
  check(await db.from("payments").delete().eq("id", id));
}

export const PAYMENT_METHODS = ["Virement", "Pix", "Carte", "Espèces", "Wise", "PayPal", "Autre"];

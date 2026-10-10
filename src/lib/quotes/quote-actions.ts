import { supabase } from "@/integrations/supabase/client";

/* Actions sur un devis : infos légères, duplication, suppression d'un brouillon. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

export type QuoteMeta = {
  id: string;
  number: string | null;
  reference: string;
  title: string;
  status: string;
  currency: string;
  total_amount: number;
  client_id: string | null;
  prospect_id: string | null;
  followup_paused: boolean;
  paid_at: string | null;
};

export const quoteMetaKey = (id: string) => ["quote-meta", id] as const;

export async function fetchQuoteMeta(id: string) {
  return check<QuoteMeta>(
    await db
      .from("quotes")
      .select(
        "id,number,reference,title,status,currency,total_amount,client_id,prospect_id,followup_paused,paid_at",
      )
      .eq("id", id)
      .single(),
  );
}

/** Colonnes non recopiées lors d'une duplication (suivi, dates, identité). */
const NOT_COPIED = new Set([
  "id",
  "reference",
  "number",
  "status",
  "sent_at",
  "accepted_at",
  "paid_at",
  "created_at",
  "updated_at",
  "created_by",
  "next_action",
  "next_action_at",
  "last_contact_at",
  "followup_paused",
  "followup_stage",
  "followup_anchor_at",
]);

const LINE_NOT_COPIED = new Set(["id", "quote_id", "created_at", "updated_at"]);

/** Copie le devis et ses lignes en brouillon, avec un nouveau numéro. Retourne le nouvel id. */
export async function duplicateQuote(id: string) {
  const [quote, lines] = await Promise.all([
    db.from("quotes").select("*").eq("id", id).single(),
    db.from("quote_lines").select("*").eq("quote_id", id).order("position"),
  ]);
  const q = check<Record<string, unknown>>(quote);
  const rows = check<Record<string, unknown>[]>(lines);
  const number = check<string>(await db.rpc("next_quote_number"));
  const me = await fetch("/api/auth/me", { credentials: "include" })
    .then((r) => r.json())
    .catch(() => null);
  const copy = Object.fromEntries(Object.entries(q).filter(([k]) => !NOT_COPIED.has(k)));
  const created = check<{ id: string }>(
    await db
      .from("quotes")
      .insert({
        ...copy,
        title: `${String(q.title ?? "Devis")} (copie)`,
        reference: number,
        number,
        status: "draft",
        created_by: me?.user?.id ?? null,
      })
      .select("id")
      .single(),
  );
  if (rows.length) {
    const res = await db.from("quote_lines").insert(
      rows.map((l) => ({
        ...Object.fromEntries(Object.entries(l).filter(([k]) => !LINE_NOT_COPIED.has(k))),
        quote_id: created.id,
      })),
    );
    if (res.error) {
      // Pas de devis à moitié copié : on retire la copie.
      await db.from("quotes").delete().eq("id", created.id);
      throw new Error(res.error.message);
    }
  }
  return created.id;
}

/** Supprime un devis en brouillon (lignes et tâches de relance comprises). */
export async function deleteDraftQuote(id: string) {
  const q = check<{ status: string }>(
    await db.from("quotes").select("status").eq("id", id).single(),
  );
  if (q.status !== "draft") throw new Error("Seul un devis en brouillon peut être supprimé.");
  const inv = check<{ id: string }[]>(await db.from("invoices").select("id").eq("quote_id", id));
  if (inv.length) throw new Error("Ce devis a une facture : suppression impossible.");
  check(await db.from("crm_tasks").delete().eq("quote_id", id));
  check(await db.from("quote_lines").delete().eq("quote_id", id));
  check(await db.from("quotes").delete().eq("id", id));
}

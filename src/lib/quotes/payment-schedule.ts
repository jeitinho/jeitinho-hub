/**
 * Échéancier client d'un devis accepté (sur le modèle WeTravel) : acompte puis solde,
 * calculé uniquement à partir des paiements enregistrés — aucun montant supposé.
 */

export type ScheduleQuote = {
  total_amount: number | null;
  currency: string | null;
  deposit_pct: number | null;
  accepted_at: string | null;
  balance_due_on: string | null;
};
export type SchedulePayment = {
  amount: number;
  currency: string | null;
  kind: string | null;
  paid_at: string | null;
};

export type ScheduleState =
  "solde" | "en_retard" | "solde_a_venir" | "acompte_attendu" | "acompte_recu";

export function paymentSchedule(q: ScheduleQuote, payments: SchedulePayment[], today: string) {
  const cur = (q.currency ?? "EUR").toUpperCase();
  const total = Number(q.total_amount) || 0;
  const sameCurrency = payments.filter((p) => (p.currency ?? cur).toUpperCase() === cur);
  const paid = sameCurrency.reduce(
    (a, p) =>
      a +
      (p.kind === "remboursement"
        ? -Number(p.amount)
        : ["acompte", "solde", "total"].includes(p.kind ?? "")
          ? Number(p.amount)
          : 0),
    0,
  );
  const otherCurrency = payments.filter((p) => (p.currency ?? cur).toUpperCase() !== cur);
  const deposit = Math.round(total * ((Number(q.deposit_pct) || 0) / 100) * 100) / 100;
  const remaining = Math.max(0, Math.round((total - paid) * 100) / 100);
  const depositPaid = paid >= deposit - 0.005;
  const daysSinceAccepted = q.accepted_at
    ? Math.floor((Date.parse(`${today}T12:00:00Z`) - Date.parse(q.accepted_at)) / 86_400_000)
    : null;
  const daysToBalance = q.balance_due_on
    ? Math.round(
        (Date.parse(`${q.balance_due_on}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) /
          86_400_000,
      )
    : null;

  let state: ScheduleState;
  if (total > 0 && remaining <= 0.005) state = "solde";
  else if (!depositPaid) state = "acompte_attendu";
  else if (daysToBalance != null && daysToBalance < 0) state = "en_retard";
  else if (daysToBalance != null) state = "solde_a_venir";
  else state = "acompte_recu";

  return {
    currency: cur,
    total,
    paid: Math.round(paid * 100) / 100,
    remaining,
    deposit,
    depositPaid,
    progress: total > 0 ? Math.min(1, Math.max(0, paid / total)) : 0,
    daysSinceAccepted,
    daysToBalance,
    state,
    /** Paiements dans une autre devise que le devis : non additionnés, signalés à part. */
    otherCurrencyCount: otherCurrency.length,
  };
}

export const SCHEDULE_LABEL: Record<ScheduleState, string> = {
  solde: "Soldé",
  en_retard: "Solde en retard",
  solde_a_venir: "Solde à venir",
  acompte_attendu: "Acompte attendu",
  acompte_recu: "Acompte reçu",
};

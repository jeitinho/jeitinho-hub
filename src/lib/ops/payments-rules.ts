/*
 * Paiements clients (table payments) : règles pures, sans import (testables avec node --test).
 *
 * - acompte / solde / total : encaissements (+)
 * - remboursement : (−)
 * - commission / dépense : ne comptent pas dans le « payé » d'un devis ou d'un voyage
 * Les paiements dans une autre devise que le devis sont convertis au taux d'affichage fixe
 * (src/lib/currency.ts, passé en paramètre) ; sans taux connu ils sont listés à part.
 *
 * Tests : npx tsx --test src/lib/ops/payments-rules.test.ts
 */

export type PaymentKind =
  "acompte" | "solde" | "total" | "remboursement" | "commission" | "depense";

export const CLIENT_PAYMENT_KINDS: { value: PaymentKind; label: string }[] = [
  { value: "acompte", label: "Acompte" },
  { value: "solde", label: "Solde" },
  { value: "total", label: "Paiement total" },
  { value: "remboursement", label: "Remboursement" },
];

export const PAYMENT_KIND_LABEL: Record<string, string> = {
  acompte: "Acompte",
  solde: "Solde",
  total: "Paiement total",
  remboursement: "Remboursement",
  commission: "Commission",
  depense: "Dépense",
};

/** +1 encaissement, −1 remboursement, 0 hors calcul (commission, dépense). */
export function paymentSign(kind: string | null | undefined): 1 | -1 | 0 {
  if (kind === "acompte" || kind === "solde" || kind === "total") return 1;
  if (kind === "remboursement") return -1;
  return 0;
}

/** Taux exprimés en « unités de la devise pour 1 EUR » (EUR: 1, BRL: 5.92…). */
export type Rates = Record<string, number>;

export function convertAmount(amount: number, from: string, to: string, rates: Rates) {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (f === t) return amount;
  const rf = rates[f];
  const rt = rates[t];
  if (!rf || !rt) return null;
  return (amount / rf) * rt;
}

export type PaymentLike = { amount: number | string; currency: string; kind: string };

export type PaymentBalance = {
  currency: string;
  total: number;
  /** Payé, dans la devise du devis (autres devises converties au taux indicatif). */
  paid: number;
  /** Partie payée directement dans la devise du devis. */
  paidSameCurrency: number;
  /** Montants payés dans d'autres devises (net, dans leur devise d'origine). */
  otherCurrencies: Record<string, number>;
  /** Devises sans taux connu : non déduites du reste. */
  unconverted: Record<string, number>;
  remaining: number;
  /** Payé ≥ total (avec une tolérance d'un centime). */
  settled: boolean;
};

export function paymentBalance(
  total: number,
  currency: string,
  payments: PaymentLike[],
  rates: Rates,
): PaymentBalance {
  const cur = currency.toUpperCase();
  let paidSame = 0;
  let paidConverted = 0;
  const other: Record<string, number> = {};
  const unconverted: Record<string, number> = {};
  for (const p of payments) {
    const sign = paymentSign(p.kind);
    if (!sign) continue;
    const amount = sign * Number(p.amount || 0);
    const pc = (p.currency || cur).toUpperCase();
    if (pc === cur) {
      paidSame += amount;
      continue;
    }
    other[pc] = (other[pc] ?? 0) + amount;
    const conv = convertAmount(amount, pc, cur, rates);
    if (conv == null) unconverted[pc] = (unconverted[pc] ?? 0) + amount;
    else paidConverted += conv;
  }
  const paid = round2(paidSame + paidConverted);
  const t = Number(total || 0);
  const remaining = Math.max(0, round2(t - paid));
  return {
    currency: cur,
    total: t,
    paid,
    paidSameCurrency: round2(paidSame),
    otherCurrencies: other,
    unconverted,
    remaining,
    settled: t > 0 && remaining <= 0.01,
  };
}

function round2(v: number) {
  return Math.round(v * 100) / 100;
}

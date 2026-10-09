/*
 * Règles pures du cockpit « Aujourd'hui » (testées dans cockpit-rules.test.ts).
 * Pas d'import Supabase ici : uniquement des calculs sur des lignes déjà chargées.
 */

export const RIO_TZ = "America/Sao_Paulo";
const DAY = 86_400_000;

/** Date du jour à Rio au format AAAA-MM-JJ (et non la date UTC). */
export function rioDay(now: Date = new Date()): string {
  return now.toLocaleDateString("fr-CA", { timeZone: RIO_TZ });
}

export type ChaseQuote = {
  status: string;
  followup_paused: boolean | null;
  followup_anchor_at: string | null;
  sent_at: string | null;
  next_action_at: string | null;
  updated_at: string;
};

/**
 * Devis envoyé à relancer : relances non mises en pause, et soit une prochaine action
 * échue, soit (sans prochaine action) plus de 5 jours depuis coalesce(followup_anchor_at, sent_at).
 */
export function isQuoteToChase(q: ChaseQuote, now: Date = new Date()): boolean {
  if (q.status !== "sent" || q.followup_paused === true) return false;
  if (q.next_action_at) return new Date(q.next_action_at).getTime() < now.getTime();
  const anchor = q.followup_anchor_at ?? q.sent_at ?? q.updated_at;
  return new Date(anchor).getTime() < now.getTime() - 5 * DAY;
}

export type PaymentLine = { quote_id: string | null; amount: number | string | null; kind: string };

const CLIENT_IN = new Set(["acompte", "solde", "total"]);

/** Total encaissé par devis (acomptes + soldes + totaux − remboursements). */
export function paidByQuote(payments: PaymentLine[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const p of payments) {
    if (!p.quote_id) continue;
    const amount = Number(p.amount ?? 0);
    const sign = CLIENT_IN.has(p.kind) ? 1 : p.kind === "remboursement" ? -1 : 0;
    if (!sign) continue;
    out.set(p.quote_id, (out.get(p.quote_id) ?? 0) + sign * amount);
  }
  return out;
}

/** Devis accepté non soldé : statut 'accepted' (pas 'paid') et reste à encaisser > 0. */
export function isQuoteUnpaid(
  q: { id: string; status: string; total_amount: number | string | null },
  paid: Map<string, number>,
): boolean {
  if (q.status !== "accepted") return false;
  const total = Number(q.total_amount ?? 0);
  return total - (paid.get(q.id) ?? 0) > 0.009;
}

/**
 * Contenu en retard (même définition que le filtre « retard » de /contenus) :
 * pas publié ni abandonné, et échéance passée (date de Rio) ou date prévue dépassée.
 */
export function isContentLate(
  item: { status: string; deadline: string | null; planned_at: string | null },
  now: Date = new Date(),
): boolean {
  if (item.status === "publie" || item.status === "abandonne") return false;
  if (item.deadline && item.deadline < rioDay(now)) return true;
  if (item.planned_at && new Date(item.planned_at).getTime() < now.getTime()) return true;
  return false;
}

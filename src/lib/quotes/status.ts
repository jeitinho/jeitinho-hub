export type QuoteStatus = "draft" | "sent" | "accepted" | "refused" | "paid" | "ready" | "expired";

export const QUOTE_STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoyé" },
  { value: "accepted", label: "Accepté" },
  { value: "refused", label: "Refusé" },
  { value: "paid", label: "Payé" },
  { value: "expired", label: "Expiré" },
];

const EXTRA_LABELS: Record<string, string> = { ready: "Prêt" };

export function quoteStatusLabel(status: string) {
  return QUOTE_STATUSES.find((s) => s.value === status)?.label ?? EXTRA_LABELS[status] ?? status;
}

export function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

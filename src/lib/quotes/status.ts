import type { Database } from "@/integrations/supabase/types";

export type QuoteStatus = Database["public"]["Enums"]["quote_status"];

/** Statuts exposés dans le module Devis (le reste de l'enum est conservé en base). */
export const QUOTE_STATUSES: { value: QuoteStatus; label: string }[] = [
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoyé" },
  { value: "accepted", label: "Accepté" },
  { value: "refused", label: "Refusé" },
];

export function quoteStatusLabel(status: string) {
  return QUOTE_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}
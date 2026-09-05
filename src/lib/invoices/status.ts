export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string }[] = [
  { value: "draft", label: "Brouillon" },
  { value: "sent", label: "Envoyée" },
  { value: "paid", label: "Payée" },
  { value: "overdue", label: "En retard" },
  { value: "cancelled", label: "Annulée" },
];

export function invoiceStatusLabel(status: string) {
  return INVOICE_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export type LegalType = "individual" | "company";

export const LEGAL_TYPES: { value: LegalType; label: string }[] = [
  { value: "individual", label: "Particulier" },
  { value: "company", label: "Société / personne morale" },
];

export function legalTypeLabel(value: string | null | undefined) {
  return LEGAL_TYPES.find((t) => t.value === value)?.label ?? "Particulier";
}

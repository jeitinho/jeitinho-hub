// Centralized i18n for the two PDF templates (quote-pdf.tsx, invoice-pdf.tsx).
// Brand call: "ROTEIRO" stays untranslated in all 4 languages (JEITINHO's
// Brazil-rooted identity) — only the parenthetical gloss changes, and is
// dropped entirely for pt since "roteiro" already is the Portuguese word.

export type PdfLanguage = "fr" | "en" | "pt" | "es";

export function normalizePdfLanguage(value: string | null | undefined): PdfLanguage {
  return value === "en" || value === "pt" || value === "es" ? value : "fr";
}

// Used with Number.prototype.toLocaleString for money/date formatting.
export const PDF_LOCALE_MAP: Record<PdfLanguage, string> = {
  fr: "fr-FR",
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
};

export const QUOTE_I18N: Record<PdfLanguage, {
  quoteNumberLabel: string;
  clientLabel: string;
  stayLabel: string;
  peopleCount: (n: number) => string;
  peopleTbd: string;
  defaultSubtitle: string;
  equipmentLabel: string;
  includedLabel: string;
  excludedLabel: string;
  itineraryLabel: string;
  tablePrestation: string;
  tableQty: string;
  tableUnit: string;
  tableTotal: string;
  totalLabel: string;
  depositLabel: (pct: number) => string;
  balanceLabel: string;
  notesLabel: string;
  footer: (days: number) => string;
}> = {
  fr: {
    quoteNumberLabel: "DEVIS N°",
    clientLabel: "CLIENT",
    stayLabel: "SÉJOUR",
    peopleCount: (n) => `${n} personne${n > 1 ? "s" : ""}`,
    peopleTbd: "Nombre de personnes à confirmer",
    defaultSubtitle: "Proposition sur mesure",
    equipmentLabel: "MATÉRIEL & PRESTATIONS TECHNIQUES",
    includedLabel: "CE QUI EST INCLUS",
    excludedLabel: "CE QUI N'EST PAS INCLUS",
    itineraryLabel: "ROTEIRO (ITINÉRAIRE)",
    tablePrestation: "PRESTATION",
    tableQty: "QTÉ",
    tableUnit: "P.U.",
    tableTotal: "TOTAL",
    totalLabel: "Total",
    depositLabel: (pct) => `Acompte (${pct}%)`,
    balanceLabel: "Solde",
    notesLabel: "NOTES",
    footer: (days) => `Devis valable ${days} jours · JEITINHO · contact@jeitinho.fr · jeitinho.fr`,
  },
  en: {
    quoteNumberLabel: "QUOTE N°",
    clientLabel: "CLIENT",
    stayLabel: "STAY",
    peopleCount: (n) => `${n} guest${n > 1 ? "s" : ""}`,
    peopleTbd: "Number of guests to be confirmed",
    defaultSubtitle: "Tailor-made proposal",
    equipmentLabel: "EQUIPMENT & TECHNICAL SERVICES",
    includedLabel: "WHAT'S INCLUDED",
    excludedLabel: "WHAT'S NOT INCLUDED",
    itineraryLabel: "ROTEIRO (ITINERARY)",
    tablePrestation: "SERVICE",
    tableQty: "QTY",
    tableUnit: "UNIT PRICE",
    tableTotal: "TOTAL",
    totalLabel: "Total",
    depositLabel: (pct) => `Deposit (${pct}%)`,
    balanceLabel: "Balance",
    notesLabel: "NOTES",
    footer: (days) => `Quote valid for ${days} days · JEITINHO · contact@jeitinho.fr · jeitinho.fr`,
  },
  pt: {
    quoteNumberLabel: "ORÇAMENTO N°",
    clientLabel: "CLIENTE",
    stayLabel: "ESTADIA",
    peopleCount: (n) => `${n} pessoa${n > 1 ? "s" : ""}`,
    peopleTbd: "Número de pessoas a confirmar",
    defaultSubtitle: "Proposta sob medida",
    equipmentLabel: "EQUIPAMENTOS & SERVIÇOS TÉCNICOS",
    includedLabel: "O QUE ESTÁ INCLUÍDO",
    excludedLabel: "O QUE NÃO ESTÁ INCLUÍDO",
    itineraryLabel: "ROTEIRO",
    tablePrestation: "SERVIÇO",
    tableQty: "QTD",
    tableUnit: "P. UNIT.",
    tableTotal: "TOTAL",
    totalLabel: "Total",
    depositLabel: (pct) => `Sinal (${pct}%)`,
    balanceLabel: "Saldo",
    notesLabel: "OBSERVAÇÕES",
    footer: (days) => `Orçamento válido por ${days} dias · JEITINHO · contact@jeitinho.fr · jeitinho.fr`,
  },
  es: {
    quoteNumberLabel: "PRESUPUESTO N°",
    clientLabel: "CLIENTE",
    stayLabel: "ESTANCIA",
    peopleCount: (n) => `${n} persona${n > 1 ? "s" : ""}`,
    peopleTbd: "Número de personas a confirmar",
    defaultSubtitle: "Propuesta a medida",
    equipmentLabel: "EQUIPO Y SERVICIOS TÉCNICOS",
    includedLabel: "QUÉ ESTÁ INCLUIDO",
    excludedLabel: "QUÉ NO ESTÁ INCLUIDO",
    itineraryLabel: "ROTEIRO (ITINERARIO)",
    tablePrestation: "SERVICIO",
    tableQty: "CANT.",
    tableUnit: "P. UNIT.",
    tableTotal: "TOTAL",
    totalLabel: "Total",
    depositLabel: (pct) => `Depósito (${pct}%)`,
    balanceLabel: "Saldo",
    notesLabel: "NOTAS",
    footer: (days) => `Presupuesto válido por ${days} días · JEITINHO · contact@jeitinho.fr · jeitinho.fr`,
  },
};

export const INVOICE_I18N: Record<PdfLanguage, {
  invoiceNumberLabel: string;
  billedToLabel: string;
  billedToCompanyLabel: string;
  siretPrefix: string;
  vatPrefix: string;
  datesLabel: string;
  issuedOn: (date: string) => string;
  dueDate: (date: string) => string;
  tablePrestation: string;
  tableQty: string;
  tableUnit: string;
  tableTotal: string;
  totalTtcLabel: string;
  notesLabel: string;
  footer: string;
}> = {
  fr: {
    invoiceNumberLabel: "FACTURE N°",
    billedToLabel: "FACTURÉ À",
    billedToCompanyLabel: "FACTURÉ À (SOCIÉTÉ)",
    siretPrefix: "SIRET :",
    vatPrefix: "TVA :",
    datesLabel: "DATES",
    issuedOn: (date) => `Émise le ${date}`,
    dueDate: (date) => `Échéance : ${date}`,
    tablePrestation: "PRESTATION",
    tableQty: "QTÉ",
    tableUnit: "P.U.",
    tableTotal: "TOTAL",
    totalTtcLabel: "Total TTC",
    notesLabel: "NOTES",
    footer: "JEITINHO · contact@jeitinho.fr · jeitinho.fr",
  },
  en: {
    invoiceNumberLabel: "INVOICE N°",
    billedToLabel: "BILLED TO",
    billedToCompanyLabel: "BILLED TO (COMPANY)",
    siretPrefix: "SIRET:",
    vatPrefix: "VAT:",
    datesLabel: "DATES",
    issuedOn: (date) => `Issued on ${date}`,
    dueDate: (date) => `Due date: ${date}`,
    tablePrestation: "SERVICE",
    tableQty: "QTY",
    tableUnit: "UNIT PRICE",
    tableTotal: "TOTAL",
    totalTtcLabel: "Total",
    notesLabel: "NOTES",
    footer: "JEITINHO · contact@jeitinho.fr · jeitinho.fr",
  },
  pt: {
    invoiceNumberLabel: "FATURA N°",
    billedToLabel: "FATURADO A",
    billedToCompanyLabel: "FATURADO A (EMPRESA)",
    siretPrefix: "SIRET:",
    vatPrefix: "TVA:",
    datesLabel: "DATAS",
    issuedOn: (date) => `Emitida em ${date}`,
    dueDate: (date) => `Vencimento: ${date}`,
    tablePrestation: "SERVIÇO",
    tableQty: "QTD",
    tableUnit: "P. UNIT.",
    tableTotal: "TOTAL",
    totalTtcLabel: "Total",
    notesLabel: "OBSERVAÇÕES",
    footer: "JEITINHO · contact@jeitinho.fr · jeitinho.fr",
  },
  es: {
    invoiceNumberLabel: "FACTURA N°",
    billedToLabel: "FACTURADO A",
    billedToCompanyLabel: "FACTURADO A (EMPRESA)",
    siretPrefix: "SIRET:",
    vatPrefix: "IVA:",
    datesLabel: "FECHAS",
    issuedOn: (date) => `Emitida el ${date}`,
    dueDate: (date) => `Vencimiento: ${date}`,
    tablePrestation: "SERVICIO",
    tableQty: "CANT.",
    tableUnit: "P. UNIT.",
    tableTotal: "TOTAL",
    totalTtcLabel: "Total",
    notesLabel: "NOTAS",
    footer: "JEITINHO · contact@jeitinho.fr · jeitinho.fr",
  },
};

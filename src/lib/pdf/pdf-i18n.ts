// Centralized i18n for the two PDF templates (quote-pdf.tsx, invoice-pdf.tsx).
// Brand call: "ROTEIRO" stays untranslated in all 7 languages (JEITINHO's
// Brazil-rooted identity) — only the parenthetical gloss changes, and is
// dropped entirely for pt since "roteiro" already is the Portuguese word.

export type PdfLanguage = "fr" | "en" | "pt" | "es" | "it" | "de" | "ru";

/** PDF languages in the order shown in the quote / invoice language selectors. */
export const PDF_LANGUAGES: { value: PdfLanguage; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "es", label: "Español" },
  { value: "it", label: "Italiano" },
  { value: "de", label: "Deutsch" },
  { value: "ru", label: "Русский" },
];

export function normalizePdfLanguage(value: string | null | undefined): PdfLanguage {
  return PDF_LANGUAGES.some((l) => l.value === value) ? (value as PdfLanguage) : "fr";
}

// Used with Number.prototype.toLocaleString for money/date formatting.
export const PDF_LOCALE_MAP: Record<PdfLanguage, string> = {
  fr: "fr-FR",
  en: "en-US",
  pt: "pt-BR",
  es: "es-ES",
  it: "it-IT",
  de: "de-DE",
  ru: "ru-RU",
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
  docTitle: (number: string) => string;
  offered: string;
  optional: string;
  perPerson: string;
  totalWithOptions: string;
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
    docTitle: (number) => `Devis ${number}`,
    offered: "Offert",
    optional: "EN OPTION",
    perPerson: "/ pers.",
    totalWithOptions: "Total avec options",
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
    docTitle: (number) => `Quote ${number}`,
    offered: "Complimentary",
    optional: "OPTIONAL",
    perPerson: "/ guest",
    totalWithOptions: "Total with options",
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
    docTitle: (number) => `Orçamento ${number}`,
    offered: "Cortesia",
    optional: "OPCIONAL",
    perPerson: "/ pessoa",
    totalWithOptions: "Total com opcionais",
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
    docTitle: (number) => `Presupuesto ${number}`,
    offered: "De regalo",
    optional: "OPCIONAL",
    perPerson: "/ pers.",
    totalWithOptions: "Total con opciones",
  },
  it: {
    quoteNumberLabel: "PREVENTIVO N°",
    clientLabel: "CLIENTE",
    stayLabel: "SOGGIORNO",
    peopleCount: (n) => `${n} ${n > 1 ? "persone" : "persona"}`,
    peopleTbd: "Numero di persone da confermare",
    defaultSubtitle: "Proposta su misura",
    equipmentLabel: "ATTREZZATURE E SERVIZI TECNICI",
    includedLabel: "COSA È INCLUSO",
    excludedLabel: "COSA NON È INCLUSO",
    itineraryLabel: "ROTEIRO (ITINERARIO)",
    tablePrestation: "SERVIZIO",
    tableQty: "Q.TÀ",
    tableUnit: "PREZZO UNIT.",
    tableTotal: "TOTALE",
    totalLabel: "Totale",
    depositLabel: (pct) => `Acconto (${pct}%)`,
    balanceLabel: "Saldo",
    notesLabel: "NOTE",
    footer: (days) => `Preventivo valido ${days} giorni · JEITINHO · contact@jeitinho.fr · jeitinho.fr`,
    docTitle: (number) => `Preventivo ${number}`,
    offered: "Omaggio",
    optional: "OPZIONALE",
    perPerson: "/ pers.",
    totalWithOptions: "Totale con opzioni",
  },
  de: {
    quoteNumberLabel: "ANGEBOT NR.",
    clientLabel: "KUNDE",
    stayLabel: "AUFENTHALT",
    peopleCount: (n) => `${n} ${n > 1 ? "Personen" : "Person"}`,
    peopleTbd: "Personenzahl noch offen",
    defaultSubtitle: "Maßgeschneidertes Angebot",
    equipmentLabel: "AUSRÜSTUNG & TECHNISCHE LEISTUNGEN",
    includedLabel: "IM PREIS ENTHALTEN",
    excludedLabel: "NICHT IM PREIS ENTHALTEN",
    itineraryLabel: "ROTEIRO (REISEVERLAUF)",
    tablePrestation: "LEISTUNG",
    tableQty: "MENGE",
    tableUnit: "EINZELPREIS",
    tableTotal: "GESAMT",
    totalLabel: "Gesamt",
    depositLabel: (pct) => `Anzahlung (${pct} %)`,
    balanceLabel: "Restbetrag",
    notesLabel: "HINWEISE",
    footer: (days) => `Angebot gültig für ${days} Tage · JEITINHO · contact@jeitinho.fr · jeitinho.fr`,
    docTitle: (number) => `Angebot ${number}`,
    offered: "Inklusive",
    optional: "OPTIONAL",
    perPerson: "/ Pers.",
    totalWithOptions: "Gesamt mit Optionen",
  },
  ru: {
    quoteNumberLabel: "СМЕТА №",
    clientLabel: "КЛИЕНТ",
    stayLabel: "ПОЕЗДКА",
    peopleCount: (n) => `Человек: ${n}`,
    peopleTbd: "Число участников уточняется",
    defaultSubtitle: "Индивидуальное предложение",
    equipmentLabel: "ОБОРУДОВАНИЕ И ТЕХНИЧЕСКИЕ УСЛУГИ",
    includedLabel: "ЧТО ВКЛЮЧЕНО",
    excludedLabel: "ЧТО НЕ ВКЛЮЧЕНО",
    itineraryLabel: "ROTEIRO (МАРШРУТ)",
    tablePrestation: "УСЛУГА",
    tableQty: "КОЛ-ВО",
    tableUnit: "ЦЕНА ЗА ЕД.",
    tableTotal: "СУММА",
    totalLabel: "Итого",
    depositLabel: (pct) => `Предоплата (${pct} %)`,
    balanceLabel: "Остаток",
    notesLabel: "ПРИМЕЧАНИЯ",
    footer: (days) => `Смета действительна ${days} дн. · JEITINHO · contact@jeitinho.fr · jeitinho.fr`,
    docTitle: (number) => `Смета ${number}`,
    offered: "В подарок",
    optional: "ПО ЖЕЛАНИЮ",
    perPerson: "/ чел.",
    totalWithOptions: "Итого с опциями",
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
  docTitle: (number: string) => string;
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
    docTitle: (number) => `Facture ${number}`,
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
    docTitle: (number) => `Invoice ${number}`,
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
    docTitle: (number) => `Fatura ${number}`,
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
    docTitle: (number) => `Factura ${number}`,
  },
  it: {
    invoiceNumberLabel: "FATTURA N°",
    billedToLabel: "INTESTATA A",
    billedToCompanyLabel: "INTESTATA A (AZIENDA)",
    siretPrefix: "SIRET:",
    vatPrefix: "P. IVA:",
    datesLabel: "DATE",
    issuedOn: (date) => `Emessa il ${date}`,
    dueDate: (date) => `Scadenza: ${date}`,
    tablePrestation: "SERVIZIO",
    tableQty: "Q.TÀ",
    tableUnit: "PREZZO UNIT.",
    tableTotal: "TOTALE",
    totalTtcLabel: "Totale",
    notesLabel: "NOTE",
    footer: "JEITINHO · contact@jeitinho.fr · jeitinho.fr",
    docTitle: (number) => `Fattura ${number}`,
  },
  de: {
    invoiceNumberLabel: "RECHNUNG NR.",
    billedToLabel: "RECHNUNGSEMPFÄNGER",
    billedToCompanyLabel: "RECHNUNGSEMPFÄNGER (UNTERNEHMEN)",
    siretPrefix: "SIRET:",
    vatPrefix: "USt-IdNr.:",
    datesLabel: "DATEN",
    issuedOn: (date) => `Ausgestellt am ${date}`,
    dueDate: (date) => `Fällig am: ${date}`,
    tablePrestation: "LEISTUNG",
    tableQty: "MENGE",
    tableUnit: "EINZELPREIS",
    tableTotal: "GESAMT",
    totalTtcLabel: "Gesamtbetrag",
    notesLabel: "HINWEISE",
    footer: "JEITINHO · contact@jeitinho.fr · jeitinho.fr",
    docTitle: (number) => `Rechnung ${number}`,
  },
  ru: {
    invoiceNumberLabel: "СЧЁТ №",
    billedToLabel: "ПЛАТЕЛЬЩИК",
    billedToCompanyLabel: "ПЛАТЕЛЬЩИК (КОМПАНИЯ)",
    siretPrefix: "SIRET:",
    vatPrefix: "НДС:",
    datesLabel: "ДАТЫ",
    issuedOn: (date) => `Выставлен ${date}`,
    dueDate: (date) => `Срок оплаты: ${date}`,
    tablePrestation: "УСЛУГА",
    tableQty: "КОЛ-ВО",
    tableUnit: "ЦЕНА ЗА ЕД.",
    tableTotal: "СУММА",
    totalTtcLabel: "Итого",
    notesLabel: "ПРИМЕЧАНИЯ",
    footer: "JEITINHO · contact@jeitinho.fr · jeitinho.fr",
    docTitle: (number) => `Счёт ${number}`,
  },
};

/** Line under the JEITINHO logo on quotes and invoices. */
export const PDF_BRAND_LINE: Record<PdfLanguage, string> = {
  fr: "RIO DE JANEIRO · CONCIERGERIE",
  en: "RIO DE JANEIRO · CONCIERGE",
  pt: "RIO DE JANEIRO · CONCIERGE",
  es: "RÍO DE JANEIRO · CONSERJERÍA",
  it: "RIO DE JANEIRO · CONCIERGE",
  de: "RIO DE JANEIRO · CONCIERGE-SERVICE",
  ru: "РИО-ДЕ-ЖАНЕЙРО · КОНСЬЕРЖ-СЕРВИС",
};

/** "2026-12-26" → 26/12/2026 (fr), 26.12.2026 (de), 12/26/2026 (en)… ; "—" when empty. */
export function pdfDate(value: string | null | undefined, lang: PdfLanguage): string {
  if (!value) return "—";
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(PDF_LOCALE_MAP[lang], { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
}

/** Client itinerary PDF (trip-planning-pdf.tsx). No prices on this document. */
export const PLANNING_I18N: Record<PdfLanguage, {
  brandLine: string;
  docTitle: (client: string) => string;
  period: (start: string | null, end: string | null) => string;
  weather: string;
  legendActivity: string;
  legendTransfer: string;
  legendEvening: string;
  legendFree: string;
  freeDay: string;
  offered: string;
  nightTitle: string;
  slots: Record<string, string>;
  defaultTitleWeek: string;
  defaultTitleStay: string;
}> = {
  fr: {
    brandLine: "PROGRAMME PRIVÉ · RIO DE JANEIRO",
    docTitle: (c) => `Planning ${c}`,
    period: (a, b) => (a && b ? `Du ${a} au ${b}` : a ? `À partir du ${a}` : b ? `Jusqu'au ${b}` : ""),
    weather: "Pré-planning adaptable à tout moment. Les activités peuvent être modifiées ou inversées selon la météo.",
    legendActivity: "Activité / visite", legendTransfer: "Déplacement", legendEvening: "Soirée", legendFree: "Libre",
    freeDay: "Journée libre", offered: "Offert", nightTitle: "NUIT · SORTIES",
    slots: { matin: "Matin", midi: "Midi", apres_midi: "Après-midi", soir: "Soir", nuit: "Nuit" },
    defaultTitleWeek: "Une semaine à Rio", defaultTitleStay: "Votre séjour à Rio",
  },
  en: {
    brandLine: "PRIVATE ITINERARY · RIO DE JANEIRO",
    docTitle: (c) => `Itinerary ${c}`,
    period: (a, b) => (a && b ? `From ${a} to ${b}` : a ? `From ${a}` : b ? `Until ${b}` : ""),
    weather: "Provisional plan, adjustable at any time. Activities may be changed or swapped depending on the weather.",
    legendActivity: "Activity / visit", legendTransfer: "Transfer", legendEvening: "Evening", legendFree: "Free time",
    freeDay: "Free day", offered: "Complimentary", nightTitle: "NIGHT · GOING OUT",
    slots: { matin: "Morning", midi: "Lunch", apres_midi: "Afternoon", soir: "Evening", nuit: "Night" },
    defaultTitleWeek: "A week in Rio", defaultTitleStay: "Your stay in Rio",
  },
  pt: {
    brandLine: "ROTEIRO PRIVADO · RIO DE JANEIRO",
    docTitle: (c) => `Roteiro ${c}`,
    period: (a, b) => (a && b ? `De ${a} a ${b}` : a ? `A partir de ${a}` : b ? `Até ${b}` : ""),
    weather: "Pré-roteiro ajustável a qualquer momento. As atividades podem ser alteradas ou invertidas conforme o clima.",
    legendActivity: "Atividade / visita", legendTransfer: "Deslocamento", legendEvening: "Noite", legendFree: "Livre",
    freeDay: "Dia livre", offered: "Cortesia", nightTitle: "NOITE · SAÍDAS",
    slots: { matin: "Manhã", midi: "Almoço", apres_midi: "Tarde", soir: "Noite", nuit: "Madrugada" },
    defaultTitleWeek: "Uma semana no Rio", defaultTitleStay: "Sua estadia no Rio",
  },
  es: {
    brandLine: "PROGRAMA PRIVADO · RÍO DE JANEIRO",
    docTitle: (c) => `Programa ${c}`,
    period: (a, b) => (a && b ? `Del ${a} al ${b}` : a ? `A partir del ${a}` : b ? `Hasta el ${b}` : ""),
    weather: "Programa provisional, adaptable en cualquier momento. Las actividades pueden cambiarse o intercambiarse según el tiempo.",
    legendActivity: "Actividad / visita", legendTransfer: "Traslado", legendEvening: "Noche", legendFree: "Libre",
    freeDay: "Día libre", offered: "De regalo", nightTitle: "NOCHE · SALIDAS",
    slots: { matin: "Mañana", midi: "Mediodía", apres_midi: "Tarde", soir: "Noche", nuit: "Madrugada" },
    defaultTitleWeek: "Una semana en Río", defaultTitleStay: "Tu estancia en Río",
  },
  it: {
    brandLine: "PROGRAMMA PRIVATO · RIO DE JANEIRO",
    docTitle: (c) => `Programma ${c}`,
    period: (a, b) => (a && b ? `Dal ${a} al ${b}` : a ? `Dal ${a}` : b ? `Fino al ${b}` : ""),
    weather: "Programma provvisorio, modificabile in qualsiasi momento. Le attività possono essere cambiate o invertite in base al meteo.",
    legendActivity: "Attività / visita", legendTransfer: "Spostamento", legendEvening: "Serata", legendFree: "Libero",
    freeDay: "Giornata libera", offered: "Omaggio", nightTitle: "NOTTE · USCITE",
    slots: { matin: "Mattina", midi: "Pranzo", apres_midi: "Pomeriggio", soir: "Sera", nuit: "Notte" },
    defaultTitleWeek: "Una settimana a Rio", defaultTitleStay: "Il tuo soggiorno a Rio",
  },
  de: {
    brandLine: "PRIVATES PROGRAMM · RIO DE JANEIRO",
    docTitle: (c) => `Reiseprogramm ${c}`,
    period: (a, b) => (a && b ? `${a} bis ${b}` : a ? `Ab ${a}` : b ? `Bis ${b}` : ""),
    weather: "Vorläufiges Programm, jederzeit anpassbar. Aktivitäten können je nach Wetter geändert oder getauscht werden.",
    legendActivity: "Aktivität / Besichtigung", legendTransfer: "Transfer", legendEvening: "Abend", legendFree: "Frei",
    freeDay: "Freier Tag", offered: "Inklusive", nightTitle: "NACHT · AUSGEHEN",
    slots: { matin: "Vormittag", midi: "Mittag", apres_midi: "Nachmittag", soir: "Abend", nuit: "Nacht" },
    defaultTitleWeek: "Eine Woche in Rio", defaultTitleStay: "Ihr Aufenthalt in Rio",
  },
  ru: {
    brandLine: "ЛИЧНАЯ ПРОГРАММА · РИО-ДЕ-ЖАНЕЙРО",
    docTitle: (c) => `Программа ${c}`,
    period: (a, b) => (a && b ? `С ${a} по ${b}` : a ? `С ${a}` : b ? `До ${b}` : ""),
    weather: "Предварительная программа, её можно изменить в любой момент. Активности могут меняться местами в зависимости от погоды.",
    legendActivity: "Активность / экскурсия", legendTransfer: "Переезд", legendEvening: "Вечер", legendFree: "Свободно",
    freeDay: "Свободный день", offered: "В подарок", nightTitle: "НОЧЬ · ВЫХОДЫ",
    slots: { matin: "Утро", midi: "Обед", apres_midi: "День", soir: "Вечер", nuit: "Ночь" },
    defaultTitleWeek: "Неделя в Рио", defaultTitleStay: "Ваша поездка в Рио",
  },
};

/** "2026-11-17" → 17/11 (fr), 17.11. (de), 11/17 (en)… */
export function pdfDayMonth(value: string, lang: PdfLanguage): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(PDF_LOCALE_MAP[lang], { day: "2-digit", month: "2-digit", timeZone: "UTC" });
}

/** Short upper-case weekday: LUN., MON, ПН… */
export function pdfWeekday(value: string, lang: PdfLanguage): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(PDF_LOCALE_MAP[lang], { weekday: "short", timeZone: "UTC" }).toUpperCase();
}

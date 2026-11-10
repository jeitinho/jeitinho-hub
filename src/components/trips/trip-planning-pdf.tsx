/**
 * PDF « Planning » — DA Ketur (crème/terracotta, Fraunces + Inter), calqué sur
 * Ketur_Asim_Jeitinho_Planning.pdf : une carte par jour, en-tête noir, cinq
 * créneaux fixes (matin → nuit) avec leurs horaires, créneaux fusionnés pour
 * les activités longues, bandeau « Nuit · sorties » en bas.
 * Rendu uniquement côté navigateur (import dynamique). Aucun prix.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { PDF_SANS, PDF_SERIF, registerQuotePdfFonts } from "@/lib/pdf/quote-pdf-fonts";
import {
  normalizePdfLanguage,
  PLANNING_I18N,
  pdfCompactPeriod,
  pdfDayLabel,
  pdfDayMonth,
  pdfWeekday,
  type PdfLanguage,
} from "@/lib/pdf/pdf-i18n";
import { buildDayGrid, GRID_SLOTS, isEveningRow, SLOT_HOURS, type GridRow } from "@/lib/trips/planning-grid";

registerQuotePdfFonts();

export type PlanningPdfLine = {
  /** Créneau (matin, midi, apres_midi, soir, nuit) — libellé traduit dans le PDF. */
  slot: string | null;
  /** Nombre de créneaux couverts (activité longue : matin + midi…). */
  slotSpan?: number | null;
  title: string;
  displayTime: string | null;
  category: string | null;
  isOffered: boolean;
  kind: string;
};
export type PlanningPdfDay = { date: string; lines: PlanningPdfLine[] };
export type PlanningPdfData = {
  /** "fr" | "en" | "pt" | "es" | "it" | "de" | "ru" — repli sur le français. */
  language?: string | null;
  clientName: string;
  periodStart: string | null;
  periodEnd: string | null;
  title: string;
  days: PlanningPdfDay[];
  /** Sorties de nuit de la plage imprimée, pour le bandeau en bas de page. */
  nightEntries: { date: string; title: string }[];
};

const C = {
  cream: "#F4F0E8",
  ink: "#221E1A",
  inkSoft: "#6B625A",
  terracotta: "#A8603E",
  terracottaText: "#B15D36",
  activity: "#EFC99C",
  transfer: "#D9B892",
  off: "#DCD6CC",
  emptyA: "#ECE7DF",
  emptyB: "#FFFFFF",
  sand: "#EFC99C",
  rule: "#E3DBCD",
};
const SLOT_H = 21;

const s = StyleSheet.create({
  page: {
    backgroundColor: C.cream,
    paddingTop: 34,
    paddingBottom: 40,
    paddingHorizontal: 34,
    color: C.ink,
    fontFamily: PDF_SANS,
    fontSize: 8,
  },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  brand: { fontFamily: PDF_SERIF, fontWeight: 400, fontSize: 20, letterSpacing: 6 },
  brandLine: { marginTop: 5, fontSize: 6.5, fontWeight: 700, color: C.terracottaText, letterSpacing: 0.6 },
  client: { fontFamily: PDF_SERIF, fontWeight: 400, fontSize: 15, textAlign: "right", textTransform: "uppercase" },
  period: { marginTop: 5, fontSize: 6.5, fontWeight: 700, color: C.terracottaText, textAlign: "right", letterSpacing: 0.4 },
  title: { marginTop: 14, fontFamily: PDF_SERIF, fontWeight: 400, fontSize: 21 },
  titleAccent: { fontStyle: "italic", color: C.terracottaText },
  subtitle: { marginTop: 4, fontSize: 7, color: C.inkSoft },
  note: { marginTop: 2, fontSize: 6.5, color: C.inkSoft, fontStyle: "normal" },
  grid: { marginTop: 14 },
  pair: { flexDirection: "row", justifyContent: "space-between", marginBottom: 9 },
  card: { width: "49%", borderRadius: 4, overflow: "hidden" },
  cardHead: {
    backgroundColor: C.ink,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 22,
  },
  cardDay: { color: "#FFFFFF", fontWeight: 700, fontSize: 8.5, letterSpacing: 0.4 },
  cardDate: { color: C.sand, fontWeight: 700, fontSize: 7 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 0.6,
    borderBottomColor: C.rule,
    paddingHorizontal: 8,
  },
  labelCol: { width: "34%" },
  slotName: { fontSize: 6.2, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.3 },
  slotHours: { fontSize: 5.2, marginTop: 1 },
  slotExtra: { fontSize: 5.2, marginTop: 2 },
  content: { flex: 1 },
  entry: { fontSize: 7.4, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.2 },
  entryGap: { marginTop: 2 },
  dash: { flex: 1, textAlign: "center", fontSize: 8, color: "#B5ABA0" },
  freeDay: {
    height: SLOT_H * GRID_SLOTS.length,
    backgroundColor: C.emptyA,
    alignItems: "center",
    justifyContent: "center",
  },
  freeDayText: { fontSize: 7.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: C.inkSoft },
  band: { marginTop: 6, backgroundColor: C.ink, borderRadius: 5, paddingVertical: 12, paddingHorizontal: 14 },
  bandTitle: { fontSize: 6.8, fontWeight: 700, color: C.terracottaText, letterSpacing: 0.6, marginBottom: 8 },
  bandItems: { flexDirection: "row", flexWrap: "wrap" },
  bandItem: { width: "16.66%", paddingRight: 10, marginBottom: 6 },
  bandDay: { fontSize: 5.8, fontWeight: 700, color: "#CFC6BA", letterSpacing: 0.3 },
  bandText: { marginTop: 4, fontSize: 7, fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase" },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 34,
    right: 34,
    fontSize: 6,
    fontWeight: 700,
    color: C.terracottaText,
    textAlign: "right",
    letterSpacing: 0.4,
  },
});

function entryText(line: PlanningPdfLine, offered: string): string {
  return [line.title, line.displayTime, line.isOffered ? offered : null].filter(Boolean).join(" · ");
}

function rowColors(row: GridRow<PlanningPdfLine>): { bg: string; fg: string; sub: string } {
  const slotIdx = GRID_SLOTS.indexOf(row.slots[0]);
  if (row.lines.length === 0) return { bg: slotIdx % 2 === 0 ? C.emptyA : C.emptyB, fg: C.ink, sub: C.inkSoft };
  if (row.lines.every((l) => l.kind === "free")) return { bg: C.off, fg: C.ink, sub: C.inkSoft };
  if (isEveningRow(row)) return { bg: C.terracotta, fg: "#FFFFFF", sub: "#F3DCCB" };
  if (row.lines.every((l) => l.category === "deplacement")) return { bg: C.transfer, fg: C.ink, sub: C.inkSoft };
  return { bg: C.activity, fg: C.ink, sub: "#7A6A58" };
}

function DayCard({ day, lang }: { day: PlanningPdfDay; lang: PdfLanguage }) {
  const t = PLANNING_I18N[lang];
  const rows = buildDayGrid(day.lines);
  const empty = day.lines.length === 0;
  return (
    <View style={s.card} wrap={false}>
      <View style={s.cardHead}>
        <Text style={s.cardDay}>{pdfDayLabel(day.date, lang)}</Text>
        <Text style={s.cardDate}>{pdfDayMonth(day.date, lang)}</Text>
      </View>
      {empty ? (
        <View style={s.freeDay}>
          <Text style={s.freeDayText}>{t.freeDay}</Text>
        </View>
      ) : (
        rows.map((row) => {
          const colors = rowColors(row);
          const [first, ...rest] = row.slots;
          return (
            <View key={first} style={[s.row, { backgroundColor: colors.bg, height: SLOT_H * row.slots.length }]}>
              <View style={s.labelCol}>
                <Text style={[s.slotName, { color: colors.fg }]}>{t.slots[first] ?? first}</Text>
                <Text style={[s.slotHours, { color: colors.sub }]}>{SLOT_HOURS[first]}</Text>
                {rest.map((slot) => (
                  <Text key={slot} style={[s.slotExtra, { color: colors.sub }]}>
                    {(t.slots[slot] ?? slot).toUpperCase()} · {SLOT_HOURS[slot]}
                  </Text>
                ))}
              </View>
              {row.lines.length === 0 ? (
                <Text style={s.dash}>—</Text>
              ) : (
                <View style={s.content}>
                  {row.lines.map((line, i) => (
                    <Text key={i} style={[s.entry, i > 0 ? s.entryGap : {}, { color: colors.fg }]}>
                      {entryText(line, t.offered)}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })
      )}
    </View>
  );
}

/** Last word of the title in terracotta italics, as « Une semaine à *Rio* ». */
function Title({ text }: { text: string }) {
  const i = text.trim().lastIndexOf(" ");
  if (i <= 0) return <Text style={s.title}>{text}</Text>;
  return (
    <Text style={s.title}>
      {text.slice(0, i + 1)}
      <Text style={s.titleAccent}>{text.slice(i + 1)}</Text>
    </Text>
  );
}

export function TripPlanningPdf({ planning }: { planning: PlanningPdfData }) {
  const lang = normalizePdfLanguage(planning.language);
  const t = PLANNING_I18N[lang];
  const pairs: PlanningPdfDay[][] = [];
  for (let i = 0; i < planning.days.length; i += 2) pairs.push(planning.days.slice(i, i + 2));
  const shortDay = (iso: string) => `${pdfWeekday(iso, lang)} ${Number(iso.slice(8, 10))}`;
  return (
    <Document title={t.docTitle(planning.clientName)} author="JEITINHO">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>JEITINHO</Text>
            <Text style={s.brandLine}>{t.brandLine}</Text>
          </View>
          <View>
            <Text style={s.client}>{planning.clientName}</Text>
            <Text style={s.period}>{pdfCompactPeriod(planning.periodStart, planning.periodEnd)}</Text>
          </View>
        </View>

        <Title text={planning.title} />
        <Text style={s.subtitle}>{t.subtitle}</Text>
        <Text style={s.note}>{t.weather}</Text>

        <View style={s.grid}>
          {pairs.map((pair) => (
            <View key={pair[0].date} style={s.pair} wrap={false}>
              {pair.map((day) => (
                <DayCard key={day.date} day={day} lang={lang} />
              ))}
              {pair.length === 1 && <View style={s.card} />}
            </View>
          ))}
        </View>

        {planning.nightEntries.length > 0 && (
          <View style={s.band} wrap={false}>
            <Text style={s.bandTitle}>{t.nightTitle}</Text>
            <View style={s.bandItems}>
              {planning.nightEntries.map((n, i) => (
                <View key={i} style={s.bandItem}>
                  <Text style={s.bandDay}>{shortDay(n.date)}</Text>
                  <Text style={s.bandText}>{n.title}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <Text style={s.footer} fixed>
          JEITINHO · jeitinho.fr
        </Text>
      </Page>
    </Document>
  );
}

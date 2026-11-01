/**
 * PDF « Planning » — DA Ketur (crème/terracotta, Fraunces + Inter), inspiré de
 * Ketur_Asim_Jeitinho_Planning.pdf. Rendu uniquement côté navigateur (import dynamique).
 * Aucun prix n'apparaît sur ce document — c'est un planning, pas un devis.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { PDF_SANS, PDF_SERIF, registerQuotePdfFonts } from "@/lib/pdf/quote-pdf-fonts";
import { normalizePdfLanguage, PLANNING_I18N, pdfDayMonth, pdfWeekday } from "@/lib/pdf/pdf-i18n";

registerQuotePdfFonts();

export type PlanningPdfLine = {
  /** Créneau (matin, midi, apres_midi, soir, nuit) — libellé traduit dans le PDF. */
  slot: string | null;
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
  /** Lignes catégorie « soirée » de la plage imprimée, pour le bandeau en bas de page. */
  nightEntries: { date: string; title: string }[];
};

const BRAND = {
  cream: "#F6F2E9",
  terracotta: "#B15D36",
  ink: "#221E1A",
  inkSoft: "#6B625A",
  border: "#E0D8C9",
};
// DA Ketur — code couleur du planning (Sheets + PDF).
const CATEGORY_COLOR: Record<string, string> = {
  activite: "#efc99c",
  visite: "#efc99c",
  deplacement: "#d9b892",
  soiree: "#a8603e",
};
const FREE_COLOR = "#dcd6cc";

const s = StyleSheet.create({
  page: {
    backgroundColor: BRAND.cream,
    paddingTop: 44,
    paddingBottom: 56,
    paddingHorizontal: 40,
    fontSize: 9,
    color: BRAND.ink,
    fontFamily: PDF_SANS,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  brand: { fontFamily: PDF_SERIF, fontWeight: 600, fontSize: 18, letterSpacing: 1 },
  brandSub: { fontSize: 7, letterSpacing: 2, color: BRAND.inkSoft, marginTop: 3 },
  clientBox: { alignItems: "flex-end" },
  clientName: { fontFamily: PDF_SANS, fontWeight: 700, fontSize: 11 },
  period: { fontSize: 8.5, color: BRAND.inkSoft, marginTop: 2 },
  title: { fontFamily: PDF_SERIF, fontWeight: 600, fontSize: 20, marginTop: 14, marginBottom: 10 },
  weatherBox: {
    backgroundColor: BRAND.ink,
    borderRadius: 4,
    padding: 10,
    marginBottom: 14,
  },
  weatherText: { fontSize: 8.5, color: BRAND.cream, lineHeight: 1.4 },
  legend: { flexDirection: "row", gap: 12, marginBottom: 12, flexWrap: "wrap" },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  legendSwatch: { width: 8, height: 8, borderRadius: 2 },
  legendLabel: { fontSize: 7, color: BRAND.inkSoft },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  dayCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: BRAND.border,
    padding: 10,
    marginBottom: 10,
  },
  dayHeader: {
    fontFamily: PDF_SANS,
    fontWeight: 700,
    fontSize: 9,
    marginBottom: 6,
    textTransform: "uppercase",
  },
  slotRow: { flexDirection: "row", borderRadius: 3, padding: 5, marginBottom: 4 },
  slotLabel: { fontSize: 6.5, fontWeight: 700, width: 44, opacity: 0.75 },
  slotText: { fontSize: 8, flex: 1 },
  nightBand: {
    marginTop: 8,
    backgroundColor: CATEGORY_COLOR.soiree,
    borderRadius: 4,
    padding: 10,
  },
  nightTitle: {
    fontFamily: PDF_SANS,
    fontWeight: 700,
    fontSize: 8,
    color: "#FFFFFF",
    marginBottom: 4,
    letterSpacing: 1,
  },
  nightItem: { fontSize: 8, color: "#FFFFFF", marginBottom: 2 },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: BRAND.border,
    paddingTop: 8,
    fontSize: 7,
    color: BRAND.inkSoft,
    textAlign: "center",
  },
});


// Dates « 17/11 » et jamais de « → » : la flèche est absente du subset latin d'Inter.
export function TripPlanningPdf({ planning }: { planning: PlanningPdfData }) {
  const lang = normalizePdfLanguage(planning.language);
  const t = PLANNING_I18N[lang];
  const dm = (iso: string | null) => (iso ? pdfDayMonth(iso, lang) : null);
  return (
    <Document title={t.docTitle(planning.clientName)} author="JEITINHO">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>JEITINHO</Text>
            <Text style={s.brandSub}>{t.brandLine}</Text>
          </View>
          <View style={s.clientBox}>
            <Text style={s.clientName}>{planning.clientName}</Text>
            <Text style={s.period}>{t.period(dm(planning.periodStart), dm(planning.periodEnd))}</Text>
          </View>
        </View>

        <Text style={s.title}>{planning.title}</Text>

        <View style={s.weatherBox}>
          <Text style={s.weatherText}>
            {t.weather}
          </Text>
        </View>

        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendSwatch, { backgroundColor: CATEGORY_COLOR.activite }]} />
            <Text style={s.legendLabel}>{t.legendActivity}</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendSwatch, { backgroundColor: CATEGORY_COLOR.deplacement }]} />
            <Text style={s.legendLabel}>{t.legendTransfer}</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendSwatch, { backgroundColor: CATEGORY_COLOR.soiree }]} />
            <Text style={s.legendLabel}>{t.legendEvening}</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendSwatch, { backgroundColor: FREE_COLOR }]} />
            <Text style={s.legendLabel}>{t.legendFree}</Text>
          </View>
        </View>

        <View style={s.grid}>
          {planning.days.map((day) => (
            <View key={day.date} style={s.dayCard}>
              <Text style={s.dayHeader}>
                {pdfWeekday(day.date, lang)} {dm(day.date)}
              </Text>
              {day.lines.length === 0 ? (
                <Text style={{ fontSize: 7.5, color: BRAND.inkSoft }}>{t.freeDay}</Text>
              ) : (
                day.lines.map((line, i) => {
                  const bg =
                    line.kind === "free"
                      ? FREE_COLOR
                      : (CATEGORY_COLOR[line.category ?? "activite"] ?? CATEGORY_COLOR.activite);
                  const textColor =
                    line.category === "soiree" && line.kind !== "free" ? "#FFFFFF" : BRAND.ink;
                  return (
                    <View key={i} style={[s.slotRow, { backgroundColor: bg }]}>
                      <Text style={[s.slotLabel, { color: textColor }]}>
                        {line.displayTime || (line.slot ? (t.slots[line.slot] ?? "") : "")}
                      </Text>
                      <Text style={[s.slotText, { color: textColor }]}>
                        {line.title}
                        {line.isOffered ? ` · ${t.offered}` : ""}
                      </Text>
                    </View>
                  );
                })
              )}
            </View>
          ))}
        </View>

        {planning.nightEntries.length > 0 && (
          <View style={s.nightBand}>
            <Text style={s.nightTitle}>{t.nightTitle}</Text>
            {planning.nightEntries.map((n, i) => (
              <Text key={i} style={s.nightItem}>
                {dm(n.date)} — {n.title}
              </Text>
            ))}
          </View>
        )}

        <Text style={s.footer}>JEITINHO · contact@jeitinho.fr · jeitinho.fr</Text>
      </Page>
    </Document>
  );
}

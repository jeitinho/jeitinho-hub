/**
 * PDF « Planning » — DA Ketur (crème/terracotta, Fraunces + Inter), inspiré de
 * Ketur_Asim_Jeitinho_Planning.pdf. Rendu uniquement côté navigateur (import dynamique).
 * Aucun prix n'apparaît sur ce document — c'est un planning, pas un devis.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { registerQuotePdfFonts } from "@/lib/pdf/quote-pdf-fonts";

registerQuotePdfFonts();

export type PlanningPdfLine = {
  slotLabel: string;
  title: string;
  displayTime: string | null;
  category: string | null;
  isOffered: boolean;
  kind: string;
};
export type PlanningPdfDay = { date: string; weekdayLabel: string; lines: PlanningPdfLine[] };
export type PlanningPdfData = {
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
    fontFamily: "Inter",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  brand: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 18, letterSpacing: 1 },
  brandSub: { fontSize: 7, letterSpacing: 2, color: BRAND.inkSoft, marginTop: 3 },
  clientBox: { alignItems: "flex-end" },
  clientName: { fontFamily: "Inter", fontWeight: 700, fontSize: 11 },
  period: { fontSize: 8.5, color: BRAND.inkSoft, marginTop: 2 },
  title: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 20, marginTop: 14, marginBottom: 10 },
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
    fontFamily: "Inter",
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
    fontFamily: "Inter",
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

function frDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** « 17/11 au 28/11 » — jamais de « → », absent du subset latin d'Inter. */
function periodLabel(start: string | null, end: string | null): string {
  if (start && end) return `Du ${frDate(start)} au ${frDate(end)}`;
  if (start) return `À partir du ${frDate(start)}`;
  if (end) return `Jusqu'au ${frDate(end)}`;
  return "";
}

export function TripPlanningPdf({ planning }: { planning: PlanningPdfData }) {
  return (
    <Document title={`Planning ${planning.clientName}`} author="JEITINHO">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>JEITINHO</Text>
            <Text style={s.brandSub}>PROGRAMME PRIVÉ · RIO DE JANEIRO</Text>
          </View>
          <View style={s.clientBox}>
            <Text style={s.clientName}>{planning.clientName}</Text>
            <Text style={s.period}>{periodLabel(planning.periodStart, planning.periodEnd)}</Text>
          </View>
        </View>

        <Text style={s.title}>{planning.title}</Text>

        <View style={s.weatherBox}>
          <Text style={s.weatherText}>
            Pré-planning adaptable à tout moment. Les activités peuvent être modifiées ou inversées
            selon la météo.
          </Text>
        </View>

        <View style={s.legend}>
          <View style={s.legendItem}>
            <View style={[s.legendSwatch, { backgroundColor: CATEGORY_COLOR.activite }]} />
            <Text style={s.legendLabel}>Activité / visite</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendSwatch, { backgroundColor: CATEGORY_COLOR.deplacement }]} />
            <Text style={s.legendLabel}>Déplacement</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendSwatch, { backgroundColor: CATEGORY_COLOR.soiree }]} />
            <Text style={s.legendLabel}>Soirée</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendSwatch, { backgroundColor: FREE_COLOR }]} />
            <Text style={s.legendLabel}>Libre</Text>
          </View>
        </View>

        <View style={s.grid}>
          {planning.days.map((day) => (
            <View key={day.date} style={s.dayCard}>
              <Text style={s.dayHeader}>
                {day.weekdayLabel} {frDate(day.date)}
              </Text>
              {day.lines.length === 0 ? (
                <Text style={{ fontSize: 7.5, color: BRAND.inkSoft }}>Journée libre</Text>
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
                        {line.displayTime || line.slotLabel}
                      </Text>
                      <Text style={[s.slotText, { color: textColor }]}>
                        {line.title}
                        {line.isOffered ? " · Offert" : ""}
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
            <Text style={s.nightTitle}>NUIT · SORTIES</Text>
            {planning.nightEntries.map((n, i) => (
              <Text key={i} style={s.nightItem}>
                {frDate(n.date)} — {n.title}
              </Text>
            ))}
          </View>
        )}

        <Text style={s.footer}>JEITINHO · contact@jeitinho.fr · jeitinho.fr</Text>
      </Page>
    </Document>
  );
}

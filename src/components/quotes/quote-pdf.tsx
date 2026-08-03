/**
 * Modèle PDF "Carolina" — devis JEITINHO.
 * Rendu uniquement côté navigateur (import dynamique), jamais pendant le SSR.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { registerQuotePdfFonts } from "@/lib/pdf/quote-pdf-fonts";
import { IconCheck, IconX, IconPackage } from "@/lib/pdf/quote-pdf-icons";

registerQuotePdfFonts();

export type QuotePdfLine = {
  label: string;
  unit: string;
  quantity: number;
  unit_price: number;
};

export type QuotePdfEquipmentGroup = { label: string; items: string[] };

export type QuotePdfData = {
  number: string;
  eyebrow?: string | null;
  title: string;
  description?: string | null;
  project_label?: string | null;
  location?: string | null;
  currency: string;
  period_start?: string | null;
  period_end?: string | null;
  party_size?: number | null;
  validity_days: number;
  deposit_pct: number;
  notes?: string | null;
  client: { name: string; email?: string | null; phone?: string | null };
  lines: QuotePdfLine[];
  /** Optionnel — n'affiche la section que si des groupes sont fournis. */
  equipment?: QuotePdfEquipmentGroup[] | null;
  /** Optionnel — bloc "ce qui est inclus / n'est pas inclus". */
  highlights?: { included?: string[]; excluded?: string[] } | null;
  /** Optionnel — roteiro numéroté. */
  itinerary?: string[] | null;
};

const BRAND = {
  terracotta: "#B15D36",
  cream: "#F6F2E9",
  ink: "#221E1A",
  inkSoft: "#6B625A",
  border: "#E0D8C9",
};

const s = StyleSheet.create({
  page: { backgroundColor: BRAND.cream, paddingTop: 48, paddingBottom: 56, paddingHorizontal: 44, fontSize: 9.5, color: BRAND.ink, fontFamily: "Inter" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  brand: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 20, letterSpacing: 1 },
  brandSub: { fontSize: 7, letterSpacing: 2, color: BRAND.inkSoft, marginTop: 3 },
  refBox: { alignItems: "flex-end" },
  ref: { fontFamily: "Inter", fontWeight: 700, fontSize: 12, color: BRAND.terracotta },
  eyebrow: { fontSize: 7, letterSpacing: 2, color: BRAND.terracotta, marginBottom: 6 },
  title: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 24, marginBottom: 6 },
  subtitle: { fontSize: 9.5, color: BRAND.inkSoft, marginBottom: 12 },
  description: { fontSize: 9, color: BRAND.inkSoft, lineHeight: 1.5, marginBottom: 24, maxWidth: 420 },
  cols: { flexDirection: "row", gap: 18, marginBottom: 24 },
  darkBox: { flex: 1, backgroundColor: BRAND.ink, borderRadius: 4, padding: 12 },
  darkBoxTitle: { fontSize: 7, fontWeight: 700, color: "#F7CA98", letterSpacing: 1, marginBottom: 6 },
  darkBoxRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 4 },
  darkBoxIcon: { width: 10, marginRight: 6, marginTop: 1.5 },
  darkBoxText: { fontSize: 8.5, color: BRAND.cream, flex: 1, lineHeight: 1.4 },
  equipmentGroup: { width: "50%", marginBottom: 8, paddingRight: 8 },
  equipmentGroupLabel: { fontSize: 7.5, fontWeight: 700, color: BRAND.ink, marginBottom: 3, letterSpacing: 0.4 },
  equipmentItem: { fontSize: 8, color: BRAND.inkSoft, marginBottom: 1.5 },
  itineraryStep: { flexDirection: "row", alignItems: "flex-start", marginBottom: 7 },
  itineraryBadge: { width: 14, height: 14, borderRadius: 7, backgroundColor: BRAND.terracotta, color: "#FFFFFF", fontSize: 7, fontWeight: 700, textAlign: "center", paddingTop: 3, marginRight: 8 },
  itineraryText: { fontSize: 8.5, color: BRAND.ink, marginTop: 1, flex: 1 },
  card: { flex: 1, backgroundColor: "#FFFFFF", borderRadius: 4, padding: 12, borderWidth: 1, borderColor: BRAND.border },
  label: { fontSize: 7, letterSpacing: 1.5, color: BRAND.inkSoft, marginBottom: 5 },
  value: { fontSize: 10 },
  tableHead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BRAND.ink, paddingBottom: 5, marginBottom: 2 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BRAND.border, paddingVertical: 7 },
  cLabel: { flex: 4 },
  cQty: { flex: 1, textAlign: "right" },
  cUnit: { flex: 1.6, textAlign: "right" },
  cTotal: { flex: 1.6, textAlign: "right" },
  th: { fontSize: 7, letterSpacing: 1.2, color: BRAND.inkSoft },
  totals: { marginTop: 16, alignSelf: "flex-end", width: 220 },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  grand: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingTop: 8, borderTopWidth: 1, borderTopColor: BRAND.ink },
  grandLabel: { fontFamily: "Inter", fontWeight: 700, fontSize: 11 },
  grandValue: { fontFamily: "Inter", fontWeight: 700, fontSize: 14, color: BRAND.terracotta },
  notes: { marginTop: 26, padding: 12, backgroundColor: "#FFFFFF", borderRadius: 4, borderLeftWidth: 3, borderLeftColor: BRAND.terracotta },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, borderTopWidth: 1, borderTopColor: BRAND.border, paddingTop: 8, fontSize: 7, color: BRAND.inkSoft, textAlign: "center" },
});

function money(v: number, currency: string) {
  return `${v.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function frDate(v?: string | null) {
  if (!v) return "—";
  const [y, m, d] = v.split("-");
  return `${d}/${m}/${y}`;
}

function safeStrings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

function safeEquipment(v: QuotePdfData["equipment"]): QuotePdfEquipmentGroup[] {
  if (!Array.isArray(v)) return [];
  return v.filter((g): g is QuotePdfEquipmentGroup => !!g && typeof g.label === "string" && Array.isArray(g.items));
}

export function QuotePdf({ quote }: { quote: QuotePdfData }) {
  const total = quote.lines.reduce((acc, l) => acc + l.quantity * l.unit_price, 0);
  const deposit = (total * quote.deposit_pct) / 100;
  const equipmentGroups = safeEquipment(quote.equipment);
  const included = safeStrings(quote.highlights?.included);
  const excluded = safeStrings(quote.highlights?.excluded);
  const itinerary = safeStrings(quote.itinerary);
  const hasHighlights = included.length > 0 || excluded.length > 0;

  return (
    <Document title={`Devis ${quote.number}`} author="JEITINHO">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>JEITINHO</Text>
            <Text style={s.brandSub}>RIO DE JANEIRO · CONCIERGERIE</Text>
          </View>
          <View style={s.refBox}>
            <Text style={s.label}>DEVIS N°</Text>
            <Text style={s.ref}>{quote.number}</Text>
          </View>
        </View>

        {quote.eyebrow ? <Text style={s.eyebrow}>{quote.eyebrow.toUpperCase()}</Text> : null}
        <Text style={s.title}>{quote.title}</Text>
        <Text style={s.subtitle}>
          {[quote.project_label, quote.location].filter(Boolean).join(" · ") || "Proposition sur mesure"}
        </Text>
        {quote.description ? <Text style={s.description}>{quote.description}</Text> : null}

        <View style={s.cols}>
          <View style={s.card}>
            <Text style={s.label}>CLIENT</Text>
            <Text style={s.value}>{quote.client.name}</Text>
            {quote.client.email ? <Text style={{ color: BRAND.inkSoft, marginTop: 3 }}>{quote.client.email}</Text> : null}
            {quote.client.phone ? <Text style={{ color: BRAND.inkSoft, marginTop: 2 }}>{quote.client.phone}</Text> : null}
          </View>
          <View style={s.card}>
            <Text style={s.label}>SÉJOUR</Text>
            <Text style={s.value}>
              {frDate(quote.period_start)} → {frDate(quote.period_end)}
            </Text>
            <Text style={{ color: BRAND.inkSoft, marginTop: 3 }}>
              {quote.party_size ? `${quote.party_size} personne${quote.party_size > 1 ? "s" : ""}` : "Nombre de personnes à confirmer"}
            </Text>
          </View>
        </View>

        {equipmentGroups.length > 0 && (
          <View style={{ marginBottom: 24 }}>
            <Text style={s.label}>MATÉRIEL & PRESTATIONS TECHNIQUES</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
              {equipmentGroups.map((g) => (
                <View key={g.label} style={s.equipmentGroup}>
                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 3 }}>
                    <View style={{ marginRight: 5 }}><IconPackage size={9} color={BRAND.terracotta} /></View>
                    <Text style={[s.equipmentGroupLabel, { marginBottom: 0 }]}>{g.label.toUpperCase()}</Text>
                  </View>
                  {g.items.map((it, idx) => (
                    <Text key={idx} style={s.equipmentItem}>• {it}</Text>
                  ))}
                </View>
              ))}
            </View>
          </View>
        )}

        {(hasHighlights || itinerary.length > 0) && (
          <View style={[s.cols, { alignItems: "flex-start" }]}>
            {hasHighlights && (
              <View style={s.darkBox}>
                {included.length > 0 && (
                  <>
                    <Text style={s.darkBoxTitle}>CE QUI EST INCLUS</Text>
                    {included.map((it, idx) => (
                      <View key={idx} style={s.darkBoxRow}>
                        <View style={s.darkBoxIcon}><IconCheck size={8} color="#F7CA98" /></View>
                        <Text style={s.darkBoxText}>{it}</Text>
                      </View>
                    ))}
                  </>
                )}
                {excluded.length > 0 && (
                  <>
                    <Text style={[s.darkBoxTitle, { marginTop: included.length > 0 ? 8 : 0 }]}>CE QUI N'EST PAS INCLUS</Text>
                    {excluded.map((it, idx) => (
                      <View key={idx} style={s.darkBoxRow}>
                        <View style={s.darkBoxIcon}><IconX size={8} color={BRAND.terracotta} /></View>
                        <Text style={s.darkBoxText}>{it}</Text>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}
            {itinerary.length > 0 && (
              <View style={{ flex: 1 }}>
                <Text style={s.label}>ROTEIRO (ITINÉRAIRE)</Text>
                <View style={{ marginTop: 6 }}>
                  {itinerary.map((step, idx) => (
                    <View key={idx} style={s.itineraryStep}>
                      <Text style={s.itineraryBadge}>{idx + 1}</Text>
                      <Text style={s.itineraryText}>{step}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        <View style={s.tableHead}>
          <Text style={[s.cLabel, s.th]}>PRESTATION</Text>
          <Text style={[s.cQty, s.th]}>QTÉ</Text>
          <Text style={[s.cUnit, s.th]}>P.U.</Text>
          <Text style={[s.cTotal, s.th]}>TOTAL</Text>
        </View>

        {quote.lines.map((l, i) => (
          <View key={i} style={s.row} wrap={false}>
            <View style={s.cLabel}>
              <Text>{l.label}</Text>
              {l.unit ? <Text style={{ fontSize: 7.5, color: BRAND.inkSoft, marginTop: 2 }}>{l.unit}</Text> : null}
            </View>
            <Text style={s.cQty}>{l.quantity}</Text>
            <Text style={s.cUnit}>{money(l.unit_price, quote.currency)}</Text>
            <Text style={s.cTotal}>{money(l.quantity * l.unit_price, quote.currency)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.grand}>
            <Text style={s.grandLabel}>Total</Text>
            <Text style={s.grandValue}>{money(total, quote.currency)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={{ color: BRAND.inkSoft }}>Acompte ({quote.deposit_pct}%)</Text>
            <Text>{money(deposit, quote.currency)}</Text>
          </View>
          <View style={s.totalRow}>
            <Text style={{ color: BRAND.inkSoft }}>Solde</Text>
            <Text>{money(total - deposit, quote.currency)}</Text>
          </View>
        </View>

        {quote.notes ? (
          <View style={s.notes}>
            <Text style={s.label}>NOTES</Text>
            <Text style={{ lineHeight: 1.5 }}>{quote.notes}</Text>
          </View>
        ) : null}

        <Text style={s.footer}>
          Devis valable {quote.validity_days} jours · JEITINHO · contact@jeitinho.fr · jeitinho.fr
        </Text>
      </Page>
    </Document>
  );
}
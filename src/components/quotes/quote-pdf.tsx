/**
 * Modèle PDF "Carolina" — devis JEITINHO.
 * Rendu uniquement côté navigateur (import dynamique), jamais pendant le SSR.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

export type QuotePdfLine = {
  label: string;
  unit: string;
  quantity: number;
  unit_price: number;
};

export type QuotePdfData = {
  number: string;
  eyebrow?: string | null;
  title: string;
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
};

const BRAND = {
  terracotta: "#B15D36",
  cream: "#F6F2E9",
  ink: "#221E1A",
  inkSoft: "#6B625A",
  border: "#E0D8C9",
};

const s = StyleSheet.create({
  page: { backgroundColor: BRAND.cream, paddingTop: 48, paddingBottom: 56, paddingHorizontal: 44, fontSize: 9.5, color: BRAND.ink, fontFamily: "Helvetica" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  brand: { fontFamily: "Times-Bold", fontSize: 20, letterSpacing: 1 },
  brandSub: { fontSize: 7, letterSpacing: 2, color: BRAND.inkSoft, marginTop: 3 },
  refBox: { alignItems: "flex-end" },
  ref: { fontFamily: "Times-Bold", fontSize: 12, color: BRAND.terracotta },
  eyebrow: { fontSize: 7, letterSpacing: 2, color: BRAND.terracotta, marginBottom: 6 },
  title: { fontFamily: "Times-Roman", fontSize: 24, marginBottom: 6 },
  subtitle: { fontSize: 9.5, color: BRAND.inkSoft, marginBottom: 24 },
  cols: { flexDirection: "row", gap: 18, marginBottom: 24 },
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
  grandLabel: { fontFamily: "Times-Bold", fontSize: 11 },
  grandValue: { fontFamily: "Times-Bold", fontSize: 14, color: BRAND.terracotta },
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

export function QuotePdf({ quote }: { quote: QuotePdfData }) {
  const total = quote.lines.reduce((acc, l) => acc + l.quantity * l.unit_price, 0);
  const deposit = (total * quote.deposit_pct) / 100;

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
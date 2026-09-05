/**
 * Modèle PDF "Carolina" — facture JEITINHO. Rendu uniquement côté navigateur.
 */
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { registerQuotePdfFonts } from "@/lib/pdf/quote-pdf-fonts";

registerQuotePdfFonts();

export type InvoicePdfLine = { label: string; unit: string; quantity: number; unit_price: number };

export type InvoicePdfData = {
  number: string;
  title: string;
  status: string;
  currency: string;
  issueDate: string;
  dueDate?: string | null;
  notes?: string | null;
  billing: {
    legalType: "individual" | "company";
    name: string;
    companyName?: string | null;
    siret?: string | null;
    vatNumber?: string | null;
    address?: string | null;
  };
  lines: InvoicePdfLine[];
};

const BRAND = { terracotta: "#B15D36", cream: "#F6F2E9", ink: "#221E1A", inkSoft: "#6B625A", border: "#E0D8C9" };

const s = StyleSheet.create({
  page: { backgroundColor: BRAND.cream, paddingTop: 48, paddingBottom: 56, paddingHorizontal: 44, fontSize: 9.5, color: BRAND.ink, fontFamily: "Inter" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 28 },
  brand: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 20, letterSpacing: 1 },
  brandSub: { fontSize: 7, letterSpacing: 2, color: BRAND.inkSoft, marginTop: 3 },
  refBox: { alignItems: "flex-end" },
  ref: { fontFamily: "Inter", fontWeight: 700, fontSize: 12, color: BRAND.terracotta },
  title: { fontFamily: "Fraunces", fontWeight: 600, fontSize: 24, marginBottom: 20 },
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

export function InvoicePdf({ invoice }: { invoice: InvoicePdfData }) {
  const total = invoice.lines.reduce((acc, l) => acc + l.quantity * l.unit_price, 0);
  return (
    <Document title={`Facture ${invoice.number}`} author="JEITINHO">
      <Page size="A4" style={s.page}>
        <View style={s.header}>
          <View>
            <Text style={s.brand}>JEITINHO</Text>
            <Text style={s.brandSub}>RIO DE JANEIRO · CONCIERGERIE</Text>
          </View>
          <View style={s.refBox}>
            <Text style={s.label}>FACTURE N°</Text>
            <Text style={s.ref}>{invoice.number}</Text>
          </View>
        </View>

        <Text style={s.title}>{invoice.title}</Text>

        <View style={s.cols}>
          <View style={s.card}>
            <Text style={s.label}>{invoice.billing.legalType === "company" ? "FACTURÉ À (SOCIÉTÉ)" : "FACTURÉ À"}</Text>
            <Text style={s.value}>{invoice.billing.legalType === "company" ? (invoice.billing.companyName || invoice.billing.name) : invoice.billing.name}</Text>
            {invoice.billing.legalType === "company" && invoice.billing.siret ? <Text style={{ color: BRAND.inkSoft, marginTop: 3 }}>SIRET : {invoice.billing.siret}</Text> : null}
            {invoice.billing.legalType === "company" && invoice.billing.vatNumber ? <Text style={{ color: BRAND.inkSoft, marginTop: 2 }}>TVA : {invoice.billing.vatNumber}</Text> : null}
            {invoice.billing.address ? <Text style={{ color: BRAND.inkSoft, marginTop: 2 }}>{invoice.billing.address}</Text> : null}
          </View>
          <View style={s.card}>
            <Text style={s.label}>DATES</Text>
            <Text style={s.value}>Émise le {frDate(invoice.issueDate)}</Text>
            <Text style={{ color: BRAND.inkSoft, marginTop: 3 }}>Échéance : {frDate(invoice.dueDate)}</Text>
          </View>
        </View>

        <View style={s.tableHead}>
          <Text style={[s.cLabel, s.th]}>PRESTATION</Text>
          <Text style={[s.cQty, s.th]}>QTÉ</Text>
          <Text style={[s.cUnit, s.th]}>P.U.</Text>
          <Text style={[s.cTotal, s.th]}>TOTAL</Text>
        </View>

        {invoice.lines.map((l, i) => (
          <View key={i} style={s.row} wrap={false}>
            <View style={s.cLabel}>
              <Text>{l.label}</Text>
              {l.unit ? <Text style={{ fontSize: 7.5, color: BRAND.inkSoft, marginTop: 2 }}>{l.unit}</Text> : null}
            </View>
            <Text style={s.cQty}>{l.quantity}</Text>
            <Text style={s.cUnit}>{money(l.unit_price, invoice.currency)}</Text>
            <Text style={s.cTotal}>{money(l.quantity * l.unit_price, invoice.currency)}</Text>
          </View>
        ))}

        <View style={s.totals}>
          <View style={s.grand}>
            <Text style={s.grandLabel}>Total TTC</Text>
            <Text style={s.grandValue}>{money(total, invoice.currency)}</Text>
          </View>
        </View>

        {invoice.notes ? (
          <View style={s.notes}>
            <Text style={s.label}>NOTES</Text>
            <Text style={{ lineHeight: 1.5 }}>{invoice.notes}</Text>
          </View>
        ) : null}

        <Text style={s.footer}>JEITINHO · contact@jeitinho.fr · jeitinho.fr</Text>
      </Page>
    </Document>
  );
}

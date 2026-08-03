import { createElement } from "react";
import type { QuotePdfData } from "@/components/quotes/quote-pdf";

/** Génère et télécharge le PDF du devis (navigateur uniquement). */
export async function downloadQuotePdf(quote: QuotePdfData) {
  const [{ pdf }, { QuotePdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/quotes/quote-pdf"),
  ]);
  const blob = await pdf(createElement(QuotePdf, { quote }) as never).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Devis-${quote.number}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
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
  a.download = quoteFileName(quote);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Devis_Jeitinho_{client}_{numero}.pdf */
function quoteFileName(quote: QuotePdfData) {
  const client = (quote.client.name || "client").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^\p{L}\p{N}]+/gu, "");
  const num = quote.number.replace(/[^\p{L}\p{N}-]+/gu, "");
  return `Devis_Jeitinho_${client}_${num}.pdf`;
}
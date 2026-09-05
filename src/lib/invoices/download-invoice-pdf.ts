import { createElement } from "react";
import type { InvoicePdfData } from "@/components/invoices/invoice-pdf";

/** Génère et télécharge le PDF de la facture (navigateur uniquement). */
export async function downloadInvoicePdf(invoice: InvoicePdfData) {
  const [{ pdf }, { InvoicePdf }] = await Promise.all([
    import("@react-pdf/renderer"),
    import("@/components/invoices/invoice-pdf"),
  ]);
  const blob = await pdf(createElement(InvoicePdf, { invoice }) as never).toBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = invoiceFileName(invoice);
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function invoiceFileName(invoice: InvoicePdfData) {
  const name = (invoice.billing.name || "client").normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/[^\p{L}\p{N}]+/gu, "");
  const num = invoice.number.replace(/[^\p{L}\p{N}-]+/gu, "");
  return `Facture_Jeitinho_${name}_${num}.pdf`;
}

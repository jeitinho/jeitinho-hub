import { createFileRoute } from "@tanstack/react-router";
import { InvoiceForm } from "@/components/invoice-form";

export const Route = createFileRoute("/_authenticated/devis/factures/$id")({
  component: InvoiceDetail,
  head: () => ({ meta: [{ title: "Facture — JEITINHO" }] }),
});

function InvoiceDetail() {
  const { id } = Route.useParams();
  return <InvoiceForm invoiceId={id === "new" ? undefined : id} />;
}

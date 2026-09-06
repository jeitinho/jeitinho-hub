import { createFileRoute } from "@tanstack/react-router";
import { InvoiceForm } from "@/components/invoice-form";

export const Route = createFileRoute("/_authenticated/devis/factures/new")({
  component: NewInvoice,
  head: () => ({
    meta: [
      { title: "Nouvelle facture — JEITINHO" },
      {
        name: "description",
        content: "Créer une facture JEITINHO avec génération automatique du PDF.",
      },
    ],
  }),
});

function NewInvoice() {
  return <InvoiceForm />;
}

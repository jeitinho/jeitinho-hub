import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
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
  return (
    <PageShell
      eyebrow="Facturation"
      title="Nouvelle facture"
      description="Le numéro de facture est attribué à l'enregistrement. Le PDF est généré automatiquement."
    >
      <InvoiceForm />
    </PageShell>
  );
}

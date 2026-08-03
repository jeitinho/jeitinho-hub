import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { QuoteForm } from "@/components/quote-form";

export const Route = createFileRoute("/_authenticated/devis/$id")({
  component: EditQuote,
  head: () => ({
    meta: [
      { title: "Devis — JEITINHO" },
      { name: "description", content: "Modifier un devis client JEITINHO et générer son PDF." },
    ],
  }),
});

function EditQuote() {
  const { id } = useParams({ from: "/_authenticated/devis/$id" });
  return (
    <PageShell eyebrow="Facturation" title="Devis" description="Modifiez les prestations, le statut et exportez le PDF.">
      <QuoteForm quoteId={id} />
    </PageShell>
  );
}
import { createFileRoute, useParams } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { QuoteForm } from "@/components/quote-form";
import { ConvertQuoteToTripButton } from "@/components/quotes/convert-quote-to-trip-button";
import { ConvertQuoteToInvoiceButton } from "@/components/quotes/convert-quote-to-invoice-button";

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
      <div className="space-y-6">
        <ConvertQuoteToTripButton quoteId={id} />
        <ConvertQuoteToInvoiceButton quoteId={id} />
        <QuoteForm quoteId={id} />
      </div>
    </PageShell>
  );
}

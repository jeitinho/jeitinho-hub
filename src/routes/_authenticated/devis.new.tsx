import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { PageShell } from "@/components/page-shell";
import { QuoteForm } from "@/components/quote-form";

const searchSchema = z.object({
  prospectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/_authenticated/devis/new")({
  validateSearch: searchSchema,
  component: NewQuote,
  head: () => ({
    meta: [
      { title: "Nouveau devis — JEITINHO" },
      { name: "description", content: "Créer un devis client JEITINHO avec lignes de prestation et export PDF." },
    ],
  }),
});

function NewQuote() {
  const { prospectId, clientId } = Route.useSearch();
  return (
    <PageShell eyebrow="Facturation" title="Nouveau devis" description="Le numéro AAAA-NNN est attribué à l'enregistrement.">
      <QuoteForm initialProspectId={prospectId} initialClientId={clientId} />
    </PageShell>
  );
}
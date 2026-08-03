import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { QuoteForm } from "@/components/quote-form";

export const Route = createFileRoute("/_authenticated/devis/new")({
  component: () => (
    <PageShell eyebrow="Facturation" title="Nouveau devis" description="Le numéro AAAA-NNN est attribué à l'enregistrement.">
      <QuoteForm />
    </PageShell>
  ),
  head: () => ({
    meta: [
      { title: "Nouveau devis — JEITINHO" },
      { name: "description", content: "Créer un devis client JEITINHO avec lignes de prestation et export PDF." },
    ],
  }),
});
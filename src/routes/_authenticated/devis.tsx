import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";
export const Route = createFileRoute("/_authenticated/devis")({
  component: () => (
    <PageShell eyebrow="Facturation" title="Devis" description="Rédigez, exportez et suivez vos devis."><ComingSoon label="Devis & PDF" /></PageShell>
  ),
  head: () => ({ meta: [{ title: "Devis — JEITINHO" }] }),
});
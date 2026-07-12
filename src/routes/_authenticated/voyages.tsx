import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";
export const Route = createFileRoute("/_authenticated/voyages")({
  component: () => (
    <PageShell eyebrow="Conciergerie" title="Voyages" description="Voyages personnalisés — clients, itinéraires, hôtels, transport, paiements."><ComingSoon label="Voyages personnalisés" /></PageShell>
  ),
  head: () => ({ meta: [{ title: "Voyages — JEITINHO" }] }),
});
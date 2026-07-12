import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";
export const Route = createFileRoute("/_authenticated/clients")({
  component: () => (
    <PageShell eyebrow="Base clients" title="Clients" description="Fiches, historique de voyages et documents."><ComingSoon label="Fiches clients" /></PageShell>
  ),
  head: () => ({ meta: [{ title: "Clients — JEITINHO" }] }),
});
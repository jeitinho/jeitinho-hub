import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";
export const Route = createFileRoute("/_authenticated/calendrier")({
  component: () => (
    <PageShell eyebrow="Vue unifiée" title="Calendrier" description="Publications, voyages, tournages, réservations, rendez-vous."><ComingSoon label="Calendrier" /></PageShell>
  ),
  head: () => ({ meta: [{ title: "Calendrier — JEITINHO" }] }),
});
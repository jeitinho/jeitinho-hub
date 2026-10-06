import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/finances")({
  component: () => (
    <PageShell eyebrow="Pilotage" title="Finances" description="Encaissements, CA par activité, commissions et marges.">
      <ComingSoon label="Finances" />
    </PageShell>
  ),
  head: () => ({ meta: [{ title: "Finances — JEITINHO" }] }),
});

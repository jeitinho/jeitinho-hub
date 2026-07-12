import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/crm")({
  component: () => (
    <PageShell eyebrow="Pipeline commercial" title="CRM" description="Prospects, historique, messages et documents.">
      <ComingSoon label="Pipeline CRM" />
    </PageShell>
  ),
  head: () => ({ meta: [{ title: "CRM — JEITINHO" }] }),
});
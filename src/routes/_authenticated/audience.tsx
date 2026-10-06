import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/audience")({
  component: () => (
    <PageShell eyebrow="Pilotage" title="Audience" description="Contacts événementiels (base LATINO / BRÉSIL Paris), segments et opt-ins newsletter.">
      <ComingSoon label="Audience" />
    </PageShell>
  ),
  head: () => ({ meta: [{ title: "Audience — JEITINHO" }] }),
});

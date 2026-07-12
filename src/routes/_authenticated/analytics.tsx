import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";
export const Route = createFileRoute("/_authenticated/analytics")({
  component: () => (
    <PageShell eyebrow="Pilotage" title="Analytics" description="Instagram, blog, SEO, réservations, CA, leads."><ComingSoon label="Analytics" /></PageShell>
  ),
  head: () => ({ meta: [{ title: "Analytics — JEITINHO" }] }),
});
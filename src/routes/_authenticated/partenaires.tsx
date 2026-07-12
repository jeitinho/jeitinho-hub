import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";
export const Route = createFileRoute("/_authenticated/partenaires")({
  component: () => (
    <PageShell eyebrow="Réseau" title="Partenaires" description="Prestataires, missions et coordonnées."><ComingSoon label="Réseau de partenaires" /></PageShell>
  ),
  head: () => ({ meta: [{ title: "Partenaires — JEITINHO" }] }),
});
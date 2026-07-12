import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";
export const Route = createFileRoute("/_authenticated/mediatheque")({
  component: () => (
    <PageShell eyebrow="Assets" title="Médiathèque" description="Photos, vidéos, drone, templates, documents. Une seule bibliothèque."><ComingSoon label="Médiathèque" /></PageShell>
  ),
  head: () => ({ meta: [{ title: "Médiathèque — JEITINHO" }] }),
});
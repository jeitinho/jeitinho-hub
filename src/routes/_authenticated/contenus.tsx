import { createFileRoute } from "@tanstack/react-router";
import { PageShell, ComingSoon } from "@/components/page-shell";
export const Route = createFileRoute("/_authenticated/contenus")({
  component: () => (
    <PageShell eyebrow="Marketing" title="Bibliothèque de contenus" description="Reels, carrousels, stories, newsletters. Workflow complet de l'idée à la publication."><ComingSoon label="Contenus marketing" /></PageShell>
  ),
  head: () => ({ meta: [{ title: "Contenus — JEITINHO" }] }),
});
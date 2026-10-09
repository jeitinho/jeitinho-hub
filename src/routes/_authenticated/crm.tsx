import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { BellRing, Inbox, Plus } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FollowupsPanel } from "@/components/crm/followups-panel";
import { DemandesBoard } from "@/components/demandes/demandes-board";

export const Route = createFileRoute("/_authenticated/crm")({
  component: Layout,
  head: () => ({ meta: [{ title: "CRM — JEITINHO" }] }),
});

/** /crm/leads/new est une route enfant : le CRM n'est rendu que sur /crm. */
function Layout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path.replace(/\/$/, "") !== "/crm") return <Outlet />;
  return <CrmPage />;
}

type CrmTab = "demandes" | "relances";

/*
 * Les anciens onglets « Leads » et « Prospects » sont fusionnés dans « Demandes » :
 * marquer contacté, qualifier, spam, supprimer, créer un devis, convertir en client
 * et voir le client s'y retrouvent (carte, menu « Passer à… » et panneau latéral).
 * L'ancien onglet « Priorités » est retiré : la priorité affichée sur les cartes
 * Demandes fait référence. « Relances » ne montre que les relances de devis.
 */
function CrmPage() {
  const [tab, setTab] = useState<CrmTab>("demandes");
  return (
    <PageShell
      eyebrow="Pipeline commercial"
      title="CRM"
      description="Chaque demande (site jeitinho.fr ou saisie manuelle) suit un seul pipeline, de la première réponse au devis."
      actions={
        <Button asChild className="btn-primary">
          <Link to="/crm/leads/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouvelle demande
          </Link>
        </Button>
      }
    >
      <Tabs value={tab} onValueChange={(v) => setTab(v as CrmTab)}>
        <TabsList>
          <TabsTrigger value="demandes">
            <Inbox className="mr-1.5 h-3.5 w-3.5" />
            Demandes
          </TabsTrigger>
          <TabsTrigger value="relances">
            <BellRing className="mr-1.5 h-3.5 w-3.5" />
            Relances
          </TabsTrigger>
        </TabsList>
        <TabsContent value="demandes" className="mt-6">
          <DemandesBoard onOpenRelances={() => setTab("relances")} />
        </TabsContent>
        <TabsContent value="relances" className="mt-6">
          <FollowupsPanel />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

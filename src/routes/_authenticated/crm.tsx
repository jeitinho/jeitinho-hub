import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Inbox, Users, FileDown, ExternalLink, Flame, BellRing } from "lucide-react";
import { PriorityBoard } from "@/components/crm/priority-board";
import { FollowupsPanel } from "@/components/crm/followups-panel";
import {
  convertProspectToClient,
  fetchLeads,
  fetchProspects,
  qualifyLead,
  setLeadStatus,
  type Prospect,
} from "@/lib/crm/crm";

export const Route = createFileRoute("/_authenticated/crm")({
  component: CrmPage,
  head: () => ({ meta: [{ title: "CRM — JEITINHO" }] }),
});

type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost" | "spam";
const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  converted: "Converti",
  lost: "Perdu",
  spam: "Spam",
};
const PROSPECT_STATUS_LABEL: Record<Prospect["status"], string> = {
  new: "Nouveau",
  contacted: "Contacté",
  quoted: "Devis",
  negotiating: "Négociation",
  won: "Converti / gagné",
  lost: "Perdu",
};

function fmtRange(start: string | null, end: string | null) {
  if (!start && !end) return null;
  if (start && end && start !== end) return `${start} → ${end}`;
  return start ?? end;
}

function CrmPage() {
  return (
    <PageShell
      eyebrow="Pipeline commercial"
      title="CRM"
      description="Les leads du site jeitinho.fr arrivent ici automatiquement — qualifiez-les en prospects, puis en clients."
    >
      <Tabs defaultValue="priorites">
        <TabsList>
          <TabsTrigger value="priorites"><Flame className="mr-1.5 h-3.5 w-3.5" />Priorités</TabsTrigger>
          <TabsTrigger value="relances"><BellRing className="mr-1.5 h-3.5 w-3.5" />Relances</TabsTrigger>
          <TabsTrigger value="leads"><Inbox className="mr-1.5 h-3.5 w-3.5" />Leads</TabsTrigger>
          <TabsTrigger value="prospects"><Users className="mr-1.5 h-3.5 w-3.5" />Prospects</TabsTrigger>
        </TabsList>
        <TabsContent value="priorites" className="mt-6"><PriorityBoard /></TabsContent>
        <TabsContent value="relances" className="mt-6"><FollowupsPanel /></TabsContent>
        <TabsContent value="leads" className="mt-6"><LeadsInbox /></TabsContent>
        <TabsContent value="prospects" className="mt-6"><ProspectsPipeline /></TabsContent>
      </Tabs>
    </PageShell>
  );
}

function LeadsInbox() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | LeadStatus>("all");
  const { data, isLoading, error } = useQuery({ queryKey: ["leads"], queryFn: fetchLeads });
  const rows = (data ?? []).filter((lead) => filter === "all" || lead.status === filter);

  const setStatus = async (id: string, status: LeadStatus) => {
    try {
      await setLeadStatus(id, status);
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["crm", "priority-leads"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de modifier le lead");
    }
  };

  const qualify = async (leadId: string) => {
    try {
      await qualifyLead(leadId);
      toast.success("Lead qualifié en prospect.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["leads"] }),
        qc.invalidateQueries({ queryKey: ["prospects"] }),
        qc.invalidateQueries({ queryKey: ["crm", "priority-leads"] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de qualifier le lead");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all" as const, label: "Tous" },
          ...Object.entries(LEAD_STATUS_LABEL).map(([value, label]) => ({ value: value as LeadStatus, label })),
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`rounded-full border px-3 py-1.5 text-xs ${filter === s.value ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : error ? (
        <Card className="border-destructive/40 p-8">
          <h3 className="font-semibold">Impossible de charger les leads</h3>
          <p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p>
        </Card>
      ) : !rows.length ? (
        <Card className="border-dashed p-16 text-center">
          <Inbox className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h3 className="text-xl">Aucun lead</h3>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((lead) => (
            <Card key={lead.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-1 flex items-center gap-2">
                    <span className="pill">{LEAD_STATUS_LABEL[lead.status as LeadStatus] ?? lead.status}</span>
                    <span className="text-xs text-muted-foreground">{new Date(lead.received_at).toLocaleString("fr-FR")}</span>
                  </div>
                  <h3 className="font-medium">{lead.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {[lead.email, lead.phone].filter(Boolean).join(" · ") || "Pas de contact"}
                    {lead.party_size ? ` · ${lead.party_size} pers.` : ""}
                    {fmtRange(lead.travel_start, lead.travel_end) ? ` · ${fmtRange(lead.travel_start, lead.travel_end)}` : ""}
                  </p>
                  {lead.message && <p className="mt-2 text-sm text-foreground/80">{lead.message}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {lead.status === "new" && (
                    <Button variant="outline" size="sm" onClick={() => setStatus(lead.id, "contacted")}>Marquer contacté</Button>
                  )}
                  {!lead.prospect_id && !(["spam", "lost"] as string[]).includes(lead.status) && (
                    <Button size="sm" className="btn-primary" onClick={() => qualify(lead.id)}>Qualifier en prospect</Button>
                  )}
                  {lead.prospect_id && <span className="self-center text-xs text-muted-foreground">→ déjà un prospect</span>}
                  {lead.status !== "spam" && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setStatus(lead.id, "spam")}>Spam</Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ProspectsPipeline() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | Prospect["status"]>("all");
  const { data, isLoading, error } = useQuery({ queryKey: ["prospects"], queryFn: fetchProspects });
  const rows = (data ?? []).filter((prospect) => filter === "all" || prospect.status === filter);

  const convertToClient = async (prospect: Prospect) => {
    try {
      const result = await convertProspectToClient(prospect.id);
      if (!result.client_id) throw new Error("La conversion n'a pas retourné de client.");
      toast.success("Prospect converti en client.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["prospects"] }),
        qc.invalidateQueries({ queryKey: ["clients"] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de convertir le prospect");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all" as const, label: "Tous" },
          ...Object.entries(PROSPECT_STATUS_LABEL).map(([value, label]) => ({ value: value as Prospect["status"], label })),
        ].map((s) => (
          <button
            key={s.value}
            onClick={() => setFilter(s.value)}
            className={`rounded-full border px-3 py-1.5 text-xs ${filter === s.value ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : error ? (
        <Card className="border-destructive/40 p-8">
          <h3 className="font-semibold">Impossible de charger les prospects</h3>
          <p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p>
        </Card>
      ) : !rows.length ? (
        <Card className="border-dashed p-16 text-center">
          <Users className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h3 className="text-xl">Aucun prospect</h3>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((prospect) => (
            <Card key={prospect.id} className="flex flex-wrap items-center justify-between gap-4 p-4">
              <div>
                <div className="mb-1 flex items-center gap-2">
                  <span className="pill">{PROSPECT_STATUS_LABEL[prospect.status]}</span>
                  <span className="text-xs text-muted-foreground">{new Date(prospect.created_at).toLocaleDateString("fr-FR")}</span>
                </div>
                <h3 className="font-medium">{prospect.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {[prospect.email, prospect.phone].filter(Boolean).join(" · ") || "Pas de contact"}
                  {prospect.party_size ? ` · ${prospect.party_size} pers.` : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to="/devis/new" search={{ prospectId: prospect.id }}>
                  <Button variant="outline" size="sm"><FileDown className="mr-1.5 h-3.5 w-3.5" />Créer un devis</Button>
                </Link>
                {!prospect.client_id && prospect.status !== "lost" && (
                  <Button size="sm" className="btn-primary" onClick={() => convertToClient(prospect)}>Convertir en client</Button>
                )}
                {prospect.client_id && (
                  <Link to="/clients/$id" params={{ id: prospect.client_id }}>
                    <Button variant="ghost" size="sm"><ExternalLink className="mr-1.5 h-3.5 w-3.5" />Voir le client</Button>
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

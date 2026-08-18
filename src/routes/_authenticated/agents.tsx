import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bot, ChevronRight, CirclePause, Play, ShieldCheck } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AGENTS, type AgentDefinition } from "@/lib/agents/registry";

export const Route = createFileRoute("/_authenticated/agents")({
  component: AgentsPage,
  head: () => ({ meta: [{ title: "Agents — JEITINHO" }] }),
});

function domainLabel(domain: AgentDefinition["domain"]) {
  const labels: Record<AgentDefinition["domain"], string> = {
    revenue: "Revenue",
    sales: "Sales",
    concierge: "Concierge",
    content: "Contenu",
    partner: "Partenaires",
    executive: "Direction",
    acquisition: "Acquisition",
    retention: "Fidélisation",
    operations: "Opérations",
    finance: "Finance",
    product: "Produit",
  };
  return labels[domain];
}

function statusLabel(status: AgentDefinition["status"]) {
  if (status === "active") return "Actif";
  if (status === "paused") return "En pause";
  return "Planifié";
}

function AgentsPage() {
  const [selectedId, setSelectedId] = useState(AGENTS[0]?.id ?? "");
  const [paused, setPaused] = useState<string[]>([]);
  const selected = useMemo(() => AGENTS.find((a) => a.id === selectedId), [selectedId]);

  const togglePaused = (id: string) => {
    setPaused((current) => current.includes(id) ? current.filter((x) => x !== id) : [...current, id]);
  };

  return (
    <PageShell
      eyebrow="Intelligence"
      title="Agents JEITINHO"
      description="Les agents travaillent à l'intérieur du Hub. Le Hub reste la source de vérité des données, des clients, des produits, des devis et des voyages."
    >
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="tracked text-[10px] text-muted-foreground">Écosystème</p>
              <p className="mt-1 text-sm text-muted-foreground">{AGENTS.length} agents définis · autonomie par défaut N1/N2</p>
            </div>
            <Badge variant="outline" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Contrôlé
            </Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {AGENTS.map((agent) => {
              const isSelected = selectedId === agent.id;
              const isPaused = paused.includes(agent.id);
              return (
                <button
                  key={agent.id}
                  onClick={() => setSelectedId(agent.id)}
                  className={`text-left rounded-xl border p-4 transition-colors ${isSelected ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card hover:bg-muted/30"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-lg bg-primary/10 p-2 text-primary"><Bot className="h-4 w-4" /></div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{agent.name}</div>
                        <div className="tracked mt-1 text-[9px] text-muted-foreground">{domainLabel(agent.domain)}</div>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-[10px]">{agent.autonomy}</Badge>
                  </div>
                  <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{agent.description}</p>
                  <div className="mt-4 flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{isPaused ? "En pause" : statusLabel(agent.status)}</span>
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <Card className="h-fit border-border/60 p-5 xl:sticky xl:top-20">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="tracked text-[10px] text-muted-foreground">Agent</p>
                  <h2 className="mt-1 text-xl" style={{ fontFamily: "Fraunces, serif" }}>{selected.name}</h2>
                </div>
                <Badge variant="outline">{selected.autonomy}</Badge>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{selected.description}</p>

              <Separator className="my-5" />

              <div>
                <p className="tracked text-[10px] text-muted-foreground">Sorties</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selected.outputs.map((output) => <Badge key={output} variant="secondary">{output}</Badge>)}
                </div>
              </div>

              <div className="mt-5">
                <p className="tracked text-[10px] text-muted-foreground">Outils autorisés</p>
                <div className="mt-3 space-y-2">
                  {selected.tools.map((tool) => <div key={tool} className="rounded-md bg-muted/40 px-3 py-2 text-xs font-mono">{tool}</div>)}
                </div>
              </div>

              <Separator className="my-5" />

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => togglePaused(selected.id)}>
                  {paused.includes(selected.id) ? <Play className="mr-2 h-4 w-4" /> : <CirclePause className="mr-2 h-4 w-4" />}
                  {paused.includes(selected.id) ? "Réactiver" : "Mettre en pause"}
                </Button>
                <Button className="flex-1" disabled>
                  Lancer
                </Button>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">Le bouton « Lancer » sera branché aux exécutions serveur et au journal d'audit dans l'étape d'intégration des providers IA.</p>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Sélectionnez un agent.</div>
          )}
        </Card>
      </div>
    </PageShell>
  );
}

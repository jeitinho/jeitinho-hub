import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Bot, ChevronDown, ChevronUp } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AGENTS,
  fetchAgentRuns,
  fmtDateTime,
  type AgentDefinition,
  type AgentRun,
} from "@/lib/ops/ops";

export const Route = createFileRoute("/_authenticated/agents")({
  component: AgentsPage,
  head: () => ({ meta: [{ title: "Agents — JEITINHO" }] }),
});

const STATUS_STYLE: Record<AgentRun["status"], string> = {
  ok: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  partiel: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  erreur: "bg-destructive/15 text-destructive",
};

function AgentsPage() {
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ops", "agent-runs"],
    queryFn: () => fetchAgentRuns(),
    refetchInterval: 120_000,
  });
  const [open, setOpen] = useState<string | null>(null);

  const byAgent = useMemo(() => {
    const map = new Map<string, AgentRun[]>();
    for (const r of data) map.set(r.agent, [...(map.get(r.agent) ?? []), r]);
    return map;
  }, [data]);

  // Agents qui écrivent dans agent_runs sans figurer dans le registre : affichés « non déclaré ».
  const list = useMemo<(AgentDefinition & { undeclared?: boolean })[]>(() => {
    const known = new Set(AGENTS.map((a) => a.key));
    const extra = [...byAgent.keys()]
      .filter((k) => !known.has(k))
      .map((k) => ({
        key: k,
        name: k,
        schedule: "Non déclaré dans le registre de l'ERP",
        output: "—",
        undeclared: true,
      }));
    return [...AGENTS, ...extra];
  }, [byAgent]);

  return (
    <PageShell
      eyebrow="Pilotage"
      title="Agents"
      description="Les agents IA qui tournent chaque jour, leur dernier passage et leurs rapports."
    >
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <Card className="border-destructive/40 p-6 text-sm">{(error as Error).message}</Card>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((a) => {
          const runs = byAgent.get(a.key) ?? [];
          const last = runs[0];
          return (
            <Card key={a.key} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">{a.name}</h3>
                  {a.undeclared && <Badge variant="outline">non déclaré</Badge>}
                </div>
                {last ? (
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_STYLE[last.status]}`}
                  >
                    {last.status}
                  </span>
                ) : (
                  <Badge variant="outline">pas encore passé</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">{a.schedule}</p>
              <p className="text-xs">{a.output}</p>
              {last && (
                <div className="rounded-md bg-muted/40 p-3 text-xs">
                  <p className="mb-1 text-muted-foreground">
                    Dernier passage : {fmtDateTime(last.started_at)}
                  </p>
                  <p>{last.summary ?? "—"}</p>
                </div>
              )}
              {runs.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start"
                  onClick={() => setOpen(open === a.key ? null : a.key)}
                >
                  {open === a.key ? (
                    <ChevronUp className="mr-1.5 h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Historique ({runs.length})
                </Button>
              )}
              {open === a.key && (
                <div className="space-y-2">
                  {runs.slice(0, 10).map((r) => (
                    <details key={r.id} className="rounded-md border border-border/60 p-2 text-xs">
                      <summary className="cursor-pointer">
                        {fmtDateTime(r.started_at)} · {r.status} · {r.summary ?? ""}
                      </summary>
                      {r.report && (
                        <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap font-sans">
                          {r.report}
                        </pre>
                      )}
                    </details>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}

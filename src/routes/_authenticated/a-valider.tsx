import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Copy, Send, Clock, X, Pencil, Inbox, ExternalLink } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { snoozeTask, markTaskSent, type CrmTask } from "@/lib/crm/crm";
import {
  TASK_KIND_LABELS,
  copyText,
  fetchValidationQueue,
  fmtDateTime,
  markPartnerContacted,
  setTaskStatus,
  updateTaskDraft,
  type ValidationTask,
} from "@/lib/ops/ops";

export const Route = createFileRoute("/_authenticated/a-valider")({
  component: ValidationPage,
  head: () => ({ meta: [{ title: "À valider — JEITINHO" }] }),
});

function ValidationPage() {
  const qc = useQueryClient();
  const [kind, setKind] = useState<string>("all");
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ops", "validation"],
    queryFn: fetchValidationQueue,
    refetchInterval: 60_000,
  });

  const kinds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of data) counts.set(t.kind, (counts.get(t.kind) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);
  const visible = kind === "all" ? data : data.filter((t) => t.kind === kind);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ops", "validation"] });
    qc.invalidateQueries({ queryKey: ["crm", "tasks"] });
  };
  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <PageShell
      eyebrow="Pilotage"
      title="À valider"
      description="Tout ce que les agents ont préparé : réponses aux leads, relances, pitchs partenaires, suivis acheteurs. Rien ne part sans toi."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant={kind === "all" ? "default" : "outline"}
          onClick={() => setKind("all")}
        >
          Tout <span className="ml-1.5 opacity-70">{data.length}</span>
        </Button>
        {kinds.map(([k, n]) => (
          <Button
            key={k}
            size="sm"
            variant={kind === k ? "default" : "outline"}
            onClick={() => setKind(k)}
          >
            {TASK_KIND_LABELS[k] ?? k} <span className="ml-1.5 opacity-70">{n}</span>
          </Button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <Card className="border-destructive/40 p-6 text-sm">{(error as Error).message}</Card>
      )}
      {!isLoading && !error && visible.length === 0 && (
        <Card className="border-dashed p-16 text-center">
          <Inbox className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h3 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>
            Rien à valider
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Les brouillons des agents apparaissent ici dès qu'ils sont prêts.
          </p>
        </Card>
      )}

      <div className="space-y-3">
        {visible.map((t) => (
          <TaskCard key={t.id} task={t} act={act} />
        ))}
      </div>
    </PageShell>
  );
}

function TaskCard({
  task,
  act,
}: {
  task: ValidationTask;
  act: (fn: () => Promise<unknown>, msg: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.message_draft ?? "");
  const overdue = new Date(task.due_at).getTime() < Date.now();

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{TASK_KIND_LABELS[task.kind] ?? task.kind}</Badge>
            <span className="pill">{task.channel}</span>
            <span className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
              échéance {fmtDateTime(task.due_at)}
            </span>
          </div>
          <h3 className="text-sm font-medium">{task.title}</h3>
          <SourceLink task={task} />
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => act(() => copyText(draft), "Message copié")}
            disabled={!draft}
          >
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copier
          </Button>
          <Button variant="outline" size="sm" onClick={() => setEditing((v) => !v)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            {editing ? "Fermer" : "Modifier"}
          </Button>
          <Button
            size="sm"
            onClick={() =>
              act(async () => {
                if (task.kind === "relance_devis") await markTaskSent(task as unknown as CrmTask);
                else await setTaskStatus(task.id, "envoye");
                if (task.partner_id) await markPartnerContacted(task.partner_id);
              }, "Marqué comme envoyé")
            }
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Envoyé
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => act(() => snoozeTask(task.id, 2), "Reporté de 2 jours")}
          >
            <Clock className="mr-1.5 h-3.5 w-3.5" />
            +2 j
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => act(() => setTaskStatus(task.id, "annule"), "Écarté")}
          >
            <X className="mr-1.5 h-3.5 w-3.5" />
            Écarter
          </Button>
        </div>
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea rows={10} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <Button
            size="sm"
            onClick={() =>
              act(() => updateTaskDraft(task.id, draft), "Brouillon enregistré").then(() =>
                setEditing(false),
              )
            }
          >
            <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
            Enregistrer
          </Button>
        </div>
      ) : (
        draft && (
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-sm leading-relaxed">
            {draft}
          </pre>
        )
      )}
    </Card>
  );
}

/** Lien vers l'objet d'origine de la tâche (client, devis, partenaire, demande). */
function SourceLink({ task }: { task: ValidationTask }) {
  const cls = "mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline";
  const icon = <ExternalLink className="h-3 w-3" />;
  if (task.quote_id)
    return (
      <Link to="/devis/$id" params={{ id: task.quote_id }} className={cls}>
        {icon}Ouvrir le devis
      </Link>
    );
  if (task.client_id)
    return (
      <Link to="/clients/$id" params={{ id: task.client_id }} className={cls}>
        {icon}Ouvrir la fiche client
      </Link>
    );
  if (task.partner_id)
    return (
      <Link to="/partenaires" search={{ id: task.partner_id }} className={cls}>
        {icon}Ouvrir la fiche partenaire
      </Link>
    );
  if (task.lead_id || task.prospect_id)
    return (
      <Link to="/crm" className={cls}>
        {icon}Ouvrir la demande
      </Link>
    );
  return null;
}

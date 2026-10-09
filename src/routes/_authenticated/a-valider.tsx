import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { Inbox, Zap } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TASK_KIND_LABELS, fetchValidationQueue } from "@/lib/ops/ops";
import { bucketOf, fetchTaskRecipients, planSend, type ChannelBucket } from "@/lib/ops/send";
import { BurstMode } from "@/components/a-valider/burst-mode";
import { ChannelCounters, type QueueItem } from "@/components/a-valider/shared";
import { TaskCard } from "@/components/a-valider/task-card";
import {
  VALIDATION_KEY,
  useValidationActions,
} from "@/components/a-valider/use-validation-actions";

/** ?task=<id> (depuis le cockpit) : la page descend sur cette tâche et la met en évidence. */
const searchSchema = z.object({ task: z.string().optional().catch(undefined) });

export const Route = createFileRoute("/_authenticated/a-valider")({
  validateSearch: searchSchema,
  component: ValidationPage,
  head: () => ({ meta: [{ title: "À envoyer — JEITINHO" }] }),
});

const BUCKET_LABELS: Record<ChannelBucket, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  instagram: "Instagram",
  sans_contact: "Sans contact",
  autre: "Autre canal",
};

function ValidationPage() {
  const actions = useValidationActions();
  const { task: focusTask } = Route.useSearch();
  const [kind, setKind] = useState<string>("all");
  const [bucket, setBucket] = useState<ChannelBucket | "all">("all");
  const [langs, setLangs] = useState<Record<string, string>>({});
  const [burst, setBurst] = useState<{ ids: string[]; label: string } | null>(null);

  const queue = useQuery({
    queryKey: VALIDATION_KEY,
    queryFn: fetchValidationQueue,
    refetchInterval: 60_000,
  });
  const data = useMemo(() => queue.data ?? [], [queue.data]);
  const ids = useMemo(() => data.map((t) => t.id).sort(), [data]);
  const recipients = useQuery({
    queryKey: ["ops", "task-recipients", ids],
    queryFn: () => fetchTaskRecipients(ids),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
  });

  const items = useMemo<QueueItem[]>(() => {
    const byTask = new Map((recipients.data ?? []).map((r) => [r.task_id, r]));
    return data.map((task) => ({
      task,
      plan: planSend(task, byTask.get(task.id), { lang: langs[task.id] }),
    }));
  }, [data, recipients.data, langs]);
  const itemsById = useMemo(() => new Map(items.map((i) => [i.task.id, i])), [items]);
  const getItem = useCallback((id: string) => itemsById.get(id), [itemsById]);
  const setLang = useCallback(
    (taskId: string, key: string) => setLangs((prev) => ({ ...prev, [taskId]: key })),
    [],
  );

  const kinds = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of data) counts.set(t.kind, (counts.get(t.kind) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [data]);
  const byKind = useMemo(
    () => (kind === "all" ? items : items.filter((i) => i.task.kind === kind)),
    [items, kind],
  );
  const bucketCounts = useMemo(() => {
    const c: Record<ChannelBucket, number> = {
      whatsapp: 0,
      email: 0,
      instagram: 0,
      sans_contact: 0,
      autre: 0,
    };
    for (const i of byKind) c[bucketOf(i.plan)]++;
    return c;
  }, [byKind]);
  const visible = useMemo(
    () => (bucket === "all" ? byKind : byKind.filter((i) => bucketOf(i.plan) === bucket)),
    [byKind, bucket],
  );

  const startBurst = () => {
    // Prêts à partir d'abord (contact + brouillon), puis le reste, chacun par échéance.
    const ready = (i: QueueItem) => (i.plan.primary && i.plan.hasDraft ? 0 : 1);
    const ordered = [...visible].sort((a, b) => ready(a) - ready(b));
    const label = [
      kind === "all" ? "Toutes les tâches" : (TASK_KIND_LABELS[kind] ?? kind),
      bucket === "all" ? null : BUCKET_LABELS[bucket],
    ]
      .filter(Boolean)
      .join(" · ");
    setBurst({ ids: ordered.map((i) => i.task.id), label });
  };

  const loading = queue.isLoading || (ids.length > 0 && recipients.isLoading);

  useEffect(() => {
    if (!focusTask || loading) return;
    document
      .getElementById(`task-${focusTask}`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [focusTask, loading]);

  return (
    <PageShell
      eyebrow="Pilotage"
      title="À envoyer"
      description="Tout ce que les agents ont préparé : réponses aux leads, relances, pitchs partenaires, suivis acheteurs. Chaque message part en un clic, rien ne part sans validation."
      actions={
        <Button className="h-11" onClick={startBurst} disabled={loading || !visible.length}>
          <Zap />
          Enchaîner ({visible.length})
        </Button>
      }
    >
      <div className="mb-5 space-y-3">
        <ChannelCounters counts={bucketCounts} active={bucket} onToggle={setBucket} />
        <div className="flex flex-wrap gap-2">
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
      </div>

      {loading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {queue.error && (
        <Card className="border-destructive/40 p-6 text-sm">{(queue.error as Error).message}</Card>
      )}
      {recipients.error && (
        <Card className="mb-3 border-amber-500/40 bg-amber-500/10 p-4 text-sm">
          Contacts indisponibles ({(recipients.error as Error).message}) : les messages restent
          copiables.
        </Card>
      )}
      {!loading && !queue.error && visible.length === 0 && (
        <Card className="border-dashed p-12 text-center sm:p-16">
          <Inbox className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h3 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>
            {data.length ? "Rien pour ce filtre" : "Rien à valider"}
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {data.length
              ? "Les autres tâches attendent sous un autre filtre."
              : "Les brouillons des agents apparaissent ici dès qu'ils sont prêts."}
          </p>
          {data.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                setKind("all");
                setBucket("all");
              }}
            >
              Voir tout
            </Button>
          )}
        </Card>
      )}

      {!loading && (
        <div className="space-y-3">
          {visible.map((i) => (
            <div
              key={i.task.id}
              id={`task-${i.task.id}`}
              className={
                focusTask === i.task.id
                  ? "scroll-mt-24 rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-background"
                  : undefined
              }
            >
              <TaskCard item={i} actions={actions} onLang={(k) => setLang(i.task.id, k)} />
            </div>
          ))}
        </div>
      )}

      {burst && (
        <BurstMode
          ids={burst.ids}
          scopeLabel={burst.label}
          getItem={getItem}
          isFetching={queue.isFetching || recipients.isFetching}
          actions={actions}
          onLang={setLang}
          onClose={() => setBurst(null)}
        />
      )}
    </PageShell>
  );
}

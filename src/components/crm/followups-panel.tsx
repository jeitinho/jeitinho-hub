import { useEffect, useRef } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Copy, Send, Clock, X, BellRing } from "lucide-react";
import {
  cancelTask,
  fetchOpenTasks,
  fetchSentQuotes,
  generateDueFollowups,
  markTaskSent,
  snoozeTask,
  type CrmTask,
} from "@/lib/crm/crm";

export function FollowupsPanel() {
  const qc = useQueryClient();
  const generated = useRef(false);

  const { data: quotes } = useQuery({ queryKey: ["crm", "sent-quotes"], queryFn: fetchSentQuotes });
  const { data: tasks, isLoading, error } = useQuery({ queryKey: ["crm", "tasks"], queryFn: fetchOpenTasks });

  // Génération idempotente des relances échues à l'ouverture de la vue.
  useEffect(() => {
    if (generated.current || !quotes || !tasks) return;
    generated.current = true;
    generateDueFollowups(quotes, tasks)
      .then((n) => {
        if (n > 0) {
          toast.info(`${n} relance(s) préparée(s) — à valider avant envoi.`);
          qc.invalidateQueries({ queryKey: ["crm", "tasks"] });
        }
      })
      .catch((e) => toast.error(e.message));
  }, [quotes, tasks, qc]);

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["crm", "tasks"] });
    qc.invalidateQueries({ queryKey: ["crm", "sent-quotes"] });
  };

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (isLoading) return <div className="text-sm text-muted-foreground">Chargement…</div>;
  if (error)
    return (
      <Card className="border-destructive/40 p-8">
        <h3 className="font-semibold">Impossible de charger les relances</h3>
        <p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p>
      </Card>
    );

  const rows = (tasks ?? []).filter((t) => new Date(t.due_at).getTime() <= Date.now() + 86_400_000);

  if (!rows.length) {
    return (
      <Card className="border-dashed p-16 text-center">
        <BellRing className="mx-auto mb-4 h-8 w-8 text-primary" />
        <h3 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>Aucune relance à traiter</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Les relances J+1 / J+3 / J+7 / J+14 apparaissent ici dès qu'un devis envoyé arrive à échéance. Rien n'est envoyé automatiquement.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {rows.map((t: CrmTask) => (
        <Card key={t.id} className="space-y-3 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2">
                <span className="pill">{t.channel}</span>
                <span className="text-xs text-muted-foreground">
                  échéance {new Date(t.due_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                </span>
              </div>
              <h3 className="text-sm font-medium">{t.title}</h3>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(t.message_draft ?? "");
                  toast.success("Message copié.");
                }}
              >
                <Copy className="mr-1.5 h-3.5 w-3.5" />Copier
              </Button>
              <Button size="sm" className="btn-primary" onClick={() => act(() => markTaskSent(t), "Relance marquée envoyée.")}>
                <Send className="mr-1.5 h-3.5 w-3.5" />Marquer envoyé
              </Button>
              <Button variant="ghost" size="sm" onClick={() => act(() => snoozeTask(t.id), "Relance reportée de 2 jours.")}>
                <Clock className="mr-1.5 h-3.5 w-3.5" />Reporter
              </Button>
              <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => act(() => cancelTask(t.id), "Relance annulée.")}>
                <X className="mr-1.5 h-3.5 w-3.5" />Annuler
              </Button>
            </div>
          </div>
          {t.message_draft && (
            <p className="whitespace-pre-wrap rounded-md border border-border/60 bg-muted/30 p-3 text-sm text-foreground/80">
              {t.message_draft}
            </p>
          )}
          {t.quote_id && (
            <Link to="/devis/$id" params={{ id: t.quote_id }} className="text-xs text-primary underline-offset-4 hover:underline">
              Ouvrir le devis
            </Link>
          )}
        </Card>
      ))}
    </div>
  );
}

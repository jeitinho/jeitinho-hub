import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { AskRafaelDialog } from "@/components/home/ask-rafael-dialog";
import {
  REQUEST_STATUS,
  TZ,
  answerRequest,
  fetchCmEvents,
  fetchTeamRequests,
  type TeamRequest,
} from "@/lib/ops/cm";

export const Route = createFileRoute("/_authenticated/demandes")({
  component: RequestsPage,
  head: () => ({ meta: [{ title: "Demandes équipe — JEITINHO" }] }),
});

function when(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

function RequestCard({ r, canAnswer }: { r: TeamRequest; canAnswer: boolean }) {
  const qc = useQueryClient();
  const [answer, setAnswer] = useState(r.answer ?? "");
  const st = REQUEST_STATUS[r.status];
  const done = r.status === "faite" || r.status === "refusee";
  const save = useMutation({
    mutationFn: (status: TeamRequest["status"]) => answerRequest(r.id, { status, answer }),
    onSuccess: (_d, status) => {
      toast.success(
        status === "en_cours"
          ? "Marquée en cours."
          : `${r.requester_name ?? "La personne"} est prévenue sur WhatsApp.`,
      );
      qc.invalidateQueries({ queryKey: ["team-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {canAnswer && r.requester_name ? `${r.requester_name} · ` : ""}
            {when(r.created_at)}
            {r.needed_by
              ? ` · pour le ${new Date(`${r.needed_by}T12:00:00`).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}`
              : ""}
          </p>
          <p className="mt-1 font-medium leading-snug">{r.subject}</p>
        </div>
        <span className={`rounded px-1.5 py-0.5 text-[11px] ${st.tone}`}>{st.label}</span>
      </div>
      {r.details && (
        <p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.details}</p>
      )}

      {canAnswer && !done ? (
        <div className="space-y-2 border-t border-border/60 pt-3">
          <Textarea
            rows={3}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Ta réponse (envoyée sur WhatsApp quand tu marques la demande faite ou répondue)."
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              className="btn-primary"
              disabled={save.isPending}
              onClick={() => save.mutate("faite")}
            >
              C'est fait
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={save.isPending || !answer.trim()}
              onClick={() => save.mutate("refusee")}
            >
              Répondre sans faire
            </Button>
            {r.status === "ouverte" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={save.isPending}
                onClick={() => save.mutate("en_cours")}
              >
                Je m'en occupe
              </Button>
            )}
          </div>
        </div>
      ) : r.answer ? (
        <div className="rounded-md bg-muted/50 p-3 text-sm">
          <p className="tracked mb-1 text-[10px] text-muted-foreground">Réponse de Rafael</p>
          <p className="whitespace-pre-wrap">{r.answer}</p>
        </div>
      ) : null}
    </Card>
  );
}

function RequestsPage() {
  const { canManage } = useAuth();
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["team-requests"],
    queryFn: fetchTeamRequests,
    refetchInterval: 120_000,
  });
  const events = useQuery({ queryKey: ["cm-events"], queryFn: fetchCmEvents });
  const open = data.filter((r) => r.status === "ouverte" || r.status === "en_cours");
  const closed = data.filter((r) => !(r.status === "ouverte" || r.status === "en_cours"));

  return (
    <PageShell
      eyebrow="Équipe"
      title={canManage ? "Demandes de l'équipe" : "Mes demandes"}
      description={
        canManage
          ? "Ce que l'équipe attend de toi. Ta réponse part sur WhatsApp dès que tu marques la demande faite ou répondue."
          : "Tout ce qui sort des postages : budget, pub, partenaires, infos à confirmer. Rafael est prévenu sur WhatsApp."
      }
      actions={!canManage ? <AskRafaelDialog events={events.data ?? []} /> : undefined}
    >
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : error ? (
        <Card className="border-destructive/40 p-4 text-sm">{(error as Error).message}</Card>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>
              En attente {open.length > 0 && <span className="pill ml-1">{open.length}</span>}
            </h2>
            {open.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">Aucune demande en attente.</Card>
            ) : (
              open.map((r) => <RequestCard key={r.id} r={r} canAnswer={canManage} />)
            )}
          </section>
          <section className="space-y-3">
            <h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>
              Traitées
            </h2>
            {closed.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground">Rien pour l'instant.</Card>
            ) : (
              closed.slice(0, 30).map((r) => <RequestCard key={r.id} r={r} canAnswer={canManage} />)
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}

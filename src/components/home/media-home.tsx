import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  channelLabel,
  fetchMyPlan,
  nextStep,
  rioDay,
  setItemStatus,
  type MyItem,
} from "@/lib/ops/my-work";

const TZ = "America/Sao_Paulo";

function slot(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = d.toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: TZ,
  });
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  return `${day} · ${time}`;
}

function deadlineBadge(it: MyItem) {
  if (!it.deadline) return null;
  const today = rioDay(new Date());
  const late = it.deadline < today;
  const isToday = it.deadline === today;
  const label = new Date(`${it.deadline}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  });
  return (
    <Badge
      variant="outline"
      className={
        late
          ? "border-destructive/50 text-destructive"
          : isToday
            ? "border-primary/50 text-primary"
            : ""
      }
    >
      {late ? "En retard · " : "À finir "}
      {label} 18h
    </Badge>
  );
}

function ItemCard({ it }: { it: MyItem }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const step = nextStep(it.status);
  const advance = useMutation({
    mutationFn: () => setItemStatus(it.id, step!.to),
    onSuccess: () => {
      toast.success(step!.to === "publie" ? "Bravo, c'est publié." : "Noté : c'est produit.");
      qc.invalidateQueries({ queryKey: ["my-plan"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs text-muted-foreground">
            {slot(it.planned_at)} · {channelLabel(it)}
          </p>
          <p className="mt-1 font-medium leading-snug">{it.title}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {deadlineBadge(it)}
            {it.source_url && (
              <a
                href={it.source_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
              >
                Source <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
        {step && (
          <Button size="sm" onClick={() => advance.mutate()} disabled={advance.isPending}>
            <Check className="mr-1 h-4 w-4" />
            {step.label}
          </Button>
        )}
      </div>
      {it.notes && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {open ? "Masquer le kit" : "Voir le kit (process, légendes, hashtags)"}
          </button>
          {open && (
            <pre className="mt-2 max-h-[28rem] overflow-auto whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-sans text-xs leading-relaxed">
              {it.notes}
            </pre>
          )}
        </>
      )}
    </Card>
  );
}

function Section({
  title,
  hint,
  items,
  empty,
}: {
  title: string;
  hint?: string;
  items: MyItem[];
  empty: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>
          {title}
        </h2>
        {items.length > 0 && <span className="pill">{items.length}</span>}
      </div>
      {hint && <p className="-mt-2 text-xs text-muted-foreground">{hint}</p>}
      {items.length === 0 ? (
        <Card className="p-4 text-sm text-muted-foreground">{empty}</Card>
      ) : (
        items.map((it) => <ItemCard key={it.id} it={it} />)
      )}
    </section>
  );
}

/** Accueil des profils média (ex. Lili) : uniquement son travail, prêt à faire. */
export function MediaHome() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["my-plan"],
    queryFn: fetchMyPlan,
    refetchInterval: 300_000,
  });
  if (isLoading)
    return <Card className="p-6 text-sm text-muted-foreground">Chargement de ton plan…</Card>;
  if (error)
    return <Card className="p-6 text-sm text-destructive">{(error as Error).message}</Card>;
  const plan = data!;
  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-8">
        <Section
          title="À publier aujourd'hui"
          hint="Heure de Rio. Programme-le dans Metricool (Instagram + TikTok) si ce n'est pas déjà fait."
          items={plan.today}
          empty="Rien à publier aujourd'hui."
        />
        <Section
          title="À produire"
          hint="Process carrousel : ouvre le kit de chaque contenu."
          items={plan.toProduce}
          empty="Rien en production."
        />
      </div>
      <div className="space-y-8">
        <Section
          title="Prêt, à programmer"
          items={plan.toSchedule}
          empty="Rien en attente de programmation."
        />
        <Section
          title="Blog"
          hint="Ton sujet de la semaine, avec le brief complet."
          items={plan.blog}
          empty="Pas de sujet blog en cours."
        />
      </div>
    </div>
  );
}

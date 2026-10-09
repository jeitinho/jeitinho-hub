import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  Send,
  Pencil,
  X,
  Check,
  Undo2,
  ExternalLink,
  MessageCircle,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  copyText,
  fetchWhatsappPosts,
  rejectWhatsappPost,
  setWhatsappStatus,
  updateWhatsappContent,
  WHATSAPP_REJECTION_LABELS,
  WHATSAPP_STATUS_LABELS,
  type WhatsappPost,
  type WhatsappRejectionReason,
} from "@/lib/ops/ops";

export const Route = createFileRoute("/_authenticated/whatsapp")({
  component: WhatsappPage,
  head: () => ({ meta: [{ title: "Groupe WhatsApp — JEITINHO" }] }),
});

const SLOT_LABEL: Record<string, string> = {
  info_du_jour: "Info du jour",
  bon_plan: "Bon plan",
  sortie: "Sortie",
  extra: "Extra",
};
const STATUS_VARIANT: Record<
  WhatsappPost["status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
  brouillon: "outline",
  valide: "secondary",
  envoye: "default",
  erreur: "destructive",
  annule: "outline",
};

function mondayOf(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - day);
  return x;
}

function WhatsappPage() {
  const qc = useQueryClient();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 7 * 86_400_000), [weekStart]);
  const key = ["ops", "whatsapp", weekStart.toISOString()];
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: key,
    queryFn: () => fetchWhatsappPosts(weekStart.toISOString(), weekEnd.toISOString()),
  });

  const byDay = useMemo(() => {
    const map = new Map<string, WhatsappPost[]>();
    for (const p of data) {
      const k = new Date(p.scheduled_at).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        timeZone: "America/Sao_Paulo",
      });
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    return Array.from(map.entries());
  }, [data]);

  const act = async (fn: () => Promise<unknown>, msg: string) => {
    try {
      await fn();
      toast.success(msg);
      qc.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const sent = data.filter((p) => p.status === "envoye").length;

  return (
    <PageShell
      eyebrow="Contenu"
      title="Groupe WhatsApp"
      description="« Le Jeitinho de Rio » : les posts préparés par l'agent Studio. Copie, colle dans le groupe, marque comme envoyé."
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * 86_400_000))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Semaine du {weekStart.toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * 86_400_000))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">
        {data.length} posts cette semaine · {sent} postés
      </p>
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <Card className="border-destructive/40 p-6 text-sm">{(error as Error).message}</Card>
      )}
      {!isLoading && !error && data.length === 0 && (
        <Card className="border-dashed p-16 text-center">
          <MessageCircle className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h3 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>
            Aucun post pour cette semaine
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            L'agent Studio prépare les posts chaque dimanche soir.
          </p>
        </Card>
      )}
      <div className="space-y-6">
        {byDay.map(([day, posts]) => (
          <div key={day}>
            <h2 className="mb-2 text-sm font-semibold capitalize">{day}</h2>
            <div className="grid gap-3 lg:grid-cols-3">
              {posts.map((p) => (
                <PostCard key={p.id} post={p} act={act} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}

function PostCard({
  post,
  act,
}: {
  post: WhatsappPost;
  act: (fn: () => Promise<unknown>, msg: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(post.content);
  // Le texte enregistré a changé (autre onglet, agent, rechargement) : on resynchronise.
  useEffect(() => {
    if (!editing) setContent(post.content);
  }, [post.content, editing]);
  const isSent = post.status === "envoye";
  const time = new Date(post.scheduled_at).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const cancelEdit = () => {
    setContent(post.content);
    setEditing(false);
  };
  return (
    <Card
      className={`flex flex-col gap-3 p-4 ${isSent || post.status === "annule" ? "opacity-60" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold">{time}</span>
        <Badge variant="secondary">{SLOT_LABEL[post.slot] ?? post.slot}</Badge>
        <Badge variant={STATUS_VARIANT[post.status]}>
          {WHATSAPP_STATUS_LABELS[post.status] ?? post.status}
        </Badge>
        {post.status === "annule" && post.rejection_reason && (
          <span className="text-xs text-muted-foreground">
            ({WHATSAPP_REJECTION_LABELS[post.rejection_reason] ?? post.rejection_reason})
          </span>
        )}
        {post.includes_manual_link && <Badge variant="outline">lien Manuel</Badge>}
      </div>
      {post.notified_at && (
        <p className="text-xs text-muted-foreground">
          <MessageCircle className="mr-1 inline h-3 w-3" />
          reçu sur WhatsApp à{" "}
          {new Date(post.notified_at).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Sao_Paulo",
          })}
        </p>
      )}
      {editing && !isSent ? (
        <>
          <Textarea rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() =>
                act(() => updateWhatsappContent(post.id, content), "Post modifié").then(() =>
                  setEditing(false),
                )
              }
            >
              Enregistrer
            </Button>
            <Button size="sm" variant="ghost" onClick={cancelEdit}>
              Annuler
            </Button>
          </div>
        </>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{content}</p>
      )}
      {post.source_url && (
        <a
          href={post.source_url}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary underline-offset-2 hover:underline"
        >
          <ExternalLink className="mr-1 inline h-3 w-3" />
          Source
        </a>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        <Button size="sm" variant="outline" onClick={() => act(() => copyText(content), "Copié")}>
          <Copy className="mr-1.5 h-3.5 w-3.5" />
          Copier
        </Button>
        {!isSent && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Pencil className="mr-1.5 h-3.5 w-3.5" />
            Modifier
          </Button>
        )}
        {post.status === "brouillon" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => act(() => setWhatsappStatus(post.id, "valide"), "Post validé")}
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Valider
          </Button>
        )}
        {!isSent && post.status !== "annule" && (
          <Button
            size="sm"
            onClick={() => act(() => setWhatsappStatus(post.id, "envoye"), "Marqué posté")}
          >
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Envoyé
          </Button>
        )}
        {(post.status === "annule" || post.status === "valide") && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() =>
              act(() => setWhatsappStatus(post.id, "brouillon"), "Post remis en brouillon")
            }
          >
            <Undo2 className="mr-1.5 h-3.5 w-3.5" />
            Remettre en brouillon
          </Button>
        )}
        {post.status !== "annule" && !isSent && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost">
                <X className="mr-1.5 h-3.5 w-3.5" />
                Écarter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Pourquoi écarter ce post ?</DropdownMenuLabel>
              {(Object.keys(WHATSAPP_REJECTION_LABELS) as WhatsappRejectionReason[]).map(
                (reason) => (
                  <DropdownMenuItem
                    key={reason}
                    onSelect={() => act(() => rejectWhatsappPost(post.id, reason), "Post écarté")}
                  >
                    {WHATSAPP_REJECTION_LABELS[reason]}
                  </DropdownMenuItem>
                ),
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </Card>
  );
}

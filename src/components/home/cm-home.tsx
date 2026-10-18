import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Bot,
  Copy,
  ExternalLink,
  Heart,
  Instagram,
  MapPin,
  MessageSquare,
  Ticket,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { fetchMyPlan } from "@/lib/ops/my-work";
import { channelName } from "@/lib/ops/media";
import {
  REQUEST_STATUS,
  TZ,
  engagement,
  fetchCmAgentNotes,
  fetchCmEvents,
  fetchCmIgPosts,
  fetchCmSales,
  fetchCmTracking,
  fetchTeamRequests,
  summarizeSales,
  type CmEvent,
} from "@/lib/ops/cm";
import { Section } from "./media-home";
import { AskRafaelDialog } from "./ask-rafael-dialog";

const SALES_CHANNEL: Record<string, string> = {
  shotgun: "Shotgun",
  sympla: "Sympla",
  porta: "Sur place",
  manuel: "Ajout manuel",
};

function H2({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <div className="flex items-baseline gap-2">
      <h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>
        {children}
      </h2>
      {!!count && <span className="pill">{count}</span>}
    </div>
  );
}

function daysUntil(iso: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function copy(text: string) {
  navigator.clipboard
    .writeText(text)
    .then(() => toast.success("Lien copié."))
    .catch(() => toast.error("Copie impossible : sélectionne le lien à la main."));
}

/** Une soirée : compte à rebours, billets vendus (jamais de montants), liens relais. */
function EventCard({ ev }: { ev: CmEvent }) {
  const [all, setAll] = useState(false);
  const sales = useQuery({
    queryKey: ["cm-sales", ev.id],
    queryFn: () => fetchCmSales(ev.id),
    refetchInterval: 600_000,
  });
  const tracking = useQuery({
    queryKey: ["cm-tracking", ev.id],
    queryFn: () => fetchCmTracking(ev.id),
    refetchInterval: 600_000,
  });
  const s = summarizeSales(sales.data ?? []);
  const target = ev.presale_target || ev.capacity || 0;
  const pct = target ? Math.min(100, Math.round((s.total / target) * 100)) : 0;
  const d = daysUntil(ev.starts_at);
  const links = tracking.data ?? [];
  const shown = all ? links : links.slice(0, 6);
  const date = ev.starts_at
    ? new Date(ev.starts_at).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: TZ,
      })
    : "Date à confirmer";

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {ev.name}
            {ev.edition ? ` · ${ev.edition}` : ""}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{date}</p>
          {(ev.venue || ev.neighborhood) && (
            <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {[ev.venue, ev.neighborhood].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
        {d !== null && (
          <Badge variant="outline" className={d <= 7 ? "border-primary/50 text-primary" : ""}>
            {d > 1 ? `J-${d}` : d === 1 ? "Demain" : d === 0 ? "Ce soir" : "Passée"}
          </Badge>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between text-sm">
          <span className="inline-flex items-center gap-1.5">
            <Ticket className="h-4 w-4 text-muted-foreground" />
            <strong>{s.total}</strong> billet{s.total > 1 ? "s" : ""} vendu{s.total > 1 ? "s" : ""}
            {target ? <span className="text-muted-foreground"> / objectif {target}</span> : null}
          </span>
          <span className="text-xs text-muted-foreground">+{s.week} sur 7 jours</span>
        </div>
        {target > 0 && <Progress value={pct} className="h-2" />}
        {Object.keys(s.byChannel).length > 0 && (
          <p className="text-xs text-muted-foreground">
            {Object.entries(s.byChannel)
              .map(([c, n]) => `${SALES_CHANNEL[c] ?? c} : ${n}`)
              .join(" · ")}
          </p>
        )}
      </div>

      {links.length > 0 && (
        <div className="space-y-2">
          <p className="tracked text-[10px] text-muted-foreground">Liens de vente (tracking)</p>
          <ul className="divide-y divide-border/60 rounded-md border border-border/60">
            {shown.map((l) => (
              <li key={l.utm_source} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{l.label}</span>
                <span className="text-xs text-muted-foreground">
                  {l.tickets} billet{l.tickets > 1 ? "s" : ""}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-7 w-7"
                  onClick={() => copy(l.url)}
                  aria-label={`Copier le lien ${l.label}`}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
          {links.length > 6 && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => setAll((v) => !v)}
            >
              {all ? "Voir moins" : `Voir les ${links.length} liens`}
            </button>
          )}
          <p className="text-xs text-muted-foreground">
            Lien bio : « instagram-bio ». Stories : « instagram-story ». Ça permet de savoir quel
            contenu fait vendre.
          </p>
        </div>
      )}
    </Card>
  );
}

function IgStats() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["cm-ig"],
    queryFn: fetchCmIgPosts,
    refetchInterval: 1_800_000,
  });
  const feed = data.filter((p) => p.kind !== "story");
  const stories = data.length - feed.length;
  const top = useMemo(
    () => [...feed].sort((a, b) => engagement(b) - engagement(a)).slice(0, 3),
    [feed],
  );
  const avg = feed.length
    ? Math.round(feed.reduce((n, p) => n + engagement(p), 0) / feed.length)
    : 0;

  return (
    <section className="space-y-3">
      <H2>Instagram · 30 jours</H2>
      <p className="-mt-2 text-xs text-muted-foreground">
        Relevé chaque soir à 23h30. Les stories n'ont pas de likes publics.
      </p>
      <Card className="p-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune publication relevée ce mois-ci.</p>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-2xl font-medium">{feed.length}</p>
                <p className="text-xs text-muted-foreground">posts & reels</p>
              </div>
              <div>
                <p className="text-2xl font-medium">{stories}</p>
                <p className="text-xs text-muted-foreground">stories</p>
              </div>
              <div>
                <p className="text-2xl font-medium">{avg}</p>
                <p className="text-xs text-muted-foreground">interactions / post</p>
              </div>
            </div>
            {top.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="tracked text-[10px] text-muted-foreground">Ce qui marche le mieux</p>
                {top.map((p) => (
                  <a
                    key={p.id}
                    href={p.permalink ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-md border border-border/60 p-2 text-sm hover:bg-muted/40"
                  >
                    <Instagram className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">
                      {p.caption?.split("\n")[0] || "(sans légende)"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="h-3 w-3" />
                      {p.like_count ?? 0}
                      <MessageSquare className="ml-1 h-3 w-3" />
                      {p.comments_count ?? 0}
                    </span>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </a>
                ))}
              </div>
            )}
          </>
        )}
      </Card>
    </section>
  );
}

function AgentNotes() {
  const { data = [] } = useQuery({
    queryKey: ["cm-agent-notes"],
    queryFn: fetchCmAgentNotes,
    refetchInterval: 1_800_000,
  });
  if (!data.length) return null;
  return (
    <section className="space-y-3">
      <H2>Idées de l'agent AFRO LOVE</H2>
      <p className="-mt-2 text-xs text-muted-foreground">
        Le dernier point de l'agent qui suit les ventes et la com. À prendre comme des idées.
      </p>
      <Card className="divide-y divide-border/60">
        {data.slice(0, 3).map((n) => (
          <div key={n.id} className="p-4">
            <p className="mb-1 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Bot className="h-3.5 w-3.5" />
              {new Date(n.created_at).toLocaleDateString("fr-FR", {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
                timeZone: TZ,
              })}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{n.summary}</p>
          </div>
        ))}
      </Card>
    </section>
  );
}

function MyRequests({ events }: { events: CmEvent[] }) {
  const { data = [] } = useQuery({ queryKey: ["team-requests"], queryFn: fetchTeamRequests });
  const open = data.filter((r) => r.status === "ouverte" || r.status === "en_cours");
  const recent = data.slice(0, 3);
  return (
    <section className="space-y-3">
      <H2 count={open.length}>Mes demandes à Rafael</H2>
      <p className="-mt-2 text-xs text-muted-foreground">
        Budget, pub payante, partenaires, infos à confirmer : tout ce qui n'est pas du postage.
      </p>
      <Card className="space-y-3 p-4">
        <AskRafaelDialog events={events} />
        {recent.length > 0 && (
          <ul className="divide-y divide-border/60">
            {recent.map((r) => (
              <li key={r.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{r.subject}</span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[11px] ${REQUEST_STATUS[r.status].tone}`}
                >
                  {REQUEST_STATUS[r.status].label}
                </span>
              </li>
            ))}
          </ul>
        )}
        <Link to="/demandes" className="inline-block text-xs text-primary hover:underline">
          Voir toutes mes demandes et les réponses
        </Link>
      </Card>
    </section>
  );
}

/** Accueil community manager : postages des comptes ouverts, soirées, stats, demandes. */
export function CmHome() {
  const plan = useQuery({
    queryKey: ["my-plan", "cm"],
    // Pas de filtre « responsable » : la base ne renvoie que les comptes ouverts.
    queryFn: () => fetchMyPlan(null),
    refetchInterval: 300_000,
  });
  const events = useQuery({ queryKey: ["cm-events"], queryFn: fetchCmEvents });
  const evs = events.data ?? [];
  const p = plan.data;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-8">
        {plan.error ? (
          <Card className="p-6 text-sm text-destructive">{(plan.error as Error).message}</Card>
        ) : !p ? (
          <Card className="p-6 text-sm text-muted-foreground">Chargement de tes postages…</Card>
        ) : (
          <>
            {p.late.length > 0 && (
              <Section
                title="En retard"
                hint="Prévu ces 7 derniers jours, pas encore marqué publié. Publie-le ou décale-le dans « Mes postages »."
                items={p.late}
                empty=""
              />
            )}
            <Section
              title="À poster aujourd'hui"
              hint="Heure de Rio. Tu reçois aussi la liste chaque matin sur WhatsApp et par mail."
              items={p.today}
              empty="Rien à poster aujourd'hui."
            />
            <Section
              title="À produire"
              hint="Visuels, vidéos et légendes à préparer. Ouvre le kit de chaque contenu."
              items={p.toProduce}
              empty="Rien en production."
            />
            <Section title="Prêt, à programmer" items={p.toSchedule} empty="Rien en attente." />
            <Link to="/contenus" className="inline-block text-sm text-primary hover:underline">
              Ouvrir tout le planning (ajouter, déplacer, modifier un contenu)
            </Link>
          </>
        )}
      </div>
      <div className="space-y-8">
        <section className="space-y-3">
          <H2>Soirées</H2>
          {events.isLoading ? (
            <Card className="p-4 text-sm text-muted-foreground">Chargement…</Card>
          ) : evs.length === 0 ? (
            <Card className="p-4 text-sm text-muted-foreground">Aucune soirée à venir.</Card>
          ) : (
            evs.map((ev) => <EventCard key={ev.id} ev={ev} />)
          )}
        </section>
        <MyRequests events={evs} />
        <IgStats />
        <AgentNotes />
      </div>
    </div>
  );
}

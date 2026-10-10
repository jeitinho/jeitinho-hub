import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bot,
  CalendarClock,
  ClipboardCheck,
  FileText,
  Handshake,
  Inbox,
  Newspaper,
  PartyPopper,
  Store,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { displayName, profileKind, useAuth } from "@/hooks/use-auth";
import { MediaHome } from "@/components/home/media-home";
import { TerrainHome } from "@/components/home/terrain-home";
import { TodayPosts } from "@/components/home/today-posts";
import { fetchCockpit, type AgentHealth } from "@/lib/ops/cockpit";
import { fmtDateTime, fmtMoney } from "@/lib/ops/ops";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: CockpitPage,
  head: () => ({ meta: [{ title: "Aujourd'hui — JEITINHO" }] }),
});

const TZ = "America/Sao_Paulo";

function when(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  const day = (x: Date) => x.toLocaleDateString("fr-CA", { timeZone: TZ });
  const today = new Date();
  const tomorrow = new Date(today.getTime() + 86_400_000);
  const time = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: TZ });
  if (day(d) === day(today)) return `Aujourd'hui ${time}`;
  if (day(d) === day(tomorrow)) return `Demain ${time}`;
  return fmtDateTime(iso);
}

function Tile({
  to,
  search,
  icon: Icon,
  label,
  value,
  tone = "default",
  hint,
  error,
}: {
  to: string;
  search?: Record<string, string>;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  tone?: "default" | "alert";
  hint?: string;
  /** Erreur de chargement de ce bloc : la tuile affiche « — » et l'erreur au survol. */
  error?: string;
}) {
  const hot = !error && tone === "alert" && value > 0;
  return (
    <Link
      to={to}
      search={search as never}
      className="group"
      title={error ? `Chargement impossible : ${error}` : undefined}
    >
      <Card
        className={`flex h-full items-center gap-3 p-4 transition-colors group-hover:bg-muted/40 ${
          hot ? "border-primary/40 bg-primary/5" : ""
        } ${value === 0 && !error ? "opacity-60" : ""}`}
      >
        <div
          className={`rounded-md p-2 ${hot ? "bg-primary text-primary-foreground" : "bg-muted"}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-2xl font-semibold leading-none">{error ? "—" : value}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{label}</p>
          {error ? (
            <p className="truncate text-[11px] text-destructive">Erreur de chargement</p>
          ) : (
            hint && <p className="truncate text-[11px] text-muted-foreground/80">{hint}</p>
          )}
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      </Card>
    </Link>
  );
}

const AGENT_TONE: Record<AgentHealth["state"], string> = {
  ok: "bg-emerald-500",
  attention: "bg-amber-500",
  silence: "bg-muted-foreground/40",
};

function CockpitPage() {
  const { canManage, user, roles } = useAuth();
  const name = displayName(user);
  const kind = profileKind(roles);
  const { data, isLoading, error } = useQuery({
    queryKey: ["cockpit"],
    queryFn: fetchCockpit,
    enabled: canManage,
    refetchInterval: 120_000,
  });
  const pendingUsers = useQuery({
    queryKey: ["pending-users-count"],
    enabled: canManage,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending_validation");
      return (count as number) ?? 0;
    },
  });

  const hour = Number(
    new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: TZ }),
  );
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const dateLabel = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });

  const hello = name ? `${greet}, ${name}.` : `${greet}.`;

  if (!canManage)
    return (
      <PageShell
        eyebrow={dateLabel}
        title={hello}
        description={
          kind === "media"
            ? "Ton plan média : ce qu'il faut publier, produire et programmer."
            : kind === "terrain"
              ? "Tes prochaines sorties avec JEITINHO."
              : undefined
        }
      >
        {kind === "media" ? (
          <MediaHome />
        ) : kind === "terrain" ? (
          <TerrainHome />
        ) : (
          <Card className="p-6 text-sm text-muted-foreground">
            Utilise le menu pour accéder à tes modules.
          </Card>
        )}
      </PageShell>
    );

  const silentAgents = data?.agents.filter((a) => a.state !== "ok") ?? [];

  return (
    <PageShell
      eyebrow={dateLabel}
      title={hello}
      description="Ce qui demande ton attention maintenant. Tout est cliquable."
    >
      {(pendingUsers.data ?? 0) > 0 && (
        <Link
          to="/parametres/utilisateurs"
          className="mb-4 flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm hover:bg-primary/10"
        >
          <span>
            {pendingUsers.data} compte{(pendingUsers.data ?? 0) > 1 ? "s" : ""} en attente de
            validation
          </span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
      <div className="mb-6">
        <TodayPosts />
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <Card className="border-destructive/40 p-4 text-sm">{(error as Error).message}</Card>
      )}

      {data && (
        <div className="space-y-6">
          {/* 1. Sur le terrain : tours dans les 48 h */}
          {data.tours.length > 0 && (
            <Card className="border-primary/40 p-5">
              <div className="mb-3 flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-primary" />
                <h2 className="text-sm font-semibold">Sur le terrain — 48 prochaines heures</h2>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {data.tours.map((b) => (
                  <Link
                    key={b.id}
                    to={b.client_id ? "/clients/$id" : "/distribution"}
                    params={b.client_id ? { id: b.client_id } : undefined}
                    className="rounded-md border border-border/60 p-3 hover:bg-muted/40"
                  >
                    <p className="text-sm font-semibold">{when(b.start_at)}</p>
                    <p className="text-sm">{b.activity_title}</p>
                    <p className="text-xs text-muted-foreground">
                      {b.participants} pers. · {b.lead_name}
                      {b.lead_language ? ` · ${b.lead_language}` : ""} ·{" "}
                      {fmtMoney(b.price, b.currency ?? "BRL")} · GetYourGuide
                    </p>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* 2. À traiter */}
          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              À traiter
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Tile
                to="/a-valider"
                icon={ClipboardCheck}
                label="Brouillons à valider"
                value={data.tasks.length}
                error={data.errors.tasks}
                tone="alert"
                hint={data.tasksByKind
                  .slice(0, 2)
                  .map((k) => `${k.n} ${k.label.toLowerCase()}`)
                  .join(" · ")}
              />
              <Tile
                to="/crm"
                icon={Inbox}
                label="Nouvelles demandes clients"
                value={data.newRequests}
                error={data.errors.newRequests}
                tone="alert"
              />
              <Tile
                to="/devis"
                search={{ statut: "relance" }}
                icon={FileText}
                label="Devis envoyés à relancer"
                value={data.quotesToChase.length}
                error={data.errors.quotesToChase}
                tone="alert"
              />
              <Tile
                to="/finances"
                icon={FileText}
                label="Devis acceptés non soldés"
                value={data.quotesUnpaid.length}
                error={data.errors.quotesUnpaid}
              />
              <Tile
                to="/partenaires"
                search={{ focus: "candidatures" }}
                icon={Handshake}
                label="Candidatures partenaires"
                value={data.newApplications}
                error={data.errors.newApplications}
                tone="alert"
              />
              <Tile
                to="/partenaires"
                search={{ focus: "relancer" }}
                icon={Users}
                label="Partenaires à relancer"
                value={data.partnersToChase}
                error={data.errors.partnersToChase}
              />
              <Tile
                to="/distribution"
                search={{ filtre: "a_corriger" }}
                icon={Store}
                label="Fiches GetYourGuide à corriger"
                value={data.listingsToFix}
                error={data.errors.listingsToFix}
                tone="alert"
              />
              <Tile
                to="/contenus"
                search={{ retard: "1" }}
                icon={Newspaper}
                label="Contenus en retard"
                value={data.editorialLate}
                error={data.errors.editorialLate}
              />
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* 3. File À valider, aperçu */}
            <Card className="p-5 lg:col-span-2">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-sm font-semibold">Prochaines actions</h2>
                <Link to="/a-valider" className="text-xs text-primary hover:underline">
                  Tout voir
                </Link>
              </div>
              {data.tasks.length === 0 && data.quotesToChase.length === 0 ? (
                <p className="text-sm text-muted-foreground">Rien en attente. Bien joué.</p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {data.quotesToChase.slice(0, 3).map((q) => (
                    <li key={q.id}>
                      <Link
                        to="/devis/$id"
                        params={{ id: q.id }}
                        className="flex items-center justify-between gap-3 py-2 text-sm hover:text-primary"
                      >
                        <span className="min-w-0 truncate">
                          <Badge variant="outline" className="mr-2">
                            Relance devis
                          </Badge>
                          {q.number} · {q.title}
                        </span>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {fmtMoney(q.total_amount, q.currency ?? "EUR")}
                        </span>
                      </Link>
                    </li>
                  ))}
                  {data.tasks.slice(0, 7).map((t) => (
                    <li key={t.id}>
                      <Link
                        to="/a-valider"
                        search={{ task: t.id } as never}
                        className="flex items-center justify-between gap-3 py-2 text-sm hover:text-primary"
                      >
                        <span className="min-w-0 truncate">{t.title}</span>
                        <span
                          className={`shrink-0 text-xs ${
                            new Date(t.due_at) < new Date()
                              ? "text-destructive"
                              : "text-muted-foreground"
                          }`}
                        >
                          {when(t.due_at)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <div className="space-y-6">
              {/* 4. Prochain événement */}
              {data.nextEvent && (
                <Link to="/evenements" search={{ id: data.nextEvent.id }}>
                  <Card className="p-5 transition-colors hover:bg-muted/40">
                    <div className="mb-2 flex items-center gap-2">
                      <PartyPopper className="h-4 w-4 text-primary" />
                      <h2 className="text-sm font-semibold">{data.nextEvent.name}</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {when(data.nextEvent.starts_at)} · {data.nextEvent.venue}
                      {" · J-"}
                      {Math.max(
                        0,
                        Math.ceil(
                          (new Date(data.nextEvent.starts_at).getTime() - Date.now()) / 86_400_000,
                        ),
                      )}
                    </p>
                    {data.nextEvent.presale_target ? (
                      <>
                        <Progress
                          className="mt-3"
                          value={Math.min(
                            100,
                            (data.nextEvent.sold / data.nextEvent.presale_target) * 100,
                          )}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {data.nextEvent.sold} / {data.nextEvent.presale_target} billets en
                          prévente
                        </p>
                      </>
                    ) : null}
                  </Card>
                </Link>
              )}

              {/* 5. Santé des agents */}
              <Link to="/agents">
                <Card className="p-5 transition-colors hover:bg-muted/40">
                  <div className="mb-3 flex items-center gap-2">
                    <Bot className="h-4 w-4 text-primary" />
                    <h2 className="text-sm font-semibold">Agents</h2>
                    {silentAgents.length > 0 && (
                      <span className="ml-auto flex items-center gap-1 text-xs text-amber-600">
                        <AlertTriangle className="h-3 w-3" />
                        {silentAgents.length} à vérifier
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1.5">
                    {data.agents.map((a) => (
                      <li key={a.key} className="flex items-center gap-2 text-xs">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${AGENT_TONE[a.state]}`} />
                        <span className="min-w-0 flex-1 truncate">{a.name}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {a.last ? when(a.last.started_at) : "jamais"}
                        </span>
                      </li>
                    ))}
                  </ul>
                </Card>
              </Link>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}

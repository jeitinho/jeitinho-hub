import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Users, FileText, Plane, BookOpen, Palmtree, Library, Calendar as CalendarIcon, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({ meta: [{ title: "Dashboard — JEITINHO" }] }),
});

function useCount(table: string, filter?: (q: any) => any) {
  return useQuery({
    queryKey: ["count", table, filter?.toString()],
    queryFn: async () => {
      let q: any = (supabase as any).from(table).select("*", { count: "exact", head: true });
      if (filter) q = filter(q);
      const { count } = await q;
      return count ?? 0;
    },
  });
}

function StatCard({ icon: Icon, label, value, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string | number; hint?: string }) {
  return (
    <Card className="border-border/60 bg-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="tracked text-[10px] text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 500 }}>{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </Card>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const leads = useCount("clients", (q) => q.eq("status", "lead"));
  const quotesPending = useCount("quotes", (q) => q.eq("status", "sent"));
  const tripsActive = useCount("trips", (q) => q.eq("status", "in_progress"));
  const articlesScheduled = useCount("articles", (q) => q.eq("status", "scheduled"));
  const experiences = useCount("experiences");
  const contentToPublish = useCount("content_items", (q) => q.eq("status", "to_schedule"));
  const upcomingEvents = useCount("calendar_events", (q) => q.gte("starts_at", new Date().toISOString()));

  const hour = new Date().getHours();
  const greet = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";

  return (
    <PageShell
      eyebrow="Vue d'ensemble"
      title={`${greet}.`}
      description={user?.email ? `Voici l'état de JEITINHO aujourd'hui.` : undefined}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Nouveaux leads" value={leads.data ?? "—"} />
        <StatCard icon={FileText} label="Devis en attente" value={quotesPending.data ?? "—"} />
        <StatCard icon={Plane} label="Voyages en cours" value={tripsActive.data ?? "—"} />
        <StatCard icon={BookOpen} label="Articles programmés" value={articlesScheduled.data ?? "—"} />
        <StatCard icon={Palmtree} label="Expériences" value={experiences.data ?? "—"} />
        <StatCard icon={Library} label="Contenus à programmer" value={contentToPublish.data ?? "—"} />
        <StatCard icon={CalendarIcon} label="Événements à venir" value={upcomingEvents.data ?? "—"} />
        <StatCard icon={TrendingUp} label="CA du mois" value="—" hint="Analytics à venir" />
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-3">
        <Card className="border-border/60 lg:col-span-2 p-6">
          <p className="tracked mb-4 text-[10px] text-muted-foreground">Bienvenue</p>
          <h2 className="text-2xl" style={{ fontFamily: "Fraunces, serif" }}>
            JEITINHO Platform, votre poste de <em style={{ fontStyle: "italic" }}>pilotage.</em>
          </h2>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Ce back-office unique orchestre <span className="text-foreground">jeitinho.fr</span> et <span className="text-foreground">blog.jeitinho.fr</span>. Chaque expérience, chaque contenu, chaque voyage n'existe qu'une seule fois — et alimente tous les canaux.
          </p>
        </Card>
        <Card className="border-border/60 p-6">
          <p className="tracked mb-4 text-[10px] text-muted-foreground">Prochaines étapes</p>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /><span>Créer votre première expérience</span></li>
            <li className="flex items-start gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /><span>Rédiger un article de blog</span></li>
            <li className="flex items-start gap-3"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /><span>Inviter votre équipe</span></li>
          </ul>
        </Card>
      </div>
    </PageShell>
  );
}
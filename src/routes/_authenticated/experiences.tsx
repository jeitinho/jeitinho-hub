import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Palmtree, MapPinned, Compass, CarFront, TrendingUp } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/experiences")({ component: Layout, head: () => ({ meta: [{ title: "Expériences — JEITINHO" }] }) });
function Layout() { const path = useRouterState({ select: (r) => r.location.pathname }); if (path.replace(/\/$/, "") !== "/experiences") return <Outlet />; return <ExperiencesList />; }

function ExperiencesList() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading, error } = useQuery({ queryKey: ["experiences"], queryFn: async () => { const { data, error } = await supabase.from("experiences").select("*").order("updated_at", { ascending: false }); if (error) throw error; return data ?? []; } });
  const visible = (data ?? []).filter((x) => filter === "all" ? true : filter === "published" ? Boolean(x.is_published) : filter === "driver" ? Boolean(x.requires_driver) : !x.is_published);

  return <PageShell eyebrow="Bibliothèque centrale" title="Expériences" description="Catalogue réel JEITINHO — une source de vérité pour le site, les devis et les voyages." actions={<Link to="/experiences/new"><Button className="btn-primary"><Plus className="mr-2 h-3.5 w-3.5" />Nouvelle expérience</Button></Link>}>
    <div className="mb-5 flex flex-wrap gap-2">
      <Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Toutes</Button>
      <Button size="sm" variant={filter === "published" ? "default" : "outline"} onClick={() => setFilter("published")}><MapPinned className="mr-2 h-3.5 w-3.5" />Publiées</Button>
      <Button size="sm" variant={filter === "draft" ? "default" : "outline"} onClick={() => setFilter("draft")}><Compass className="mr-2 h-3.5 w-3.5" />Brouillons</Button>
      <Button size="sm" variant={filter === "driver" ? "default" : "outline"} onClick={() => setFilter("driver")}><CarFront className="mr-2 h-3.5 w-3.5" />Chauffeur</Button>
    </div>
    {isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Card key={i} className="overflow-hidden border-border/60"><div className="aspect-[4/3] w-full animate-pulse bg-muted" /><div className="space-y-2 p-4"><div className="h-4 w-2/3 animate-pulse rounded bg-muted" /><div className="h-3 w-1/3 animate-pulse rounded bg-muted" /></div></Card>)}</div>
      : error ? <Card className="border-destructive/40 p-8"><h3 className="font-semibold">Impossible de charger le catalogue</h3><p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p></Card>
      : !visible.length ? <Card className="border-dashed p-16 text-center"><Palmtree className="mx-auto mb-4 h-8 w-8 text-primary" /><h3 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>Aucune expérience dans cette vue</h3><p className="mt-2 text-sm text-muted-foreground">Créez une expérience pour alimenter le catalogue central.</p><Link to="/experiences/new" className="mt-6 inline-block"><Button className="btn-primary">Nouvelle expérience</Button></Link></Card>
      : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((x) => {
        const sale = Number(x.price_from ?? 0);
        const cost = Number(x.supplier_cost ?? x.supplier_net ?? 0) + Number(x.fixed_cost ?? 0);
        const commission = sale * Number(x.commission_pct ?? 0) / 100;
        const margin = sale - cost - commission;
        return <Link key={x.id} to="/experiences/$id" params={{ id: x.id }}><Card className="group overflow-hidden border-border/60 transition-all hover:shadow-[var(--shadow-elevated)]">
          {x.cover_image_url ? <img src={x.cover_image_url} alt={x.title} loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] w-full bg-muted" />}
          <div className="p-4"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant={x.is_published ? "default" : "outline"}>{x.is_published ? "Publiée" : "Brouillon"}</Badge>{x.experience_type && <Badge variant="secondary">{x.experience_type}</Badge>}{x.is_excursion && <Badge variant="outline">Excursion</Badge>}{x.requires_driver && <Badge variant="outline">Chauffeur</Badge>}</div>
            <h3 className="text-lg leading-tight" style={{ fontFamily: "Fraunces, serif" }}>{x.title}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{[x.city, x.neighborhood].filter(Boolean).join(" · ") || x.location || "Lieu à définir"}</p>
            <div className="mt-4 grid grid-cols-2 gap-3"><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vente</p><p className="font-semibold">{sale > 0 ? `${sale} ${x.currency ?? "EUR"}` : "À définir"}</p></div><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Marge*</p><p className={margin < 0 ? "font-semibold text-destructive" : "font-semibold"}>{sale > 0 ? `${margin.toFixed(2)} ${x.currency ?? "EUR"}` : "—"}</p></div></div>
            {sale > 0 && <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground"><TrendingUp className="h-3 w-3" />Simulation indicative · commission {Number(x.commission_pct ?? 0)}%</p>}
          </div>
        </Card></Link>;
      })}</div>}
    <p className="mt-4 text-[11px] text-muted-foreground">* Marge affichée à titre indicatif selon coût fournisseur + coût fixe + commission sur prix de vente.</p>
  </PageShell>;
}

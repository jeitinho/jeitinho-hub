import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Palmtree, MapPinned, Compass, CarFront, TrendingUp, Search, RefreshCw, Sparkles, Route, Map, Euro } from "lucide-react";
import { useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/experiences")({ component: Layout, head: () => ({ meta: [{ title: "Expériences — JEITINHO" }] }) });
function Layout() { const path = useRouterState({ select: (r) => r.location.pathname }); if (path.replace(/\/$/, "") !== "/experiences") return <Outlet />; return <ExperiencesList />; }

function ExperiencesList() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ["experiences"], queryFn: async () => { const { data, error } = await supabase.from("experiences").select("*").order("title", { ascending: true }); if (error) throw error; return data ?? []; } });
  const visible = useMemo(() => (data ?? []).filter((x) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [x.title, x.city, x.neighborhood, x.category, x.experience_type, x.location].filter(Boolean).join(" ").toLowerCase().includes(q);
    const matchesFilter = filter === "all" ? true : filter === "published" ? Boolean(x.is_published) : filter === "driver" ? Boolean(x.requires_driver) : filter === "excursion" ? Boolean(x.is_excursion) : !x.is_published;
    return matchesSearch && matchesFilter;
  }), [data, filter, search]);
  const stats = useMemo(() => ({ total: data?.length ?? 0, published: (data ?? []).filter((x) => x.is_published).length, excursions: (data ?? []).filter((x) => x.is_excursion).length, drivers: (data ?? []).filter((x) => x.requires_driver).length }), [data]);

  return <PageShell eyebrow="Bibliothèque centrale" title="Expériences" description="Le catalogue commercial vivant : une expérience alimente le site, les devis, les voyages et le calcul de marge." actions={<Link to="/experiences/new"><Button className="btn-primary"><Plus className="mr-2 h-3.5 w-3.5" />Nouvelle expérience</Button></Link>}>
    <div className="mb-5 grid gap-3 sm:grid-cols-4">
      {[{ label: "Catalogue", value: stats.total, icon: Sparkles }, { label: "Publiées", value: stats.published, icon: MapPinned }, { label: "Excursions", value: stats.excursions, icon: Route }, { label: "Chauffeur", value: stats.drivers, icon: CarFront }].map(({ label, value, icon: Icon }) => <Card key={label} className="border-border/60 p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-2xl font-semibold" style={{ fontFamily: "Fraunces, serif" }}>{value}</p></Card>)}
    </div>
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative max-w-xl flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Rechercher une expérience, ville, catégorie…" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="flex flex-wrap gap-2">
        {[{ v: "all", l: "Toutes" }, { v: "published", l: "Publiées" }, { v: "excursion", l: "Excursions / roadtrip" }, { v: "driver", l: "Chauffeur" }, { v: "draft", l: "Brouillons" }].map((s) => <Button key={s.v} size="sm" variant={filter === s.v ? "default" : "outline"} onClick={() => setFilter(s.v)}>{s.l}</Button>)}
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />Actualiser</Button>
      </div>
    </div>
    {isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2, 3, 4, 5].map((i) => <Card key={i} className="overflow-hidden border-border/60"><div className="aspect-[4/3] animate-pulse bg-muted" /><div className="space-y-2 p-4"><div className="h-4 w-2/3 animate-pulse rounded bg-muted" /><div className="h-3 w-1/2 animate-pulse rounded bg-muted" /></div></Card>)}</div>
      : error ? <Card className="border-destructive/40 p-8"><h3 className="font-semibold">Impossible de charger le catalogue</h3><p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p><Button className="mt-4" onClick={() => refetch()}>Réessayer</Button></Card>
      : !data?.length ? <Card className="border-dashed p-12 text-center"><Palmtree className="mx-auto mb-4 h-8 w-8 text-primary" /><h3 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>Catalogue vide</h3><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">La connexion à Supabase fonctionne mais aucune ligne n'est retournée par la table <strong>experiences</strong> pour cet utilisateur. L'interface est prête ; il faut vérifier l'import ou les policies RLS si le catalogue existe déjà dans Supabase.</p><Link to="/experiences/new" className="mt-6 inline-block"><Button className="btn-primary">Créer une expérience</Button></Link></Card>
      : !visible.length ? <Card className="border-dashed p-12 text-center"><Search className="mx-auto mb-4 h-7 w-7 text-primary" /><h3 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>Aucun résultat</h3><p className="mt-2 text-sm text-muted-foreground">Modifie la recherche ou le filtre.</p></Card>
      : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((x) => {
        const sale = Number(x.price_from ?? 0);
        const supplier = Number(x.supplier_cost ?? x.supplier_net ?? 0) + Number(x.fixed_cost ?? 0);
        const commission = sale * Number(x.commission_pct ?? 0) / 100;
        const margin = sale - supplier - commission;
        return <Link key={x.id} to="/experiences/$id" params={{ id: x.id }}><Card className="group h-full overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">
          {x.cover_image_url ? <img src={x.cover_image_url} alt={x.title} loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-muted"><Palmtree className="h-10 w-10 text-primary/60" /></div>}
          <div className="p-4"><div className="mb-2 flex flex-wrap items-center gap-1.5"><Badge variant={x.is_published ? "default" : "outline"}>{x.is_published ? "Publiée" : "Brouillon"}</Badge>{x.is_excursion && <Badge variant="outline">Excursion</Badge>}{x.requires_driver && <Badge variant="outline">Chauffeur</Badge>}</div>
            <h3 className="text-lg leading-tight" style={{ fontFamily: "Fraunces, serif" }}>{x.title}</h3><p className="mt-1 text-xs text-muted-foreground">{[x.city, x.neighborhood].filter(Boolean).join(" · ") || x.location || "Lieu à définir"}</p>
            {x.short_description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{x.short_description}</p>}
            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3"><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vente</p><p className="font-semibold">{sale > 0 ? `${sale} ${x.currency ?? "EUR"}` : "À définir"}</p></div><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Marge</p><p className={margin < 0 ? "font-semibold text-destructive" : "font-semibold"}>{sale > 0 ? `${margin.toFixed(2)} ${x.currency ?? "EUR"}` : "—"}</p></div></div>
            {sale > 0 && <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground"><TrendingUp className="h-3 w-3" />Commission {Number(x.commission_pct ?? 0)}% · modèle {x.price_model ?? "—"}</p>}
          </div>
        </Card></Link>;
      })}</div>}
    <div className="mt-5 grid gap-3 md:grid-cols-3"><Card className="border-primary/10 bg-primary/5 p-4"><Map className="h-4 w-4 text-primary" /><p className="mt-2 text-sm font-medium">Rio & activités locales</p><p className="mt-1 text-xs text-muted-foreground">Tours, visites, nature, culture et expériences vendues directement.</p></Card><Card className="border-primary/10 bg-primary/5 p-4"><Route className="h-4 w-4 text-primary" /><p className="mt-2 text-sm font-medium">Excursions / roadtrip</p><p className="mt-1 text-xs text-muted-foreground">Prestations hors Rio avec chauffeur ou logistique partenaire.</p></Card><Card className="border-primary/10 bg-primary/5 p-4"><Euro className="h-4 w-4 text-primary" /><p className="mt-2 text-sm font-medium">Économie réelle</p><p className="mt-1 text-xs text-muted-foreground">Prix client, coût fournisseur, commission et marge sont conservés dans la fiche.</p></Card></div>
  </PageShell>;
}

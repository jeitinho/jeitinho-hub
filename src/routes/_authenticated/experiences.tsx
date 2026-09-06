import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCatalog, fetchCatalogItem, deleteCatalogItem, updateCatalogItem } from "@/lib/catalog-gateway";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Palmtree, MapPinned, Route as RouteIcon, CarFront, TrendingUp, Search, RefreshCw, Sparkles, Map, Euro, ArrowLeft, Trash2 } from "lucide-react";
import { ExperienceForm } from "@/components/experience-form";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { z } from "zod";

const searchSchema = z.object({ id: z.string().uuid().optional() });
export const Route = createFileRoute("/_authenticated/experiences")({ validateSearch: searchSchema, component: ExperiencesList, head: () => ({ meta: [{ title: "Expériences — JEITINHO" }] }) });

function ExperiencesList() {
  const { id } = Route.useSearch();
  if (id) return <ExperienceDetail id={id} />;
  return <ExperiencesCatalog />;
}

function ExperiencesCatalog() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch, isFetching } = useQuery({ queryKey: ["experiences"], queryFn: () => fetchCatalog<any>("experiences", { order: "title" }) });
  const visible = useMemo(() => (data ?? []).filter((x) => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || [x.title, x.city, x.neighborhood, x.category, x.experience_type, x.location].filter(Boolean).join(" ").toLowerCase().includes(q);
    const matchesFilter = filter === "all" ? true : filter === "published" ? Boolean(x.is_published) : filter === "driver" ? Boolean(x.requires_driver) : filter === "excursion" ? Boolean(x.is_excursion) : !x.is_published;
    return matchesSearch && matchesFilter;
  }), [data, filter, search]);
  const stats = useMemo(() => ({ total: data?.length ?? 0, published: (data ?? []).filter((x) => x.is_published).length, excursions: (data ?? []).filter((x) => x.is_excursion).length, drivers: (data ?? []).filter((x) => x.requires_driver).length }), [data]);

  return <PageShell eyebrow="Bibliothèque centrale" title="Expériences" description="Le catalogue central Supabase : une expérience alimente le site, les devis, les voyages et le calcul de marge." actions={<Link to="/experiences/new"><Button className="btn-primary"><Plus className="mr-2 h-3.5 w-3.5" />Nouvelle expérience</Button></Link>}>
    <div className="mb-5 grid gap-3 sm:grid-cols-4">{[{ label: "Catalogue", value: stats.total, icon: Sparkles }, { label: "Publiées", value: stats.published, icon: MapPinned }, { label: "Excursions", value: stats.excursions, icon: RouteIcon }, { label: "Chauffeur", value: stats.drivers, icon: CarFront }].map(({ label, value, icon: Icon }) => <Card key={label} className="border-border/60 p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary" /></div><p className="mt-2 text-2xl font-semibold" style={{ fontFamily: "Fraunces, serif" }}>{value}</p></Card>)}</div>
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="relative max-w-xl flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Rechercher une expérience, ville, catégorie…" value={search} onChange={(e) => setSearch(e.target.value)} /></div><div className="flex flex-wrap gap-2">{[{ v: "all", l: "Toutes" }, { v: "published", l: "Publiées" }, { v: "excursion", l: "Excursions / roadtrip" }, { v: "driver", l: "Chauffeur" }, { v: "draft", l: "Brouillons" }].map((s) => <Button key={s.v} size="sm" variant={filter === s.v ? "default" : "outline"} onClick={() => setFilter(s.v)}>{s.l}</Button>)}<Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />Actualiser</Button></div></div>
    {isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2,3,4,5].map(i => <Card key={i} className="overflow-hidden border-border/60"><div className="aspect-[4/3] animate-pulse bg-muted" /></Card>)}</div>
      : error ? <Card className="border-destructive/40 p-8"><h3 className="font-semibold">Impossible de charger le catalogue</h3><p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p><Button className="mt-4" onClick={() => refetch()}>Réessayer</Button></Card>
      : !data?.length ? <Card className="border-dashed p-12 text-center"><Palmtree className="mx-auto mb-4 h-8 w-8 text-primary" /><h3 className="text-xl">Catalogue vide</h3><p className="mt-2 text-sm text-muted-foreground">Aucune expérience n'est retournée par Supabase.</p></Card>
      : !visible.length ? <Card className="border-dashed p-12 text-center"><Search className="mx-auto mb-4 h-7 w-7 text-primary" /><h3 className="text-xl">Aucun résultat</h3><p className="mt-2 text-sm text-muted-foreground">Modifie la recherche ou le filtre.</p></Card>
      : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((x) => { const sale = Number(x.price_from ?? 0); const supplier = Number(x.supplier_cost ?? x.supplier_net ?? 0) + Number(x.fixed_cost ?? 0); const commission = sale * Number(x.commission_pct ?? 0) / 100; const margin = sale - supplier - commission; return <a key={x.id} href={`/experiences?id=${encodeURIComponent(x.id)}`} className="block"><Card className="group h-full overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]">{x.cover_image_url ? <img src={x.cover_image_url} alt={x.title} loading="lazy" className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-muted"><Palmtree className="h-10 w-10 text-primary/60" /></div>}<div className="p-4"><div className="mb-2 flex flex-wrap items-center gap-1.5"><Badge variant={x.is_published ? "default" : "outline"}>{x.is_published ? "Publiée" : "Brouillon"}</Badge>{x.is_excursion && <Badge variant="outline">Excursion</Badge>}{x.requires_driver && <Badge variant="outline">Chauffeur</Badge>}</div><h3 className="text-lg leading-tight" style={{ fontFamily: "Fraunces, serif" }}>{x.title}</h3><p className="mt-1 text-xs text-muted-foreground">{[x.city, x.neighborhood].filter(Boolean).join(" · ") || x.location || "Lieu à définir"}</p>{x.short_description && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{x.short_description}</p>}<div className="mt-4 grid grid-cols-2 gap-3 border-t pt-3"><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vente</p><p className="font-semibold">{sale > 0 ? `${sale} ${x.currency ?? "EUR"}` : "À définir"}</p></div><div><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Marge</p><p className={margin < 0 ? "font-semibold text-destructive" : "font-semibold"}>{sale > 0 ? `${margin.toFixed(2)} ${x.currency ?? "EUR"}` : "—"}</p></div></div>{sale > 0 && <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground"><TrendingUp className="h-3 w-3" />Commission {Number(x.commission_pct ?? 0)}% · modèle {x.price_model ?? "—"}</p>}</div></Card></a>; })}</div>}
  </PageShell>;
}

function ExperienceDetail({ id }: { id: string }) {
  const navigate = (to: string) => { window.location.assign(to); };
  const { data, isLoading, error } = useQuery({ queryKey: ["experience", id], queryFn: () => fetchCatalogItem<any>("experiences", id) });
  if (isLoading) return <PageShell title="Chargement…"><Card className="h-48 animate-pulse bg-muted/50" /></PageShell>;
  if (error || !data) return <PageShell title="Expérience introuvable"><Card className="border-destructive/40 p-8"><h3 className="font-semibold">Impossible de charger cette expérience</h3><p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Expérience introuvable."}</p><Button className="mt-4" onClick={() => navigate("/experiences")}>Retour au catalogue</Button></Card></PageShell>;
  const lines = (v: unknown) => Array.isArray(v) ? v.map(String) : [];
  return <PageShell eyebrow="Expérience" title={data.title} actions={<Button variant="outline" onClick={() => navigate("/experiences")}><ArrowLeft className="mr-2 h-4 w-4" />Expériences</Button>}><ExperienceForm initial={{ ...data, inclusions: lines(data.inclusions), exclusions: lines(data.exclusions), conditions: lines(data.conditions) }} onSubmit={async values => { try { await updateCatalogItem("experiences", id, values as Record<string, unknown>); toast.success("Expérience enregistrée"); } catch (e) { toast.error(e instanceof Error ? e.message : "Enregistrement impossible"); } }} /><Button variant="ghost" className="mt-6 text-destructive hover:text-destructive" onClick={async () => { if (!confirm("Supprimer cette expérience ?")) return; try { await deleteCatalogItem("experiences", id); toast.success("Expérience supprimée"); navigate("/experiences"); } catch (e) { toast.error(e instanceof Error ? e.message : "Suppression impossible"); } }}><Trash2 className="mr-2 h-4 w-4" />Supprimer</Button></PageShell>;
}

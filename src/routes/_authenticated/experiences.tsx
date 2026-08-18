import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Palmtree, CarFront, MapPinned } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/experiences")({ component: Layout, head: () => ({ meta: [{ title: "Expériences — JEITINHO" }] }) });
function Layout() { const path = useRouterState({ select: (r) => r.location.pathname }); if (path !== "/experiences") return <Outlet />; return <ExperiencesList />; }
function ExperiencesList() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading, error } = useQuery({ queryKey: ["experiences"], queryFn: async () => { const { data, error } = await (supabase as any).from("experiences").select("*").order("updated_at", { ascending: false }); if (error) throw error; return data ?? []; } });
  const visible = data?.filter((x: any) => filter === "all" ? true : filter === "excursions" ? Boolean(x.is_excursion) : Boolean(x.requires_driver)) ?? [];
  return <PageShell eyebrow="Bibliothèque centrale" title="Expériences" description="Catalogue réel JEITINHO — lu directement depuis le Supabase JEITINHO OS." actions={<Link to="/experiences/new"><Button className="btn-primary"><Plus className="mr-2 h-3.5 w-3.5" />Nouvelle expérience</Button></Link>}>
    <div className="mb-5 flex flex-wrap gap-2"><Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Toutes</Button><Button size="sm" variant={filter === "excursions" ? "default" : "outline"} onClick={() => setFilter("excursions")}><MapPinned className="mr-2 h-3.5 w-3.5" />Excursions / Roadtrip</Button><Button size="sm" variant={filter === "chauffeur" ? "default" : "outline"} onClick={() => setFilter("chauffeur")}><CarFront className="mr-2 h-3.5 w-3.5" />Chauffeur requis</Button></div>
    {isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : error ? <Card className="border-destructive/40 p-8"><h3 className="font-semibold">Impossible de charger le catalogue</h3><p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p></Card> : !visible.length ? <Card className="border-dashed p-16 text-center"><Palmtree className="mx-auto mb-4 h-8 w-8 text-primary" /><h3 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>Aucune expérience dans cette vue</h3></Card> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visible.map((x: any) => <Link key={x.id} to="/experiences/$id" params={{ id: x.id }}><Card className="group overflow-hidden border-border/60 transition-all hover:shadow-[var(--shadow-elevated)]"><div className="aspect-[4/3] w-full bg-muted" /><div className="p-4"><div className="mb-2 flex flex-wrap items-center gap-2"><Badge variant={x.is_excursion ? "default" : "outline"}>{x.is_excursion ? "Excursion" : "Expérience"}</Badge>{x.requires_driver && <Badge variant="secondary">Chauffeur</Badge>}{x.category && <span className="text-xs text-muted-foreground">{x.category}</span>}</div><h3 className="text-lg leading-tight" style={{ fontFamily: "Fraunces, serif" }}>{x.title}</h3><p className="mt-2 text-xs text-muted-foreground">{x.price_from != null ? `Dès ${x.price_from} ${x.currency ?? "EUR"}` : "Prix à définir"}</p></div></Card></Link>)}</div>}
  </PageShell>;
}

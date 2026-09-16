import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Search, RefreshCw, Ticket } from "lucide-react";
import { useMemo, useState } from "react";
import { type DisplayCurrency, displayEur, loadDisplayCurrency, saveDisplayCurrency } from "@/lib/currency";

export const Route = createFileRoute("/_authenticated/billetterie")({ component: Layout, head: () => ({ meta: [{ title: "Billetterie — JEITINHO" }] }) });
function Layout() { const path = useRouterState({ select: r => r.location.pathname }); if (path.replace(/\/$/, "") !== "/billetterie") return <Outlet />; return <Ticketing />; }

function Ticketing() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "archived">("all");
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>(() => loadDisplayCurrency());
  const changeDisplayCurrency = (c: DisplayCurrency) => { setDisplayCurrency(c); saveDisplayCurrency(c); };

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["ticket-offers", "with-variants"],
    queryFn: async () => {
      const [ticketsRes, variantsRes] = await Promise.all([
        (supabase as any).from("ticket_offers").select("*").order("event_date").order("title"),
        (supabase as any).from("ticket_offer_variants").select("ticket_offer_id,public_price").eq("is_active", true),
      ]);
      if (ticketsRes.error) throw ticketsRes.error;
      if (variantsRes.error) throw variantsRes.error;
      const cheapestByTicket = new Map<string, number>();
      for (const v of (variantsRes.data ?? []) as any[]) {
        if (v.public_price === null) continue;
        const price = Number(v.public_price);
        const current = cheapestByTicket.get(v.ticket_offer_id);
        if (current === undefined || price < current) cheapestByTicket.set(v.ticket_offer_id, price);
      }
      return ((ticketsRes.data ?? []) as any[]).map(t => ({ ...t, cheapestVariantPrice: cheapestByTicket.get(t.id) ?? null }));
    },
  });

  const rows = data ?? [];
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((t: any) => (filter === "all" || (filter === "active" ? t.is_published : !t.is_published)) && (!q || [t.title, t.venue, t.category, t.notes].filter(Boolean).join(" ").toLowerCase().includes(q)));
  }, [rows, search, filter]);

  return (
    <PageShell
      eyebrow="Contenu / Catalogue"
      title="Billetterie"
      description="Offres événementielles, prix de vente, coûts fournisseurs et marge."
      actions={<Link to="/billetterie/new"><Button className="btn-primary"><Plus className="mr-2 h-4 w-4" />Nouvelle offre</Button></Link>}
    >
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Offres</p><p className="mt-2 text-2xl font-semibold">{rows.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Publiées</p><p className="mt-2 text-2xl font-semibold">{rows.filter((x: any) => x.is_published).length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Utilisation</p><p className="mt-2 text-sm font-medium">Voyages · Devis</p></Card>
      </div>
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:w-64"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Rechercher un événement…" value={search} onChange={e => setSearch(e.target.value)} /></div>
          <div className="flex flex-wrap gap-2"><Button size="sm" variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>Tous</Button><Button size="sm" variant={filter === "active" ? "default" : "outline"} onClick={() => setFilter("active")}>Publiées</Button><Button size="sm" variant={filter === "archived" ? "default" : "outline"} onClick={() => setFilter("archived")}>Archivées</Button><Button variant="outline" onClick={() => refetch()} disabled={isFetching}><RefreshCw className="mr-2 h-4 w-4" />Actualiser</Button></div>
        </div>
        <div className="flex items-center gap-1.5 self-start rounded-md border border-border/60 p-1 text-xs">
          <span className="px-1.5 text-muted-foreground">Afficher en</span>
          <button onClick={() => changeDisplayCurrency("EUR")} className={`rounded px-2.5 py-1 ${displayCurrency === "EUR" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>EUR</button>
          <button onClick={() => changeDisplayCurrency("BRL")} className={`rounded px-2.5 py-1 ${displayCurrency === "BRL" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>BRL</button>
        </div>
      </div>
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(i => <Card key={i} className="h-48 animate-pulse bg-muted/50" />)}</div>
      ) : error ? (
        <Card className="border-destructive/40 p-8"><h3 className="font-semibold">Impossible de charger la billetterie</h3><p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p></Card>
      ) : !visible.length ? (
        <Card className="border-dashed p-12 text-center"><Ticket className="mx-auto mb-4 h-8 w-8 text-primary" /><h3 className="text-xl">Aucune offre</h3><p className="mt-2 text-sm text-muted-foreground">Modifie la recherche ou crée une nouvelle offre.</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t: any) => {
            const hasVariants = t.cheapestVariantPrice !== null;
            const saleEur = hasVariants ? t.cheapestVariantPrice : Number(t.public_price ?? 0);
            const hasSale = hasVariants || t.public_price !== null;
            const costEur = Number(t.supplier_cost ?? t.supplier_net ?? 0) + Number(t.fixed_cost ?? 0);
            const commissionEur = saleEur * Number(t.commission_pct ?? 0) / 100;
            const marginEur = saleEur - costEur - commissionEur;
            return (
              <Link key={t.id} to="/billetterie/$id" params={{ id: t.id }}>
                <Card className="h-full overflow-hidden border-border/60 transition-shadow hover:shadow-[var(--shadow-soft)]">
                  <div className="relative overflow-hidden bg-muted/40" style={{ aspectRatio: (t.photo_ratio ?? "16/9").replace("/", " / ") }}>
                    {t.photo_url ? <img src={t.photo_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><Ticket className="h-8 w-8 text-primary/40" /></div>}
                  </div>
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{t.title}</h3><Badge variant={t.is_published ? "default" : "outline"}>{t.is_published ? "Publié" : "Archivé"}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{t.venue ?? "Lieu à confirmer"}</p></div>
                      <Badge variant="outline">{t.event_date ?? "Date à confirmer"}</Badge>
                    </div>
                    <div className="mt-5 grid grid-cols-3 gap-3 text-sm">
                      <div><p className="text-xs text-muted-foreground">{hasVariants ? "Dès" : "Vente"}</p><p className="font-semibold">{hasSale ? displayEur(saleEur, displayCurrency) : "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Coût</p><p className="font-semibold">{costEur ? displayEur(costEur, displayCurrency) : "—"}</p></div>
                      <div><p className="text-xs text-muted-foreground">Marge</p><p className={marginEur < 0 ? "font-semibold text-destructive" : "font-semibold"}>{hasSale ? displayEur(marginEur, displayCurrency) : "—"}</p></div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

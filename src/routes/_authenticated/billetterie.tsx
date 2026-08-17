import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Ticket } from "lucide-react";

export const Route = createFileRoute("/_authenticated/billetterie")({ component: Ticketing, head: () => ({ meta: [{ title: "Billetterie — JEITINHO" }] }) });

function Ticketing() {
  const { data, isLoading, error } = useQuery({ queryKey: ["ticket-offers"], queryFn: async () => { const { data, error } = await (supabase as any).from("ticket_offers").select("*").order("event_date", { ascending: true }); if (error) throw error; return data ?? []; } });
  return <PageShell eyebrow="Catalogue commercial" title="Billetterie" description="Prix de vente, net fournisseur et commission des offres billetterie.">
    {isLoading ? <div className="text-sm text-muted-foreground">Chargement…</div> : error ? <Card className="border-destructive/40 p-8"><h3 className="font-semibold">Impossible de charger la billetterie</h3><p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p></Card> : !data.length ? <Card className="border-dashed p-12 text-center">Aucune offre billetterie.</Card> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{data.map((ticket: any) => { const sale = Number(ticket.public_price ?? 0); const net = Number(ticket.supplier_net ?? 0); const commission = sale * Number(ticket.commission_pct ?? 0) / 100; const margin = sale - net + commission; return <Card key={ticket.id} className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /><h3 className="font-semibold">{ticket.title}</h3></div><p className="mt-2 text-sm text-muted-foreground">{ticket.venue ?? "Lieu à confirmer"}</p></div><Badge variant="outline">{ticket.event_date ?? "Date à confirmer"}</Badge></div><div className="mt-5 grid grid-cols-3 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Vente</p><p className="font-semibold">{sale || "—"} {ticket.currency}</p></div><div><p className="text-xs text-muted-foreground">Net</p><p className="font-semibold">{net || "—"} {ticket.currency}</p></div><div><p className="text-xs text-muted-foreground">Marge simulée</p><p className="font-semibold">{net ? `${margin} ${ticket.currency}` : "—"}</p></div></div></Card>; })}</div>}
  </PageShell>;
}

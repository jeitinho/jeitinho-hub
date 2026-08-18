import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plane, CalendarDays } from "lucide-react";

export const Route = createFileRoute("/_authenticated/voyages")({
  component: Voyages,
  head: () => ({ meta: [{ title: "Voyages — JEITINHO" }] }),
});

function Voyages() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      // Keep this query aligned with the canonical trips table. Financial totals
      // live on trip_activities rather than on trips itself.
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select("id,reference,title,status,start_date,end_date,client_id,currency,created_at")
        .order("start_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (tripsError) throw tripsError;

      const rows = trips ?? [];
      const clientIds = [...new Set(rows.map((row) => row.client_id).filter(Boolean))];
      const tripIds = rows.map((row) => row.id);

      const [clientsResult, activitiesResult] = await Promise.all([
        clientIds.length
          ? supabase.from("clients").select("id,full_name").in("id", clientIds)
          : Promise.resolve({ data: [], error: null }),
        tripIds.length
          ? supabase.from("trip_activities").select("trip_id,sale_price,supplier_cost,commission_amount,margin_amount").in("trip_id", tripIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (clientsResult.error) throw clientsResult.error;
      if (activitiesResult.error) throw activitiesResult.error;

      const names = new Map((clientsResult.data ?? []).map((client) => [client.id, client.full_name]));
      const financials = new Map<string, { sale: number; margin: number }>();

      for (const activity of activitiesResult.data ?? []) {
        const current = financials.get(activity.trip_id) ?? { sale: 0, margin: 0 };
        current.sale += Number(activity.sale_price ?? 0);
        current.margin += Number(activity.margin_amount ?? (Number(activity.sale_price ?? 0) - Number(activity.supplier_cost ?? 0) - Number(activity.commission_amount ?? 0)));
        financials.set(activity.trip_id, current);
      }

      return rows.map((row) => ({
        ...row,
        client_name: row.client_id ? names.get(row.client_id) ?? null : null,
        quoted_amount: financials.get(row.id)?.sale ?? 0,
        margin_amount: financials.get(row.id)?.margin ?? 0,
      }));
    },
  });

  return (
    <PageShell eyebrow="Conciergerie" title="Voyages" description="Le cockpit opérationnel des séjours clients : voyageurs, activités, prestataires, coûts et marge.">
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((i) => <Card key={i} className="h-44 animate-pulse bg-muted/50" />)}</div>
      ) : error ? (
        <Card className="border-destructive/40 p-8"><h3 className="font-semibold">Impossible de charger les voyages</h3><p className="mt-2 text-sm text-muted-foreground">{error instanceof Error ? error.message : "Erreur Supabase"}</p></Card>
      ) : !data?.length ? (
        <Card className="border-dashed p-16 text-center"><Plane className="mx-auto mb-4 h-8 w-8 text-primary" /><h3 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>Aucun voyage</h3><p className="mt-2 text-sm text-muted-foreground">Un voyage apparaîtra ici dès qu'un devis accepté sera converti.</p></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {data.map((trip) => (
            <Link key={trip.id} to="/voyages/$id" params={{ id: trip.id }}>
              <Card className="h-full border-border/60 p-5 transition-shadow hover:shadow-[var(--shadow-elevated)]">
                <div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{trip.reference}</p><h3 className="mt-1 text-lg" style={{ fontFamily: "Fraunces, serif" }}>{trip.title}</h3></div><Badge variant="secondary">{trip.status}</Badge></div>
                <p className="mt-3 text-sm font-medium">{trip.client_name ?? "Client non renseigné"}</p>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" />{trip.start_date ?? "Date à définir"}{trip.end_date ? ` → ${trip.end_date}` : ""}</div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div><p className="text-xs text-muted-foreground">Vente activités</p><p className="font-semibold">{trip.quoted_amount.toFixed(2)} {trip.currency}</p></div><div><p className="text-xs text-muted-foreground">Marge</p><p className="font-semibold">{trip.margin_amount.toFixed(2)} {trip.currency}</p></div></div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}

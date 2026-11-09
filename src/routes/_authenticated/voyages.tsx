/* eslint-disable @typescript-eslint/no-explicit-any -- typage historique (lignes Supabase lues en any) */
import { useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plane, CalendarDays, Plus, Search, Users, ListTodo } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  countdownLabel,
  formatTripRange,
  nights,
  sortTrips,
  todayRio,
  tripPhase,
  type TripPhase,
} from "@/lib/trips/list-rules";
import { formatMoney } from "@/lib/quotes/status";
import { tripStatusLabel } from "@/lib/trips/status";

export const Route = createFileRoute("/_authenticated/voyages")({
  component: Layout,
  head: () => ({ meta: [{ title: "Voyages — JEITINHO" }] }),
});
function Layout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path.replace(/\/$/, "") !== "/voyages") return <Outlet />;
  return <Voyages />;
}
type QueryStage = "trips" | "clients" | "trip_activities";
class DbQueryError extends Error {
  stage: QueryStage;
  constructor(stage: QueryStage, message: string) {
    super(message);
    this.stage = stage;
  }
}
const FILTERS: { key: "actifs" | TripPhase | "tous"; label: string }[] = [
  { key: "actifs", label: "En cours & à venir" },
  { key: "sans_date", label: "Sans dates" },
  { key: "passe", label: "Passés" },
  { key: "tous", label: "Tous" },
];
const PHASE_TONE: Record<TripPhase, string> = {
  en_cours: "bg-emerald-600 text-white",
  a_venir: "bg-primary/10 text-primary",
  sans_date: "bg-muted text-muted-foreground",
  passe: "bg-muted text-muted-foreground",
  annule: "bg-muted text-muted-foreground line-through",
};
const norm = (v: string) =>
  v
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

function Voyages() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("actifs");
  const [q, setQ] = useState("");
  const today = todayRio();
  const { data, isLoading, error } = useQuery({
    queryKey: ["trips"],
    queryFn: async () => {
      const { data: trips, error: tripsError } = await supabase
        .from("trips")
        .select(
          "id,reference,title,status,start_date,end_date,client_id,source_prospect_id,party_size,quote_id,created_at,currency",
        )
        .order("start_date", { ascending: true })
        .order("created_at", { ascending: false });
      if (tripsError) throw new DbQueryError("trips", tripsError.message);
      const rows = (trips ?? []) as any[];
      const clientIds = [
        ...new Set(rows.map((r) => r.client_id).filter((id): id is string => id !== null)),
      ];
      const prospectIds = [
        ...new Set(
          rows
            .filter((r) => !r.client_id)
            .map((r) => r.source_prospect_id)
            .filter((id): id is string => !!id),
        ),
      ];
      const tripIds = rows.map((r) => r.id);
      const [clientsResult, activitiesResult, prospectsResult] = await Promise.all([
        clientIds.length
          ? supabase.from("clients").select("id,full_name").in("id", clientIds)
          : Promise.resolve({ data: [], error: null }),
        tripIds.length
          ? supabase
              .from("trip_activities")
              .select(
                "trip_id,sale_price,supplier_cost,commission_amount,margin_amount,kind,day,status",
              )
              .in("trip_id", tripIds)
          : Promise.resolve({ data: [], error: null }),
        prospectIds.length
          ? supabase.from("prospects").select("id,name").in("id", prospectIds)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (clientsResult.error) throw new DbQueryError("clients", clientsResult.error.message);
      if (activitiesResult.error)
        throw new DbQueryError("trip_activities", activitiesResult.error.message);
      const names = new Map(
        (clientsResult.data ?? ([] as any[])).map((c: any) => [c.id, c.full_name]),
      );
      const prospectNames = new Map(
        ((prospectsResult as any).data ?? []).map((p: any) => [p.id, p.name]),
      );
      const financials = new Map<
        string,
        { sale: number; margin: number; activities: number; toPlace: number; confirmed: number }
      >();
      for (const a of (activitiesResult.data ?? []) as any[]) {
        const current = financials.get(a.trip_id) ?? {
          sale: 0,
          margin: 0,
          activities: 0,
          toPlace: 0,
          confirmed: 0,
        };
        current.sale += Number(a.sale_price ?? 0);
        current.margin += Number(
          a.margin_amount ??
            Number(a.sale_price ?? 0) -
              Number(a.supplier_cost ?? 0) -
              Number(a.commission_amount ?? 0),
        );
        if ((a.kind ?? "activity") === "activity") {
          current.activities += 1;
          if (!a.day) current.toPlace += 1;
          if (["confirmed", "client_informed", "completed", "done"].includes(a.status))
            current.confirmed += 1;
        }
        financials.set(a.trip_id, current);
      }
      return rows.map((r) => ({
        ...r,
        client_name: r.client_id ? (names.get(r.client_id) ?? null) : null,
        prospect_name:
          !r.client_id && r.source_prospect_id
            ? (prospectNames.get(r.source_prospect_id) ?? null)
            : null,
        quoted_amount: financials.get(r.id)?.sale ?? 0,
        margin_amount: financials.get(r.id)?.margin ?? 0,
        activity_count: financials.get(r.id)?.activities ?? 0,
        to_place: financials.get(r.id)?.toPlace ?? 0,
        confirmed_count: financials.get(r.id)?.confirmed ?? 0,
      }));
    },
  });
  const counts = useMemo(() => {
    const c: Record<string, number> = { actifs: 0, sans_date: 0, passe: 0, tous: 0 };
    for (const t of (data ?? []) as any[]) {
      const p = tripPhase(t, today);
      c.tous += 1;
      if (p === "en_cours" || p === "a_venir") c.actifs += 1;
      if (p === "sans_date") c.sans_date += 1;
      if (p === "passe" || p === "annule") c.passe += 1;
    }
    return c;
  }, [data, today]);
  const visible = useMemo(() => {
    const needle = norm(q.trim());
    const rows = ((data ?? []) as any[]).filter((t) => {
      const p = tripPhase(t, today);
      const okPhase =
        filter === "tous" ||
        (filter === "actifs" && (p === "en_cours" || p === "a_venir")) ||
        (filter === "passe" && (p === "passe" || p === "annule")) ||
        p === filter;
      if (!okPhase) return false;
      if (!needle) return true;
      return norm(
        [t.title, t.reference, t.client_name, t.prospect_name].filter(Boolean).join(" "),
      ).includes(needle);
    });
    return sortTrips(rows, today);
  }, [data, filter, q, today]);
  const queryError = error instanceof DbQueryError ? error : null;
  return (
    <PageShell
      eyebrow="Conciergerie"
      title="Voyages"
      description="Les séjours clients, du plus proche au plus lointain : voyageurs, planning, prestataires, coûts et marge."
      actions={
        <Link to="/voyages/new">
          <Button className="btn-primary">
            <Plus className="mr-2 h-4 w-4" />
            Créer un voyage
          </Button>
        </Link>
      }
    >
      {!isLoading && !error && !!data?.length && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 rounded-lg bg-muted/60 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label} <span className="ml-1 tabular-nums opacity-60">{counts[f.key] ?? 0}</span>
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Client, titre, référence…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>
      )}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="h-44 animate-pulse bg-muted/50" />
          ))}
        </div>
      ) : error ? (
        <Card className="border-destructive/40 p-8">
          <h3 className="font-semibold">Impossible de charger les voyages</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Erreur de base de données"}
          </p>
          {queryError && (
            <div className="mt-4 rounded-md bg-muted/50 p-4 text-xs leading-6">
              <div>étape: {queryError.stage}</div>
              <div>détails: {queryError.message}</div>
            </div>
          )}
        </Card>
      ) : !data?.length ? (
        <Card className="border-dashed p-16 text-center">
          <Plane className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h3 className="text-xl font-display">
            Aucun voyage
          </h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Créez un voyage manuellement ou convertissez un devis accepté.
          </p>
          <Link to="/voyages/new" className="mt-6 inline-block">
            <Button className="btn-primary">
              <Plus className="mr-2 h-4 w-4" />
              Créer le premier voyage
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visible.length === 0 && (
            <Card className="col-span-full border-dashed p-10 text-center text-sm text-muted-foreground">
              Aucun voyage ne correspond.{" "}
              {q ? "Essaie un autre nom." : "Change de filtre pour voir les autres voyages."}
            </Card>
          )}
          {visible.map((trip: any) => (
            <Link key={trip.id} to="/voyages/$id" params={{ id: trip.id }}>
              <Card className="h-full border-border/60 p-5 transition-shadow hover:shadow-[var(--shadow-elevated)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground">{trip.reference}</p>
                    <h3 className="mt-1 text-lg font-display">
                      {trip.title}
                    </h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="secondary">{tripStatusLabel(trip.status)}</Badge>
                    {countdownLabel(trip, today) && countdownLabel(trip, today) !== "Terminé" && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${PHASE_TONE[tripPhase(trip, today)]}`}
                      >
                        {countdownLabel(trip, today)}
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm font-medium">
                  {trip.client_name ??
                    (trip.prospect_name ? (
                      <>
                        {trip.prospect_name}{" "}
                        <span className="text-xs font-normal text-muted-foreground">(demande)</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Client non renseigné</span>
                    ))}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatTripRange(trip.start_date, trip.end_date)}
                    {nights(trip.start_date, trip.end_date)
                      ? ` · ${nights(trip.start_date, trip.end_date)} nuits`
                      : ""}
                  </span>
                  {trip.party_size ? (
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      {trip.party_size} pers.
                    </span>
                  ) : null}
                  {trip.activity_count > 0 && (
                    <span
                      className={`flex items-center gap-1.5 ${trip.to_place ? "text-amber-700" : ""}`}
                    >
                      <ListTodo className="h-3.5 w-3.5" />
                      {trip.activity_count} presta.
                      {trip.to_place ? ` · ${trip.to_place} à placer` : ""}
                    </span>
                  )}
                </div>
                {trip.activity_count > 0 && (
                  <div
                    className="mt-3"
                    title="Prestations confirmées par les prestataires (comme Tourwriter)"
                  >
                    <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                      <span>Confirmations prestataires</span>
                      <span className="tabular-nums">
                        {trip.confirmed_count}/{trip.activity_count}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${trip.confirmed_count === trip.activity_count ? "bg-emerald-600" : "bg-amber-500"}`}
                        style={{ width: `${(trip.confirmed_count / trip.activity_count) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Vente activités</p>
                    <p className="font-semibold">
                      {formatMoney(trip.quoted_amount, trip.currency ?? "EUR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Marge</p>
                    <p className="font-semibold">
                      {formatMoney(trip.margin_amount, trip.currency ?? "EUR")}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}

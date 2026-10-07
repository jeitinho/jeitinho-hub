import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Inbox, RefreshCw, Search, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  DEMANDES_QUERY_KEY,
  STAGES,
  compareDemandes,
  fetchDemandes,
  isToHandleToday,
  matchesSearch,
  pipelineCounters,
  sourceGroup,
  type Demande,
} from "@/lib/ops/demandes";
import { DemandeCard } from "./demande-card";
import { DemandeSheet } from "./demande-sheet";

const ALL_SOURCES = "__all__";
const BOARD_STAGES = STAGES.filter((s) => s.key !== "perdue");

export function DemandesBoard({ onOpenRelances }: { onOpenRelances?: () => void }) {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: DEMANDES_QUERY_KEY,
    queryFn: fetchDemandes,
    refetchInterval: 120_000,
  });
  const [search, setSearch] = useState("");
  const [source, setSource] = useState(ALL_SOURCES);
  const [todayOnly, setTodayOnly] = useState(false);
  const [showLost, setShowLost] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const demandes = useMemo(() => data?.demandes ?? [], [data]);
  const counters = useMemo(
    () => pipelineCounters(demandes, data?.quotes ?? []),
    [demandes, data?.quotes],
  );
  const sourceOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of demandes) {
      for (const g of new Set(d.sources.map(sourceGroup))) counts.set(g, (counts.get(g) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [demandes]);

  const visible = useMemo(
    () =>
      demandes.filter(
        (d) =>
          (source === ALL_SOURCES || d.sources.some((s) => sourceGroup(s) === source)) &&
          (!todayOnly || isToHandleToday(d)) &&
          matchesSearch(d, search),
      ),
    [demandes, source, todayOnly, search],
  );
  const byStage = useMemo(() => {
    const map = new Map<string, Demande[]>();
    for (const s of STAGES) map.set(s.key, []);
    for (const d of visible) map.get(d.stage)?.push(d);
    for (const list of map.values()) list.sort(compareDemandes);
    return map;
  }, [visible]);

  const selected = demandes.find((d) => d.key === openKey) ?? null;
  const filtered = search.trim() !== "" || source !== ALL_SOURCES || todayOnly;
  const lost = byStage.get("perdue") ?? [];
  // Une recherche déplie les perdues : un nom cherché ne doit pas rester caché.
  const lostOpen = showLost || search.trim() !== "";
  const resetFilters = () => {
    setSearch("");
    setSource(ALL_SOURCES);
    setTodayOnly(false);
  };

  if (isLoading) {
    return (
      <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
        {BOARD_STAGES.map((s) => (
          <div key={s.key} className="h-48 animate-pulse rounded-lg bg-muted/40" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/40 p-8">
        <h3 className="font-semibold">Impossible de charger les demandes</h3>
        <p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => void refetch()}>
          <RefreshCw className="h-3.5 w-3.5" />
          Réessayer
        </Button>
      </Card>
    );
  }

  if (!demandes.length) {
    return (
      <Card className="border-dashed p-16 text-center">
        <Inbox className="mx-auto mb-4 h-8 w-8 text-primary" />
        <h3 className="text-xl">Aucune demande</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Les demandes du site jeitinho.fr arrivent ici automatiquement.
        </p>
        <Button asChild className="btn-primary mt-6">
          <Link to="/crm/leads/new">Saisir une demande</Link>
        </Button>
      </Card>
    );
  }

  // grid-cols-[minmax(0,1fr)] : le tableau défile dans sa zone sans élargir la page.
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <CounterCard
          label="À traiter aujourd'hui"
          value={counters.toHandle}
          hint={
            todayOnly
              ? "Filtre actif · cliquer pour tout voir"
              : "Chaudes + nouvelles de plus de 24 h"
          }
          tone={counters.toHandle > 0 ? "alert" : undefined}
          active={todayOnly}
          onClick={() => setTodayOnly((v) => !v)}
        />
        <CounterCard
          label="Devis sans réponse"
          value={counters.pendingQuotes}
          hint="Statut « Envoyé » · voir les relances"
          onClick={onOpenRelances}
        />
        <CounterCard
          label="Gagnées ce mois"
          value={counters.wonThisMonth}
          hint="Devis accepté ou demande gagnée"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nom, e-mail, téléphone, activité, n° de devis…"
            className="pl-8"
            aria-label="Rechercher une demande"
          />
        </div>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-full sm:w-56" aria-label="Filtrer par source">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_SOURCES}>Toutes les sources</SelectItem>
            {sourceOptions.map(([g, n]) => (
              <SelectItem key={g} value={g}>
                {g} ({n})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtered && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            <X className="h-3.5 w-3.5" />
            Effacer les filtres
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => void refetch()}
          disabled={isFetching}
          title="Actualiser"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
          <span className="sr-only sm:not-sr-only">Actualiser</span>
        </Button>
      </div>

      {filtered && visible.length === 0 ? (
        <Card className="border-dashed p-10 text-center">
          <p className="text-sm text-muted-foreground">Aucune demande ne correspond aux filtres.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
            Effacer les filtres
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-3 md:grid md:auto-cols-[minmax(236px,1fr)] md:grid-flow-col md:overflow-x-auto md:pb-2">
          {BOARD_STAGES.map((s) => {
            const items = byStage.get(s.key) ?? [];
            const hot = items.filter((d) => d.temperature === "chaud").length;
            return (
              <div key={s.key} className="flex min-w-0 flex-col rounded-lg bg-muted/30 p-2">
                <div className="mb-2 flex items-center justify-between gap-2 px-1">
                  <h3 className="text-xs font-medium">{s.label}</h3>
                  <span className="text-[11px] text-muted-foreground">
                    {hot > 0 && s.key !== "gagnee" && (
                      <span className="mr-1.5 text-destructive">
                        {hot} chaude{hot > 1 ? "s" : ""}
                      </span>
                    )}
                    {items.length}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {items.length === 0 && (
                    <p className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-[11px] text-muted-foreground">
                      Vide
                    </p>
                  )}
                  {items.map((d) => (
                    <DemandeCard
                      key={d.key}
                      demande={d}
                      all={demandes}
                      onOpen={() => setOpenKey(d.key)}
                      onQualified={(id) => setOpenKey(`p:${id}`)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {lost.length > 0 && (
        <div className="rounded-lg bg-muted/20 p-2">
          <button
            type="button"
            onClick={() => setShowLost((v) => !v)}
            className="flex w-full items-center gap-1.5 px-1 py-1 text-left text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-expanded={lostOpen}
          >
            {lostOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
            Perdues ({lost.length})
          </button>
          {lostOpen && (
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {lost.map((d) => (
                <DemandeCard
                  key={d.key}
                  demande={d}
                  all={demandes}
                  onOpen={() => setOpenKey(d.key)}
                  onQualified={(id) => setOpenKey(`p:${id}`)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <DemandeSheet
        demande={selected}
        all={demandes}
        onOpenChange={(open) => !open && setOpenKey(null)}
        onQualified={(id) => setOpenKey(`p:${id}`)}
      />
    </div>
  );
}

function CounterCard({
  label,
  value,
  hint,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  tone?: "alert";
  active?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="tracked text-[10px] text-muted-foreground">{label}</p>
      <p
        className={cn("mt-1 text-3xl", tone === "alert" && "text-destructive")}
        style={{ fontFamily: "Fraunces, serif" }}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </>
  );
  if (!onClick) return <Card className="p-4">{body}</Card>;
  return (
    <Card
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "cursor-pointer p-4 transition-colors hover:border-primary/40",
        active && "border-primary bg-primary/5",
      )}
    >
      {body}
    </Card>
  );
}

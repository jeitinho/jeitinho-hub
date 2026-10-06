import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { z } from "zod";
import { Handshake, Plus, Search, SquareKanban, Table2, X } from "lucide-react";
import { PageShell } from "@/components/page-shell";
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
  ACTIVE_STATUSES,
  KIND_LABEL,
  PARTNER_KINDS,
  PARTNER_STATUSES,
  SOURCE_LABEL,
  STATUS_LABEL,
  fetchNeighborhoods,
  fetchPartnerLinks,
  fetchPartnerList,
  isNewApplication,
  isOverdue,
  normalize,
  type Partner,
} from "@/lib/ops/partenaires";
import { PARTNERS_KEY } from "@/components/partenaires/use-partner-update";
import { PipelineBoard } from "@/components/partenaires/pipeline-board";
import { PartnersTable } from "@/components/partenaires/partners-table";
import { PartnerSheet } from "@/components/partenaires/partner-sheet";
import { QuickCreate } from "@/components/partenaires/quick-create";

const FOCUS = ["candidatures", "relancer", "actifs", "relais", "revendeurs"] as const;
type Focus = (typeof FOCUS)[number];

const searchSchema = z.object({
  vue: z.enum(["pipeline", "tableau"]).optional().catch(undefined),
  id: z.string().uuid().optional().catch(undefined),
  focus: z.enum(FOCUS).optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/partenaires")({
  validateSearch: searchSchema,
  component: PartnersPage,
  head: () => ({ meta: [{ title: "Partenaires — JEITINHO" }] }),
});

const FOCUS_DEF: Record<Focus, { label: string; test: (p: Partner) => boolean }> = {
  candidatures: { label: "Nouvelles candidatures", test: isNewApplication },
  relancer: { label: "À relancer", test: isOverdue },
  actifs: { label: "Partenaires actifs", test: (p) => ACTIVE_STATUSES.includes(p.status) },
  relais: {
    label: "Relais AFRO LOVE",
    test: (p) => p.kind === "relais_evenement" && p.status !== "refuse",
  },
  revendeurs: {
    label: "Revendeurs Réveillon",
    test: (p) => p.kind === "revendeur" && p.status !== "refuse",
  },
};

const ALL = "all";

function PartnersPage() {
  const { vue = "pipeline", id, focus } = Route.useSearch();
  const navigate = Route.useNavigate();
  const setSearch = (patch: { vue?: "pipeline" | "tableau"; id?: string; focus?: Focus }) =>
    void navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  const list = useQuery({ queryKey: [...PARTNERS_KEY, "list"], queryFn: fetchPartnerList });
  const links = useQuery({ queryKey: [...PARTNERS_KEY, "links"], queryFn: fetchPartnerLinks });
  const places = useQuery({
    queryKey: [...PARTNERS_KEY, "neighborhoods"],
    queryFn: fetchNeighborhoods,
    staleTime: 10 * 60_000,
  });
  const data = useMemo(() => list.data ?? [], [list.data]);

  const [creating, setCreating] = useState(false);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [source, setSource] = useState(ALL);
  const [quartier, setQuartier] = useState(ALL);

  const neighborhoods = useMemo(() => {
    if (places.data?.length) return places.data;
    return Array.from(new Set(data.map((p) => p.location).filter((l): l is string => !!l))).sort();
  }, [places.data, data]);
  const sources = useMemo(() => Array.from(new Set(data.map((p) => p.source))).sort(), [data]);
  const experienceCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of links.data?.experiences ?? [])
      m.set(e.partner_id, (m.get(e.partner_id) ?? 0) + 1);
    return m;
  }, [links.data]);

  const counts = useMemo(
    () =>
      Object.fromEntries(FOCUS.map((f) => [f, data.filter(FOCUS_DEF[f].test).length])) as Record<
        Focus,
        number
      >,
    [data],
  );

  const visible = useMemo(() => {
    const needle = normalize(q);
    const nq = normalize(quartier);
    return data.filter((p) => {
      if (focus && !FOCUS_DEF[focus].test(p)) return false;
      if (kind !== ALL && p.kind !== kind) return false;
      if (vue === "tableau" && status !== ALL && p.status !== status) return false;
      if (source !== ALL && p.source !== source) return false;
      if (quartier !== ALL && !normalize(p.location).includes(nq)) return false;
      if (!needle) return true;
      const hay = normalize(
        [
          p.name,
          p.contact_name,
          p.location,
          p.category,
          p.email,
          p.instagram,
          p.phone,
          p.whatsapp,
          p.next_action,
          p.notes,
        ]
          .filter(Boolean)
          .join(" "),
      );
      return hay.includes(needle);
    });
  }, [data, q, kind, status, source, quartier, focus, vue]);

  const filtered =
    !!focus ||
    !!q ||
    kind !== ALL ||
    source !== ALL ||
    quartier !== ALL ||
    (vue === "tableau" && status !== ALL);
  const reset = () => {
    setQ("");
    setKind(ALL);
    setStatus(ALL);
    setSource(ALL);
    setQuartier(ALL);
    setSearch({ focus: undefined });
  };

  const selected = id ? (data.find((p) => p.id === id) ?? null) : null;

  return (
    <PageShell
      eyebrow="Réseau"
      title="Partenaires"
      description="Prestataires, relais AFRO LOVE, revendeurs et candidatures reçues depuis blog.jeitinho.fr/partenaires."
      actions={
        <Button className="btn-primary" onClick={() => setCreating((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau partenaire
        </Button>
      }
    >
      {creating && (
        <QuickCreate
          neighborhoods={neighborhoods}
          onCancel={() => setCreating(false)}
          onCreated={(newId) => {
            setCreating(false);
            setSearch({ id: newId });
          }}
        />
      )}

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {FOCUS.map((f) => {
          const active = focus === f;
          const alert = (f === "candidatures" || f === "relancer") && counts[f] > 0;
          return (
            <button
              key={f}
              type="button"
              onClick={() => setSearch({ focus: active ? undefined : f })}
              className={cn(
                "rounded-lg border bg-card p-3 text-left transition-colors hover:border-primary/40",
                active ? "border-primary ring-1 ring-primary/40" : "border-border/60",
              )}
            >
              <p
                className={cn(
                  "text-2xl font-medium tabular-nums",
                  alert && (f === "relancer" ? "text-destructive" : "text-primary"),
                )}
              >
                {list.isLoading ? "…" : counts[f]}
              </p>
              <p className="text-xs text-muted-foreground">{FOCUS_DEF[f].label}</p>
            </button>
          );
        })}
      </div>

      <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="inline-flex shrink-0 self-start rounded-md border border-border/60 p-0.5">
          {(
            [
              ["pipeline", "Pipeline", SquareKanban],
              ["tableau", "Tableau", Table2],
            ] as const
          ).map(([v, label, Icon]) => (
            <button
              key={v}
              type="button"
              onClick={() => setSearch({ vue: v })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs",
                vue === v ? "bg-muted font-medium" : "text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un nom, un contact, un quartier…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <FilterSelect
            value={kind}
            onChange={setKind}
            all="Tous types"
            options={PARTNER_KINDS.map((k) => [k, KIND_LABEL[k]] as const)}
          />
          {vue === "tableau" && (
            <FilterSelect
              value={status}
              onChange={setStatus}
              all="Tous statuts"
              options={PARTNER_STATUSES.map((s) => [s, STATUS_LABEL[s]] as const)}
            />
          )}
          <FilterSelect
            value={source}
            onChange={setSource}
            all="Toutes sources"
            options={sources.map((s) => [s, SOURCE_LABEL[s] ?? s] as const)}
          />
          <FilterSelect
            value={quartier}
            onChange={setQuartier}
            all="Tous quartiers"
            options={neighborhoods.map((n) => [n, n] as const)}
          />
        </div>
      </div>

      {filtered && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {visible.length} sur {data.length}
            {focus && ` · ${FOCUS_DEF[focus].label}`}
          </span>
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1 text-primary hover:underline"
          >
            <X className="h-3 w-3" />
            Réinitialiser
          </button>
        </div>
      )}

      {list.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {list.error && (
        <Card className="border-destructive/40 p-6 text-sm">
          {(list.error as Error).message}
          <Button variant="outline" size="sm" className="ml-3" onClick={() => void list.refetch()}>
            Réessayer
          </Button>
        </Card>
      )}
      {links.error && (
        <p className="mb-3 text-xs text-destructive">
          Liens indisponibles : {(links.error as Error).message}
        </p>
      )}

      {!list.isLoading && !list.error && visible.length === 0 && (
        <Card className="border-dashed p-16 text-center">
          <Handshake className="mx-auto mb-4 h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">
            {data.length === 0
              ? "Aucun partenaire."
              : "Aucun partenaire ne correspond aux filtres."}
          </p>
          {filtered && (
            <Button variant="outline" size="sm" className="mt-4" onClick={reset}>
              Réinitialiser les filtres
            </Button>
          )}
        </Card>
      )}

      {!list.isLoading &&
        !list.error &&
        visible.length > 0 &&
        (vue === "pipeline" ? (
          <PipelineBoard partners={visible} onOpen={(pid) => setSearch({ id: pid })} />
        ) : (
          <PartnersTable
            partners={visible}
            experienceCount={experienceCount}
            onOpen={(pid) => setSearch({ id: pid })}
          />
        ))}

      <PartnerSheet
        partner={selected}
        links={links.data}
        neighborhoods={neighborhoods}
        onOpenChange={(open) => {
          if (!open) setSearch({ id: undefined });
        }}
      />
    </PageShell>
  );
}

function FilterSelect({
  value,
  onChange,
  all,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  all: string;
  options: (readonly [string, string])[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn("sm:w-40", value !== ALL && "border-primary/60")}>
        <SelectValue placeholder={all} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{all}</SelectItem>
        {options.map(([v, label]) => (
          <SelectItem key={v} value={v}>
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

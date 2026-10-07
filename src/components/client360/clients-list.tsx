import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, RefreshCw, Search, UserRound, X } from "lucide-react";
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
import { fetchClients, type ClientRecord } from "@/lib/clients-gateway";
import {
  buildClient360,
  fetchAllClientActivity,
  fmtWhen,
  phoneDigits,
  relativeDays,
  sourceInfo,
  type Client360,
} from "@/lib/ops/client360";
import { normalize } from "@/lib/ops/partenaires";
import { AmountLines, SourceBadge } from "./bits";

type SortKey = "activite" | "nom" | "creation";
const SORT_LABELS: Record<SortKey, string> = {
  activite: "Dernière activité",
  nom: "Nom",
  creation: "Date de création",
};

type Row = { c: ClientRecord; v: Client360 | null; sourceKey: string };

const GRID =
  "md:grid md:grid-cols-[minmax(0,2fr)_8.5rem_minmax(0,1.4fr)_8.5rem_9.5rem] md:items-center md:gap-4";

export function ClientsList() {
  const clientsQ = useQuery({ queryKey: ["clients"], queryFn: fetchClients });
  // Sous la clé ["clients"] : toute invalidation de la liste recalcule aussi l'activité.
  const activityQ = useQuery({
    queryKey: ["clients", "activity"],
    queryFn: fetchAllClientActivity,
  });
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [sort, setSort] = useState<SortKey>("activite");

  const rows = useMemo<Row[]>(() => {
    const now = Date.now();
    return (clientsQ.data ?? []).map((c) => ({
      c,
      v: activityQ.data ? buildClient360(c, activityQ.data, now) : null,
      sourceKey: sourceInfo(c.source)?.key ?? "none",
    }));
  }, [clientsQ.data, activityQ.data]);

  const sources = useMemo(() => {
    const m = new Map<string, { label: string; n: number }>();
    for (const r of rows) {
      const label = sourceInfo(r.c.source)?.label ?? "Sans source";
      const cur = m.get(r.sourceKey) ?? { label, n: 0 };
      cur.n += 1;
      m.set(r.sourceKey, cur);
    }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n || a[1].label.localeCompare(b[1].label));
  }, [rows]);

  const visible = useMemo(() => {
    const q = normalize(query);
    const digits = phoneDigits(query);
    const filtered = rows.filter((r) => {
      if (source !== "all" && r.sourceKey !== source) return false;
      if (!q) return true;
      return (
        normalize(r.c.full_name).includes(q) ||
        normalize(r.c.email).includes(q) ||
        normalize(r.c.company_name).includes(q) ||
        (digits.length >= 3 && phoneDigits(r.c.phone).includes(digits))
      );
    });
    const activityTs = (r: Row) => r.v?.lastActivity?.ts ?? Date.parse(r.c.updated_at);
    return filtered.sort((a, b) => {
      if (sort === "nom") return a.c.full_name.localeCompare(b.c.full_name, "fr");
      if (sort === "creation") return b.c.created_at.localeCompare(a.c.created_at);
      return activityTs(b) - activityTs(a);
    });
  }, [rows, query, source, sort]);

  const filtering = !!query.trim() || source !== "all";

  return (
    <PageShell
      eyebrow="Base clients"
      title="Clients"
      description="Chaque fiche regroupe demandes, devis, paiements, voyages, réservations et messages envoyés."
      actions={
        <Button asChild className="btn-primary">
          <Link to="/clients/new">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau client
          </Link>
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-60">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, e-mail ou téléphone"
            className="pl-9"
          />
        </div>
        <Select value={source} onValueChange={setSource}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les sources</SelectItem>
            {sources.map(([key, s]) => (
              <SelectItem key={key} value={key}>
                {s.label} ({s.n})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
              <SelectItem key={k} value={k}>
                Tri : {SORT_LABELS[k]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filtering && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setSource("all");
            }}
          >
            <X className="mr-1.5 h-4 w-4" />
            Effacer
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void clientsQ.refetch();
            void activityQ.refetch();
          }}
          disabled={clientsQ.isFetching || activityQ.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>

      {activityQ.error && (
        <Card className="mb-4 border-destructive/40 p-3 text-sm">
          Activité indisponible : {(activityQ.error as Error).message}. La liste reste utilisable.
        </Card>
      )}

      {clientsQ.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : clientsQ.error ? (
        <Card className="border-destructive/40 p-8">
          <h2 className="font-semibold">Impossible de charger les clients</h2>
          <p className="mt-2 text-sm text-muted-foreground">{(clientsQ.error as Error).message}</p>
          <Button className="mt-4" onClick={() => void clientsQ.refetch()}>
            Réessayer
          </Button>
        </Card>
      ) : !rows.length ? (
        <Card className="border-dashed p-16 text-center">
          <UserRound className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>
            Aucun client pour l'instant
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Créez une fiche manuellement ou convertissez un prospect qualifié depuis le CRM.
          </p>
          <Button asChild className="btn-primary mt-6">
            <Link to="/clients/new">Créer un client</Link>
          </Button>
        </Card>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted-foreground">
            {visible.length} client{visible.length > 1 ? "s" : ""}
            {filtering ? ` sur ${rows.length}` : ""}
          </p>
          <Card className="overflow-hidden border-border/60">
            <div
              className={`hidden border-b border-border/60 bg-muted/30 px-4 py-2 text-[10px] text-muted-foreground md:grid ${GRID} tracked`}
            >
              <span>Client</span>
              <span>Source</span>
              <span>Dernière activité</span>
              <span className="text-right">Encaissé</span>
              <span className="text-right">Devis en cours</span>
            </div>
            {visible.length === 0 ? (
              <p className="p-8 text-center text-sm text-muted-foreground">
                Aucun client ne correspond à ces filtres.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {visible.map((r) => (
                  <li key={r.c.id}>
                    <ClientRow row={r} loading={activityQ.isLoading} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </PageShell>
  );
}

function ClientRow({ row: { c, v }, loading }: { row: Row; loading: boolean }) {
  const last = v?.lastActivity;
  const open = v?.openQuotes ?? [];
  const pending = loading ? <span className="text-xs text-muted-foreground">…</span> : null;
  return (
    <Link
      to="/clients/$id"
      params={{ id: c.id }}
      className={`block space-y-2 p-4 hover:bg-muted/30 md:space-y-0 ${GRID}`}
    >
      <div className="flex min-w-0 items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">{c.full_name}</h3>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {[c.email, c.phone].filter(Boolean).join(" · ") || "Pas de contact"}
          </p>
        </div>
        <span className="shrink-0 md:hidden">
          <SourceBadge source={c.source} />
        </span>
      </div>
      <div className="hidden min-w-0 md:block">
        <SourceBadge source={c.source} />
      </div>
      <div className="grid grid-cols-3 gap-3 md:contents">
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground md:hidden">Activité</p>
          {last ? (
            <>
              <p className="text-xs tabular-nums">
                {fmtWhen(last.at)}{" "}
                <span className="text-muted-foreground">· {relativeDays(last.ts)}</span>
              </p>
              <p className="truncate text-[11px] text-muted-foreground" title={last.title}>
                {last.title}
              </p>
            </>
          ) : (
            (pending ?? <p className="text-xs text-muted-foreground">—</p>)
          )}
        </div>
        <div className="min-w-0 md:text-right">
          <p className="text-[10px] text-muted-foreground md:hidden">Encaissé</p>
          {v ? <AmountLines totals={v.collected} className="text-xs" /> : pending}
        </div>
        <div className="min-w-0 md:text-right">
          <p className="text-[10px] text-muted-foreground md:hidden">Devis en cours</p>
          {!v ? (
            pending
          ) : open.length === 0 ? (
            <p className="text-xs text-muted-foreground">—</p>
          ) : (
            <>
              <p className="text-xs">{open.length} devis · reste</p>
              <AmountLines totals={v.openRemaining} className="text-xs font-medium" />
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

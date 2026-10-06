import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Download, MailCheck, Users } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BarList } from "@/components/audience/bar-list";
import { AudienceFilterBar } from "@/components/audience/audience-filters";
import { ContactSheet } from "@/components/audience/contact-sheet";
import {
  EMPTY_FILTERS,
  ENGAGEMENT_LABELS,
  EXPORT_MAX,
  GENDER_LABELS,
  PAGE_SIZE,
  contactName,
  downloadText,
  fetchAudienceDimensions,
  fetchAudienceForExport,
  fetchAudiencePage,
  fetchAudienceStats,
  toCsv,
  type AudienceContact,
  type AudienceFilters,
} from "@/lib/ops/audience";

export const Route = createFileRoute("/_authenticated/audience")({
  component: AudiencePage,
  head: () => ({ meta: [{ title: "Audience — JEITINHO" }] }),
});

const ENGAGEMENT_TONE: Record<string, string> = {
  PRIORITAIRE_REACTIVATION: "bg-rose-500/15 text-rose-700 dark:text-rose-300",
  REACTIVATION: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  ENRICHISSEMENT: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  NURTURE: "bg-muted text-muted-foreground",
};

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "America/Sao_Paulo" });
}

const n = (v: number | undefined) => (v == null ? "—" : v.toLocaleString("fr-FR"));

function AudiencePage() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<AudienceFilters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<AudienceContact | null>(null);
  const [exporting, setExporting] = useState<number | null>(null);

  // Recherche envoyée au serveur après 300 ms sans frappe.
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);
  const query: AudienceFilters = { ...filters, q };

  const patchFilters = (patch: Partial<AudienceFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(0);
  };

  const stats = useQuery({
    queryKey: ["audience", "stats"],
    queryFn: fetchAudienceStats,
    staleTime: 60_000,
  });
  const dims = useQuery({
    queryKey: ["audience", "dimensions"],
    queryFn: fetchAudienceDimensions,
    staleTime: 5 * 60_000,
  });
  const list = useQuery({
    queryKey: ["audience", "page", query, page],
    queryFn: () => fetchAudiencePage(query, page),
    placeholderData: keepPreviousData,
  });

  const total = list.data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const rows = list.data?.rows ?? [];
  const s = stats.data;

  const exportCsv = async () => {
    if (total === 0) return;
    setExporting(0);
    try {
      const all = await fetchAudienceForExport(query, setExporting);
      const day = new Date().toISOString().slice(0, 10);
      downloadText(toCsv(all), `audience-${day}.csv`);
      toast.success(
        total > EXPORT_MAX
          ? `${n(all.length)} contacts exportés (limite ${n(EXPORT_MAX)} atteinte)`
          : `${n(all.length)} contacts exportés`,
      );
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setExporting(null);
    }
  };

  const kpis = [
    { label: "Contacts", value: s?.total, share: false },
    { label: "Opt-in newsletter", value: s?.newsletter, share: true },
    { label: "Avec e-mail", value: s?.withEmail, share: true },
    { label: "Avec téléphone", value: s?.withPhone, share: true },
    { label: "Acheteurs 24 mois", value: s?.recentBuyers, share: true },
  ];

  return (
    <PageShell
      eyebrow="Pilotage"
      title="Audience"
      description="Contacts événementiels (base LATINO / BRÉSIL Paris), segments et opt-ins newsletter."
      actions={
        <Button variant="outline" onClick={exportCsv} disabled={exporting !== null || total === 0}>
          <Download className="mr-2 h-4 w-4" />
          {exporting !== null
            ? `Export… ${n(exporting)}`
            : `Exporter ${total > 0 ? n(Math.min(total, EXPORT_MAX)) : ""} en CSV`}
        </Button>
      }
    >
      {stats.error && (
        <Card className="mb-4 border-destructive/40 p-4 text-sm">
          {(stats.error as Error).message}
        </Card>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <p className="text-xs text-muted-foreground">{k.label}</p>
            <p className="mt-2 text-2xl font-semibold tabular-nums">
              {stats.isLoading ? "…" : n(k.value)}
            </p>
            {k.share && s && k.value != null && s.total > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {Math.round((k.value / s.total) * 1000) / 10} %
              </p>
            )}
          </Card>
        ))}
      </div>

      <div className="mb-6 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-200">
        <MailCheck className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Seuls les contacts opt-in newsletter{s ? ` (${n(s.newsletter)})` : ""} peuvent recevoir
          des e-mails marketing. Pour une campagne, filtre « Opt-in newsletter » avant d'exporter.
        </p>
      </div>

      <div className="mb-8 grid gap-3 md:grid-cols-3">
        <BarList
          title="Engagement"
          loading={stats.isLoading}
          total={s?.total ?? 0}
          items={(s?.engagement ?? []).map((e) => ({
            key: e.key,
            label: e.key === "__none" ? "Non renseigné" : (ENGAGEMENT_LABELS[e.key] ?? e.key),
            count: e.count,
          }))}
          onSelect={(k) => {
            if (k !== "__none") patchFilters({ engagement: k });
          }}
        />
        <BarList
          title="Zone"
          loading={dims.isLoading}
          total={s?.total ?? 0}
          limit={8}
          items={(dims.data?.zones ?? []).map((z) => ({
            key: z.key,
            label: z.key === "__none" ? "Zone inconnue" : z.key,
            count: z.count,
          }))}
          onSelect={(k) => patchFilters({ zone: k })}
        />
        <BarList
          title="Genre"
          loading={stats.isLoading}
          total={s?.total ?? 0}
          items={(s?.gender ?? []).map((g) => ({
            key: g.key,
            label: g.key === "__none" ? "Non renseigné" : (GENDER_LABELS[g.key] ?? g.key),
            count: g.count,
          }))}
        />
      </div>
      {dims.error && (
        <p className="-mt-6 mb-6 text-xs text-destructive">
          Répartition par zone indisponible : {(dims.error as Error).message}
        </p>
      )}

      <AudienceFilterBar
        search={search}
        onSearch={setSearch}
        filters={filters}
        onChange={patchFilters}
        zones={dims.data?.zones ?? []}
        origins={dims.data?.origins ?? []}
      />

      {list.error && (
        <Card className="mb-3 border-destructive/40 p-4 text-sm">
          {(list.error as Error).message}
        </Card>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contact</TableHead>
              <TableHead className="hidden md:table-cell">E-mail / téléphone</TableHead>
              <TableHead className="hidden sm:table-cell">Zone</TableHead>
              <TableHead>Engagement</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Score</TableHead>
              <TableHead className="hidden lg:table-cell">Dernier achat</TableHead>
              <TableHead className="hidden text-right lg:table-cell">Billets</TableHead>
              <TableHead className="text-center">Opt-in</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className={list.isFetching && list.isPlaceholderData ? "opacity-60" : ""}>
            {list.isLoading && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  Chargement…
                </TableCell>
              </TableRow>
            )}
            {!list.isLoading && rows.length === 0 && !list.error && (
              <TableRow>
                <TableCell colSpan={8} className="py-14 text-center">
                  <Users className="mx-auto mb-3 h-6 w-6 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Aucun contact ne correspond à ces critères.
                  </p>
                </TableCell>
              </TableRow>
            )}
            {rows.map((c) => (
              <TableRow
                key={c.id}
                className="cursor-pointer"
                onClick={() => setSelected(c)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setSelected(c);
                }}
              >
                <TableCell>
                  <p className="font-medium">{contactName(c)}</p>
                  <p className="text-xs text-muted-foreground md:hidden">
                    {c.email ?? c.phone ?? "—"}
                  </p>
                  <p className="hidden text-xs text-muted-foreground md:block">{c.external_ref}</p>
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <p className="text-sm">{c.email ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{c.phone ?? "—"}</p>
                </TableCell>
                <TableCell className="hidden sm:table-cell">{c.zone ?? "—"}</TableCell>
                <TableCell>
                  {c.engagement ? (
                    <span
                      className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-medium ${ENGAGEMENT_TONE[c.engagement] ?? "bg-muted"}`}
                    >
                      {ENGAGEMENT_LABELS[c.engagement] ?? c.engagement}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums lg:table-cell">
                  {c.score ?? "—"}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  {fmtDate(c.last_purchase_at)}
                </TableCell>
                <TableCell className="hidden text-right tabular-nums lg:table-cell">
                  {c.tickets_count ?? 0}
                </TableCell>
                <TableCell className="text-center">
                  {c.newsletter_optin ? (
                    <MailCheck
                      className="mx-auto h-4 w-4 text-emerald-600"
                      aria-label="Opt-in newsletter"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
        <span>
          {total === 0
            ? "0 contact"
            : `${n(page * PAGE_SIZE + 1)}–${n(Math.min(total, (page + 1) * PAGE_SIZE))} sur ${n(total)}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          <span className="tabular-nums">
            {page + 1} / {pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <ContactSheet
        contact={selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
        onSaved={setSelected}
      />
    </PageShell>
  );
}

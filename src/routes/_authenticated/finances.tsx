import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Wallet } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Amounts, ObjectLinkView, SectionError } from "@/components/finances/finance-bits";
import { MonthlyChart, type ChartMode } from "@/components/finances/monthly-chart";
import { OpenQuotes } from "@/components/finances/open-quotes";
import { Commissions } from "@/components/finances/commissions";
import { fmtDateTime, fmtMoney } from "@/lib/ops/ops";
import {
  POLES,
  POLE_COLORS,
  POLE_LABELS,
  currentMonth,
  fetchReceipts,
  monthLabel,
  monthWindow,
  shiftMonth,
  sumByCurrency,
  totalsByPole,
} from "@/lib/ops/finances";

export const Route = createFileRoute("/_authenticated/finances")({
  component: FinancesPage,
  head: () => ({ meta: [{ title: "Finances — JEITINHO" }] }),
});

const LAST12 = "last12";
const RECENT_LIMIT = 30;

function fmtDay(iso: string) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  }
  return fmtDateTime(iso);
}

function FinancesPage() {
  const now = currentMonth();
  const [period, setPeriod] = useState<string>(LAST12);
  const [mode, setMode] = useState<ChartMode | null>(null);

  const windowEnd = period === LAST12 ? now : period;
  const months = useMemo(() => monthWindow(windowEnd), [windowEnd]);
  const monthOptions = useMemo(
    () => Array.from({ length: 24 }, (_, i) => shiftMonth(now, -i)),
    [now],
  );

  const receiptsQ = useQuery({
    queryKey: ["finances", "receipts", months[0], windowEnd],
    queryFn: () => fetchReceipts(months[0], windowEnd),
  });
  const all = useMemo(() => receiptsQ.data ?? [], [receiptsQ.data]);
  const scoped = useMemo(
    () => (period === LAST12 ? all : all.filter((r) => r.month === period)),
    [all, period],
  );
  const total = sumByCurrency(scoped);
  const byPole = totalsByPole(scoped);
  const periodLabel = period === LAST12 ? "12 derniers mois" : monthLabel(period);
  const chartMode: ChartMode =
    mode ?? (all.some((r) => r.currency === "BRL") || !all.length ? "BRL" : "EUR");
  const provisional = scoped.some((r) => r.provisional);

  return (
    <PageShell
      eyebrow="Pilotage"
      title="Finances"
      description="CA encaissé par pôle et par devise, devis à encaisser, commissions dues."
      actions={
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={LAST12}>12 derniers mois</SelectItem>
            {monthOptions.map((m) => (
              <SelectItem key={m} value={m}>
                {monthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      <SectionError error={receiptsQ.error} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4 sm:col-span-2 lg:col-span-1">
          <p className="text-xs text-muted-foreground">Total encaissé · {periodLabel}</p>
          <div className="mt-2">
            {receiptsQ.isLoading ? (
              <p className="text-2xl font-semibold">…</p>
            ) : (
              <Amounts totals={total} showIndicative />
            )}
          </div>
        </Card>
        {POLES.map((p) => (
          <Card key={p} className="p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className={`h-2 w-2 rounded-sm ${POLE_COLORS[p]}`} />
              {POLE_LABELS[p]}
            </p>
            <div className="mt-2">
              {receiptsQ.isLoading ? (
                <p className="text-2xl font-semibold">…</p>
              ) : (
                <Amounts totals={byPole[p]} />
              )}
            </div>
          </Card>
        ))}
      </div>
      <p className="-mt-3 mb-6 text-xs text-muted-foreground">
        Montants séparés par devise, sans conversion. GetYourGuide daté au jour de l'activité,
        Événements au jour de la soirée (CA brut du bilan
        {provisional ? ", ou dernier relevé billetterie si le bilan n'est pas saisi" : ""}).
      </p>

      <div className="mb-6">
        <MonthlyChart
          months={months}
          receipts={all}
          mode={chartMode}
          onMode={setMode}
          selected={period === LAST12 ? null : period}
          onSelect={(m) => setPeriod(m === period ? LAST12 : m)}
        />
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <OpenQuotes />
        <Commissions
          firstMonth={period === LAST12 ? months[0] : period}
          lastMonth={windowEnd}
          periodLabel={periodLabel}
        />
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-base font-semibold">Derniers encaissements · {periodLabel}</h2>
        {receiptsQ.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!receiptsQ.isLoading && !receiptsQ.error && scoped.length === 0 && (
          <div className="py-10 text-center">
            <Wallet className="mx-auto mb-3 h-6 w-6 text-primary" />
            <p className="text-sm text-muted-foreground">Aucun encaissement sur la période.</p>
          </div>
        )}
        <ul className="divide-y divide-border/50">
          {scoped.slice(0, RECENT_LIMIT).map((r) => (
            <li key={r.id} className="flex items-start justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`h-2 w-2 shrink-0 rounded-sm ${POLE_COLORS[r.pole]}`} />
                  <ObjectLinkView link={r.link} className="font-medium hover:underline">
                    {r.label}
                  </ObjectLinkView>
                  {r.provisional && (
                    <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] text-amber-700 dark:text-amber-300">
                      provisoire
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmtDay(r.date)} · {POLE_LABELS[r.pole]}
                  {r.detail ? ` · ${r.detail}` : ""}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums">
                {fmtMoney(r.amount, r.currency)}
              </p>
            </li>
          ))}
        </ul>
        {scoped.length > RECENT_LIMIT && (
          <p className="mt-2 text-xs text-muted-foreground">
            {RECENT_LIMIT} plus récents sur {scoped.length}.
          </p>
        )}
      </Card>
    </PageShell>
  );
}

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/ops/ops";
import {
  BRL_PER_EUR,
  POLES,
  POLE_COLORS,
  POLE_LABELS,
  monthLabel,
  type Pole,
  type Receipt,
} from "@/lib/ops/finances";

export type ChartMode = "EUR" | "BRL" | "EUR_IND";

const MODE_LABELS: Record<ChartMode, string> = {
  EUR: "EUR",
  BRL: "BRL",
  EUR_IND: "Tout en € (indicatif)",
};

/** Barres CSS empilées par pôle, une devise à la fois (ou conversion indicative explicite). */
export function MonthlyChart({
  months,
  receipts,
  mode,
  onMode,
  selected,
  onSelect,
}: {
  months: string[];
  receipts: Receipt[];
  mode: ChartMode;
  onMode: (m: ChartMode) => void;
  selected: string | null;
  onSelect: (month: string) => void;
}) {
  const currency = mode === "BRL" ? "BRL" : "EUR";
  const data = useMemo(() => {
    const byMonth = new Map<string, Record<Pole, number>>();
    for (const m of months) byMonth.set(m, { conciergerie: 0, gyg: 0, manuel: 0, evenements: 0 });
    for (const r of receipts) {
      const row = byMonth.get(r.month);
      if (!row) continue;
      let v: number | null = null;
      if (mode === "EUR_IND")
        v = r.currency === "EUR" ? r.amount : r.currency === "BRL" ? r.amount / BRL_PER_EUR : null;
      else if (r.currency === mode) v = r.amount;
      if (v != null) row[r.pole] += v;
    }
    return months.map((m) => {
      const row = byMonth.get(m)!;
      return { month: m, row, total: POLES.reduce((s, p) => s + row[p], 0) };
    });
  }, [months, receipts, mode]);
  const max = Math.max(1, ...data.map((d) => d.total));
  const empty = data.every((d) => d.total === 0);

  return (
    <Card className="p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">CA encaissé par mois</h2>
        <div className="flex flex-wrap gap-1">
          {(Object.keys(MODE_LABELS) as ChartMode[]).map((m) => (
            <Button
              key={m}
              size="sm"
              variant={mode === m ? "default" : "outline"}
              onClick={() => onMode(m)}
            >
              {MODE_LABELS[m]}
            </Button>
          ))}
        </div>
      </div>
      {empty ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Aucun encaissement en {mode === "EUR_IND" ? "EUR ni BRL" : mode} sur ces 12 mois.
        </p>
      ) : (
        <div className="flex h-48 items-end gap-1 sm:gap-2">
          {data.map((d) => (
            <button
              key={d.month}
              type="button"
              onClick={() => onSelect(d.month)}
              className={`group flex h-full min-w-0 flex-1 flex-col justify-end rounded-sm ${
                selected === d.month ? "bg-muted/70" : "hover:bg-muted/40"
              }`}
              title={`${monthLabel(d.month)} : ${fmtMoney(d.total, currency)}${mode === "EUR_IND" ? " (indicatif)" : ""}\n${POLES.filter(
                (p) => d.row[p] > 0,
              )
                .map((p) => `${POLE_LABELS[p]} : ${fmtMoney(d.row[p], currency)}`)
                .join("\n")}`}
            >
              <div
                className="mx-auto flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-t-sm"
                style={{ height: `${(d.total / max) * 100}%` }}
              >
                {POLES.map((p) =>
                  d.row[p] > 0 ? (
                    <div
                      key={p}
                      className={POLE_COLORS[p]}
                      style={{ height: `${(d.row[p] / d.total) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
            </button>
          ))}
        </div>
      )}
      <div className="mt-1 flex gap-1 sm:gap-2">
        {data.map((d) => (
          <span
            key={d.month}
            className={`min-w-0 flex-1 truncate text-center text-[10px] ${
              selected === d.month ? "font-semibold" : "text-muted-foreground"
            }`}
          >
            {monthLabel(d.month, "short")}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {POLES.map((p) => (
          <span key={p} className="flex items-center gap-1.5">
            <span className={`h-2.5 w-2.5 rounded-sm ${POLE_COLORS[p]}`} />
            {POLE_LABELS[p]}
          </span>
        ))}
        {mode === "EUR_IND" && (
          <span>· BRL convertis au taux fixe 1 € = {BRL_PER_EUR.toLocaleString("fr-FR")} R$</span>
        )}
      </div>
    </Card>
  );
}

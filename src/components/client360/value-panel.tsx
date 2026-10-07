import { CalendarClock, FileText, Wallet } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { fmtMoney } from "@/lib/ops/ops";
import {
  currenciesOf,
  fmtWhen,
  quoteStatus,
  relativeDays,
  type Client360,
  type CurrencyTotals,
} from "@/lib/ops/client360";
import { AmountLines, PanelTitle, TargetLink } from "./bits";

const SOURCE_LABELS: Record<keyof Client360["collectedBy"], string> = {
  payments: "paiements",
  ota: "plateformes",
  manuel: "Manuel",
};

function inline(t: CurrencyTotals) {
  return currenciesOf(t)
    .map((c) => fmtMoney(t[c], c))
    .join(" + ");
}

/** Colonne « Valeur » : encaissé, devis en cours, prochain événement. */
export function ValuePanel({ view }: { view: Client360 }) {
  const parts = (Object.keys(view.collectedBy) as (keyof Client360["collectedBy"])[]).filter(
    (k) => currenciesOf(view.collectedBy[k]).length > 0,
  );
  const [next, ...later] = view.upcoming;

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <PanelTitle icon={<Wallet className="h-3.5 w-3.5" />}>Encaissé</PanelTitle>
        <AmountLines
          totals={view.collected}
          className="text-xl font-semibold"
          empty="Rien d'encaissé"
        />
        {parts.length > 0 && (
          <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
            {parts.map((k) => (
              <li key={k}>
                {SOURCE_LABELS[k]} : {inline(view.collectedBy[k])}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Par devise, sans conversion. Réservations annulées exclues.
        </p>
      </Card>

      <Card className="p-4">
        <PanelTitle icon={<FileText className="h-3.5 w-3.5" />}>Devis en cours</PanelTitle>
        {view.openQuotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun devis envoyé ou accepté à solder.</p>
        ) : (
          <>
            <div className="mb-3">
              <p className="text-xs text-muted-foreground">Reste à payer</p>
              <AmountLines totals={view.openRemaining} className="text-base font-semibold" />
            </div>
            <ul className="divide-y divide-border/60">
              {view.openQuotes.map((q) => {
                const other = inline(q.otherCurrencyPaid);
                return (
                  <li key={q.id} className="py-2">
                    <Link
                      to="/devis/$id"
                      params={{ id: q.id }}
                      className="block text-sm font-medium hover:underline"
                    >
                      {q.label} · {q.title}
                    </Link>
                    <p className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
                      <span className="rounded border border-border px-1.5 text-[10px]">
                        {quoteStatus(q.status)}
                      </span>
                      <span className="tabular-nums">
                        reste {fmtMoney(q.remaining, q.currency)} sur{" "}
                        {fmtMoney(q.total, q.currency)}
                      </span>
                      {q.period_start && <span>{fmtWhen(q.period_start)}</span>}
                    </p>
                    {other && (
                      <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-300">
                        {other} reçus dans une autre devise, non déduits.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <Card className="p-4">
        <PanelTitle icon={<CalendarClock className="h-3.5 w-3.5" />}>Prochain événement</PanelTitle>
        {!next ? (
          <p className="text-sm text-muted-foreground">Rien de prévu.</p>
        ) : (
          <div>
            <TargetLink link={next.link} className="text-sm font-medium hover:underline">
              {next.title}
            </TargetLink>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fmtWhen(next.at)} · {relativeDays(next.ts)}
            </p>
            {next.detail && <p className="mt-0.5 text-xs text-muted-foreground">{next.detail}</p>}
            {later.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-border/60 pt-2 text-xs">
                {later.slice(0, 3).map((u) => (
                  <li key={u.key} className="flex items-baseline justify-between gap-2">
                    <TargetLink link={u.link} className="min-w-0 truncate hover:underline">
                      {u.title}
                    </TargetLink>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {fmtWhen(u.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}

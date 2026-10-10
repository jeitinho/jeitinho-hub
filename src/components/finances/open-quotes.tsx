import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { fmtDateTime, fmtMoney } from "@/lib/ops/ops";
import {
  BRL_PER_EUR,
  fetchOpenQuotes,
  sortedCurrencies,
  type CurrencyTotals,
} from "@/lib/ops/finances";
import { Amounts, SectionError } from "./finance-bits";

/** Devis acceptés (statut accepted) dont il reste quelque chose à encaisser. */
export function OpenQuotes() {
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["finances", "open-quotes"],
    queryFn: fetchOpenQuotes,
  });
  const remaining: CurrencyTotals = {};
  for (const q of data) remaining[q.currency] = (remaining[q.currency] ?? 0) + q.remaining;

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Devis acceptés non payés</h2>
          <p className="text-xs text-muted-foreground">
            Reste à encaisser, dans la devise du devis.
          </p>
        </div>
        <Amounts totals={remaining} size="sm" />
      </div>
      <SectionError error={error} />
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && !error && data.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Aucun devis accepté en attente de paiement.
        </p>
      )}
      <ul className="divide-y divide-border/50">
        {data.map((q) => {
          const other = sortedCurrencies(q.otherCurrencyPayments);
          return (
            <li key={q.id} className="py-2.5">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="min-w-0">
                  <Link
                    to="/devis/$id"
                    params={{ id: q.id }}
                    className="text-sm font-medium hover:underline"
                  >
                    {q.label} · {q.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {q.client_id ? (
                      <Link
                        to="/clients/$id"
                        params={{ id: q.client_id }}
                        className="hover:underline"
                      >
                        {q.client_name ?? "Client"}
                      </Link>
                    ) : (
                      "Sans client"
                    )}
                    {q.accepted_at ? ` · accepté le ${fmtDateTime(q.accepted_at)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {q.remaining > 0 ? fmtMoney(q.remaining, q.currency) : "Soldé"}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {fmtMoney(q.paid, q.currency)} / {fmtMoney(q.total, q.currency)}
                  </p>
                </div>
              </div>
              {other.length > 0 && (
                <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                  Dont {other.map((c) => fmtMoney(q.otherCurrencyPayments[c], c)).join(" + ")} payé
                  dans une autre devise que le devis ({q.currency}) :{" "}
                  {Object.keys(q.unconvertedPayments).length
                    ? `pas de taux connu pour ${Object.keys(q.unconvertedPayments).join(", ")}, non déduit du reste — à vérifier.`
                    : `converti au taux indicatif (1 EUR = ${String(BRL_PER_EUR).replace(".", ",")} BRL).`}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

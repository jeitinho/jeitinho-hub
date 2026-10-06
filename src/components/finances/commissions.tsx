import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { fmtMoney } from "@/lib/ops/ops";
import { fetchCommissions } from "@/lib/ops/finances";
import { SectionError } from "./finance-bits";

/**
 * Commissions dues aux revendeurs du Manuel (cumul, la base ne trace pas les
 * versements) et aux relais AFRO LOVE non payés.
 */
export function Commissions({
  firstMonth,
  lastMonth,
  periodLabel,
}: {
  firstMonth: string;
  lastMonth: string;
  periodLabel: string;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["finances", "commissions", firstMonth, lastMonth],
    queryFn: () => fetchCommissions(firstMonth, lastMonth),
  });
  const channels = data?.channels ?? [];
  const relays = data?.relays ?? [];

  return (
    <Card className="p-4">
      <h2 className="text-base font-semibold">Commissions dues</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        Revendeurs du Manuel (cumul depuis le début, aucun versement n'est enregistré) et relais
        événements non payés.
      </p>
      <SectionError error={error} />
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && !error && channels.length === 0 && relays.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">Aucune commission due.</p>
      )}

      {channels.length > 0 && (
        <>
          <h3 className="tracked mb-1 mt-2 text-[10px] text-muted-foreground">
            Manuel · revendeurs
          </h3>
          <ul className="divide-y divide-border/50">
            {channels.map((c) => (
              <li key={`${c.channel_id}-${c.currency}`} className="flex justify-between gap-3 py-2">
                <div className="min-w-0">
                  <Link to="/manuel" className="text-sm font-medium hover:underline">
                    {c.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {c.sales} vente(s) · {Math.round(c.rate * 1000) / 10} % ·{" "}
                    {fmtMoney(c.revenue, c.currency)} de CA
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {fmtMoney(c.commission, c.currency)}
                  </p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {periodLabel} : {fmtMoney(c.periodCommission, c.currency)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {relays.length > 0 && (
        <>
          <h3 className="tracked mb-1 mt-4 text-[10px] text-muted-foreground">
            Événements · relais
          </h3>
          <ul className="divide-y divide-border/50">
            {relays.map((r) => (
              <li key={r.id} className="flex justify-between gap-3 py-2">
                <div className="min-w-0">
                  {r.partner_id ? (
                    <Link to="/partenaires" className="text-sm font-medium hover:underline">
                      {r.partner_name}
                    </Link>
                  ) : (
                    <span className="text-sm font-medium">{r.partner_name}</span>
                  )}
                  <p className="text-xs text-muted-foreground">
                    <Link to="/evenements" search={{ id: r.event_id }} className="hover:underline">
                      {r.event_label}
                    </Link>{" "}
                    · {r.tickets} billet(s)
                  </p>
                </div>
                <p className="text-sm font-semibold tabular-nums">
                  {fmtMoney(r.amount, r.currency)}
                </p>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

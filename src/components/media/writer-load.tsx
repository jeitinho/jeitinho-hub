import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import {
  EDITORIAL_OWNERS,
  EDITORIAL_STATUSES,
  addDays,
  dayKey,
  fmtDayKey,
  isOverdue,
  mondayKey,
  todayKey,
  type EditorialItem,
} from "@/lib/ops/media";
import { useEditorialItems } from "./use-media";
import { StatusPill } from "./editorial-item-card";

const UNASSIGNED = "Non attribué";

/** Charge par rédacteur : items par responsable × statut sur les 4 prochaines semaines. */
export function WriterLoad() {
  const { data: items = [], isLoading, error } = useEditorialItems();
  const today = todayKey();
  const start = mondayKey(today);
  const end = addDays(start, 27);

  const { owners, statuses, grid, late, total } = useMemo(() => {
    const inRange = (i: EditorialItem) => {
      const k = i.planned_at ? dayKey(i.planned_at) : i.deadline;
      return !!k && k >= start && k <= end;
    };
    const scoped = items.filter(inRange);
    const ownerOf = (i: EditorialItem) => i.owner || UNASSIGNED;
    const ownerSet = new Set<string>(EDITORIAL_OWNERS);
    for (const i of items) ownerSet.add(ownerOf(i));
    const statuses: string[] = EDITORIAL_STATUSES.map((s) => s.value).filter(
      (s) => s !== "abandonne" || scoped.some((i) => i.status === s),
    );
    for (const i of scoped) if (!statuses.includes(i.status)) statuses.push(i.status);
    const grid = new Map<string, Map<string, number>>();
    for (const i of scoped) {
      const row = grid.get(ownerOf(i)) ?? new Map<string, number>();
      row.set(i.status, (row.get(i.status) ?? 0) + 1);
      grid.set(ownerOf(i), row);
    }
    const late = new Map<string, number>();
    for (const i of items)
      if (isOverdue(i, today)) late.set(ownerOf(i), (late.get(ownerOf(i)) ?? 0) + 1);
    const owners = Array.from(ownerSet).filter(
      (o) => o !== UNASSIGNED || grid.has(o) || late.has(o),
    );
    return { owners, statuses, grid, late, total: scoped.length };
  }, [items, start, end, today]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error)
    return <Card className="border-destructive/40 p-4 text-sm">{(error as Error).message}</Card>;

  const colTotal = (s: string) => owners.reduce((n, o) => n + (grid.get(o)?.get(s) ?? 0), 0);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Du {fmtDayKey(start, { day: "numeric", month: "short" })} au{" "}
        {fmtDayKey(end, { day: "numeric", month: "short", year: "numeric" })} · {total} contenu
        {total > 1 ? "s" : ""} planifié{total > 1 ? "s" : ""} (date de publication, sinon deadline).
        La colonne « En retard » compte toutes les deadlines dépassées non publiées.
      </p>
      {total === 0 && (
        <Card className="border-dashed p-4 text-sm text-muted-foreground">
          Rien de planifié sur les 4 prochaines semaines.{" "}
          <Link to="/contenus" className="text-primary hover:underline">
            Ouvrir le planning éditorial
          </Link>
        </Card>
      )}
      <div className="overflow-x-auto rounded-lg border border-border/60 bg-card">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border/60 text-left">
              <th className="p-3 font-medium">Responsable</th>
              {statuses.map((s) => (
                <th key={s} className="p-3 text-center font-normal">
                  <StatusPill status={s} />
                </th>
              ))}
              <th className="p-3 text-center font-medium">Total</th>
              <th className="p-3 text-center font-medium text-destructive">En retard</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {owners.map((o) => {
              const row = grid.get(o);
              const sum = statuses.reduce((n, s) => n + (row?.get(s) ?? 0), 0);
              const lateN = late.get(o) ?? 0;
              return (
                <tr key={o}>
                  <td className="p-3 font-medium">{o}</td>
                  {statuses.map((s) => {
                    const n = row?.get(s) ?? 0;
                    return (
                      <td
                        key={s}
                        className={`p-3 text-center tabular-nums ${n ? "" : "text-muted-foreground/50"}`}
                      >
                        {n || "·"}
                      </td>
                    );
                  })}
                  <td className="p-3 text-center font-semibold tabular-nums">{sum}</td>
                  <td
                    className={`p-3 text-center tabular-nums ${lateN ? "font-semibold text-destructive" : "text-muted-foreground/50"}`}
                  >
                    {lateN || "·"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t border-border/60 bg-muted/30 text-xs text-muted-foreground">
              <td className="p-3">Total</td>
              {statuses.map((s) => (
                <td key={s} className="p-3 text-center tabular-nums">
                  {colTotal(s)}
                </td>
              ))}
              <td className="p-3 text-center font-semibold tabular-nums">{total}</td>
              <td className="p-3 text-center tabular-nums">
                {Array.from(late.values()).reduce((a, b) => a + b, 0)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

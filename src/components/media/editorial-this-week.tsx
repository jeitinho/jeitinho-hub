import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  addDays,
  dayKey,
  fmtDayKey,
  isOverdue,
  mondayKey,
  todayKey,
  type EditorialItem,
} from "@/lib/ops/media";
import { OverdueBadge, StatusMenu } from "./editorial-item-card";

/** Encart « Cette semaine » : contenus de la semaine en cours, retards d'abord. */
export function EditorialThisWeek({
  items: allItems,
  onOpen,
  onShowLate,
  showAbandoned = false,
}: {
  items: EditorialItem[];
  onOpen: (item: EditorialItem) => void;
  onShowLate: () => void;
  /** Par défaut, les contenus abandonnés n'apparaissent pas. */
  showAbandoned?: boolean;
}) {
  const items = showAbandoned ? allItems : allItems.filter((i) => i.status !== "abandonne");
  const today = todayKey();
  const start = mondayKey(today);
  const end = addDays(start, 6);

  const week = items
    .filter((i) => {
      const k = i.planned_at ? dayKey(i.planned_at) : null;
      const inWeek = (x: string | null) => !!x && x >= start && x <= end;
      return inWeek(k) || inWeek(i.deadline);
    })
    .sort((a, b) => {
      const late = Number(isOverdue(b, today)) - Number(isOverdue(a, today));
      return (
        late || (a.planned_at ?? a.deadline ?? "").localeCompare(b.planned_at ?? b.deadline ?? "")
      );
    });
  const weekIds = new Set(week.map((i) => i.id));
  const olderLate = items.filter((i) => !weekIds.has(i.id) && isOverdue(i, today)).length;
  // Abandonné ≠ terminé : ni compté comme fait, ni dans le total.
  const counted = week.filter((i) => i.status !== "abandonne");
  const done = counted.filter((i) => i.status === "publie").length;

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h2 className="text-base font-medium">Cette semaine</h2>
          <span className="text-xs text-muted-foreground">
            {fmtDayKey(start, { day: "numeric", month: "short" })} –{" "}
            {fmtDayKey(end, { day: "numeric", month: "short" })} · {done}/{counted.length} publiés
          </span>
        </div>
        {olderLate > 0 && (
          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onShowLate}>
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-destructive" />
            {olderLate} en retard des semaines précédentes
          </Button>
        )}
      </div>
      {week.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun contenu prévu cette semaine.</p>
      ) : (
        <ul className="divide-y divide-border/60">
          {week.map((it) => (
            <li key={it.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
              <span className="w-16 flex-shrink-0 text-xs text-muted-foreground">
                {it.planned_at
                  ? fmtDayKey(dayKey(it.planned_at), { weekday: "short", day: "numeric" })
                  : "—"}
              </span>
              <button
                type="button"
                onClick={() => onOpen(it)}
                className="min-w-0 flex-1 truncate text-left text-sm hover:underline"
              >
                {it.title}
              </button>
              <span className="text-xs text-muted-foreground">{it.owner ?? "Non attribué"}</span>
              {isOverdue(it, today) && <OverdueBadge item={it} />}
              <StatusMenu item={it} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

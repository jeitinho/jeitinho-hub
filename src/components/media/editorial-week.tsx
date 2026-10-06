import { useMemo } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  addDays,
  dayKey,
  fmtDayKey,
  isOverdue,
  mondayKey,
  todayKey,
  type EditorialItem,
} from "@/lib/ops/media";
import { EditorialItemCard } from "./editorial-item-card";

function byPriority(a: EditorialItem, b: EditorialItem) {
  const late = Number(isOverdue(b)) - Number(isOverdue(a));
  return late || (a.planned_at ?? "").localeCompare(b.planned_at ?? "");
}

/** Vue tableau : une semaine, une ligne par jour. */
export function EditorialWeek({
  items,
  weekStart,
  onWeekChange,
  onOpen,
  onCreate,
}: {
  items: EditorialItem[];
  weekStart: string;
  onWeekChange: (monday: string) => void;
  onOpen: (item: EditorialItem) => void;
  onCreate: (day: string) => void;
}) {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const weekEnd = days[6];

  const byDay = useMemo(() => {
    const map = new Map<string, EditorialItem[]>();
    for (const it of items) {
      if (!it.planned_at) continue;
      const k = dayKey(it.planned_at);
      if (k < weekStart || k > weekEnd) continue;
      map.set(k, [...(map.get(k) ?? []), it]);
    }
    for (const list of map.values()) list.sort(byPriority);
    return map;
  }, [items, weekStart, weekEnd]);

  const unplanned = items.filter((i) => !i.planned_at).sort(byPriority);
  const weekCount = Array.from(byDay.values()).reduce((n, l) => n + l.length, 0);

  // Semaine la plus proche contenant des contenus (pour ne pas naviguer à l'aveugle).
  const nearest = useMemo(() => {
    if (weekCount) return null;
    const keys = items.filter((i) => i.planned_at).map((i) => mondayKey(dayKey(i.planned_at!)));
    const after = keys.filter((k) => k > weekStart).sort()[0];
    const before = keys
      .filter((k) => k < weekStart)
      .sort()
      .at(-1);
    return { after, before };
  }, [items, weekStart, weekCount]);

  const label = `Semaine du ${fmtDayKey(weekStart, { day: "numeric", month: "short" })} au ${fmtDayKey(
    weekEnd,
    { day: "numeric", month: "short", year: "numeric" },
  )}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => onWeekChange(addDays(weekStart, -7))}
            aria-label="Semaine précédente"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            className="h-8 w-8"
            onClick={() => onWeekChange(addDays(weekStart, 7))}
            aria-label="Semaine suivante"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {weekStart !== mondayKey(today) && (
            <Button size="sm" variant="ghost" onClick={() => onWeekChange(mondayKey(today))}>
              Aujourd'hui
            </Button>
          )}
        </div>
        <p className="text-sm font-medium">
          {label}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {weekCount} contenu{weekCount > 1 ? "s" : ""}
          </span>
        </p>
      </div>

      {nearest && (nearest.after || nearest.before) && (
        <Card className="flex flex-wrap items-center gap-2 border-dashed p-3 text-sm text-muted-foreground">
          Rien de planifié cette semaine.
          {nearest.before && (
            <Button size="sm" variant="outline" onClick={() => onWeekChange(nearest.before!)}>
              ← Semaine du {fmtDayKey(nearest.before, { day: "numeric", month: "short" })}
            </Button>
          )}
          {nearest.after && (
            <Button size="sm" variant="outline" onClick={() => onWeekChange(nearest.after!)}>
              Semaine du {fmtDayKey(nearest.after, { day: "numeric", month: "short" })} →
            </Button>
          )}
        </Card>
      )}

      <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card">
        {days.map((d) => {
          const list = byDay.get(d) ?? [];
          const isToday = d === today;
          return (
            <div key={d} className="grid gap-3 p-3 sm:grid-cols-[120px_1fr]">
              <div className="flex items-start justify-between gap-2 sm:flex-col sm:justify-start">
                <div>
                  <p
                    className={`text-xs uppercase tracking-wide ${isToday ? "font-semibold text-primary" : "text-muted-foreground"}`}
                  >
                    {fmtDayKey(d, { weekday: "long" })}
                  </p>
                  <p className={`text-lg ${isToday ? "text-primary" : ""}`}>
                    {fmtDayKey(d, { day: "numeric", month: "short" })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={() => onCreate(d)}
                >
                  <Plus className="mr-1 h-3 w-3" />
                  Ajouter
                </Button>
              </div>
              {list.length ? (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {list.map((it) => (
                    <EditorialItemCard key={it.id} item={it} onOpen={onOpen} />
                  ))}
                </div>
              ) : (
                <p className="self-center text-xs text-muted-foreground/70">—</p>
              )}
            </div>
          );
        })}
      </div>

      {unplanned.length > 0 && (
        <div className="space-y-2">
          <p className="tracked text-[10px] text-muted-foreground">
            Sans date de publication · {unplanned.length}
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {unplanned.map((it) => (
              <EditorialItemCard key={it.id} item={it} onOpen={onOpen} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

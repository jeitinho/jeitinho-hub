import { cn } from "@/lib/utils";
import { addDays, diffDays, itemsOnDay, type CalendarItem } from "@/lib/ops/calendrier";
import { ItemChip } from "./items";
import { SOURCE_META } from "./sources";

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const MAX_CHIPS = 3;
const MAX_DOTS = 4;

export function MonthView({
  from,
  to,
  month,
  today,
  items,
  onOpen,
  onOpenDay,
}: {
  from: string;
  to: string;
  /** Préfixe YYYY-MM du mois affiché. */
  month: string;
  today: string;
  items: CalendarItem[];
  onOpen: (item: CalendarItem) => void;
  onOpenDay: (day: string) => void;
}) {
  const days = Array.from({ length: diffDays(from, to) }, (_, i) => addDays(from, i));
  return (
    <div className="overflow-hidden rounded-lg border border-border/60 bg-card">
      <div className="grid grid-cols-7 border-b border-border/60">
        {WEEKDAYS.map((w) => (
          <div key={w} className="tracked px-2 py-2 text-[10px] uppercase text-muted-foreground">
            {w}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((d, i) => {
          const list = itemsOnDay(items, d);
          const inMonth = d.startsWith(month);
          const extra = list.length - MAX_CHIPS;
          return (
            <div
              key={d}
              className={cn(
                "flex min-h-16 min-w-0 flex-col gap-1 border-border/50 p-1 sm:min-h-28",
                i % 7 !== 6 && "border-r",
                i < days.length - 7 && "border-b",
                !inMonth && "bg-muted/30",
                d === today && "bg-primary/[0.06]",
              )}
            >
              <button
                type="button"
                onClick={() => onOpenDay(d)}
                className="flex cursor-pointer items-center justify-between rounded px-1 text-left"
                aria-label={`Voir le ${d}`}
              >
                <span
                  className={cn(
                    "inline-flex h-6 min-w-6 items-center justify-center rounded-full text-sm tabular-nums",
                    !inMonth && "text-muted-foreground/70",
                    d === today && "bg-primary px-1 text-primary-foreground",
                  )}
                >
                  {Number(d.slice(8))}
                </span>
              </button>

              {/* Mobile : pastilles, la case ouvre le jour */}
              {list.length > 0 && (
                <button
                  type="button"
                  onClick={() => onOpenDay(d)}
                  className="flex cursor-pointer flex-wrap items-center gap-1 px-1 sm:hidden"
                  aria-label={`${list.length} éléments`}
                >
                  {list.slice(0, MAX_DOTS).map((it) => (
                    <span
                      key={it.key}
                      className={cn("h-1.5 w-1.5 rounded-full", SOURCE_META[it.source].dot)}
                    />
                  ))}
                  {list.length > MAX_DOTS && (
                    <span className="text-[10px] leading-none text-muted-foreground">
                      +{list.length - MAX_DOTS}
                    </span>
                  )}
                </button>
              )}

              {/* Bureau : puces + « +n » */}
              <div className="hidden min-w-0 flex-col gap-1 sm:flex">
                {list.slice(0, MAX_CHIPS).map((it) => (
                  <ItemChip key={it.key} item={it} onOpen={onOpen} dense />
                ))}
                {extra > 0 && (
                  <button
                    type="button"
                    onClick={() => onOpenDay(d)}
                    className="cursor-pointer rounded px-1.5 text-left text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    +{extra}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

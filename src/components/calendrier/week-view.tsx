import { cn } from "@/lib/utils";
import {
  addDays,
  diffDays,
  itemsOnDay,
  keyToUtcDate,
  compareItems,
  isBand,
  type CalendarItem,
} from "@/lib/ops/calendrier";
import { ItemBar, ItemChip, ItemRow } from "./items";

const weekdayFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "UTC", weekday: "short" });
const longFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function WeekView({
  weekStart,
  today,
  items,
  onOpen,
  onAddOnDay,
}: {
  weekStart: string;
  today: string;
  items: CalendarItem[];
  onOpen: (item: CalendarItem) => void;
  onAddOnDay: (day: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const last = days[6];
  const bands = items
    .filter((it) => isBand(it) && it.start <= last && it.end >= weekStart)
    .sort(
      (a, b) =>
        a.start.localeCompare(b.start) || diffDays(b.start, b.end) - diffDays(a.start, a.end),
    );
  const singles = items.filter((it) => !isBand(it));

  return (
    <>
      {/* Bureau : 7 colonnes */}
      <div className="relative hidden overflow-hidden rounded-lg border border-border/60 bg-card md:block">
        <div className="pointer-events-none absolute inset-0 grid grid-cols-7 divide-x divide-border/50">
          {days.map((d) => (
            <div key={d} className={cn(d === today && "bg-primary/[0.06]")} />
          ))}
        </div>

        <div className="relative grid grid-cols-7 border-b border-border/60">
          {days.map((d) => {
            const date = keyToUtcDate(d);
            return (
              <button
                key={d}
                type="button"
                onClick={() => onAddOnDay(d)}
                title="Ajouter un rendez-vous ce jour"
                className="group cursor-pointer px-2 py-2 text-left"
              >
                <span
                  className={cn(
                    "tracked block text-[10px] uppercase text-muted-foreground",
                    d === today && "text-primary",
                  )}
                >
                  {weekdayFmt.format(date)}
                </span>
                <span
                  className={cn(
                    "inline-flex h-7 min-w-7 items-center justify-center rounded-full text-lg tabular-nums",
                    d === today && "bg-primary px-1.5 text-primary-foreground",
                  )}
                  style={{ fontFamily: "Fraunces, serif" }}
                >
                  {date.getUTCDate()}
                </span>
                <span className="ml-1 text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">
                  +
                </span>
              </button>
            );
          })}
        </div>

        {bands.length > 0 && (
          <div className="relative grid grid-cols-7 gap-y-1 border-b border-border/40 px-0.5 py-1.5 [grid-auto-flow:row_dense]">
            {bands.map((it) => {
              const s = it.start < weekStart ? weekStart : it.start;
              const e = it.end > last ? last : it.end;
              return (
                <ItemBar
                  key={it.key}
                  item={it}
                  colStart={diffDays(weekStart, s) + 1}
                  colEnd={diffDays(weekStart, e) + 2}
                  clippedStart={it.start < weekStart}
                  clippedEnd={it.end > last}
                  onOpen={onOpen}
                />
              );
            })}
          </div>
        )}

        <div className="relative grid min-h-[22rem] grid-cols-7">
          {days.map((d) => {
            const list = singles.filter((it) => it.start === d).sort(compareItems);
            return (
              <div key={d} className="flex min-w-0 flex-col gap-1 p-1">
                {list.map((it) => (
                  <ItemChip key={it.key} item={it} onOpen={onOpen} />
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile : liste par jour */}
      <div className="space-y-3 md:hidden">
        {days.map((d) => {
          const list = itemsOnDay(items, d);
          return (
            <section
              key={d}
              className={cn(
                "rounded-lg border border-border/60 bg-card",
                d === today && "border-primary/50 bg-primary/[0.04]",
              )}
            >
              <header className="flex items-center justify-between px-3 py-2">
                <h3 className={cn("text-sm font-medium capitalize", d === today && "text-primary")}>
                  {longFmt.format(keyToUtcDate(d))}
                  {d === today && (
                    <span className="ml-2 text-[10px] uppercase tracking-wide">Aujourd'hui</span>
                  )}
                </h3>
                <button
                  type="button"
                  onClick={() => onAddOnDay(d)}
                  className="cursor-pointer rounded px-2 text-lg leading-none text-muted-foreground hover:text-foreground"
                  aria-label="Ajouter un rendez-vous ce jour"
                >
                  +
                </button>
              </header>
              {list.length > 0 ? (
                <div className="px-1 pb-1">
                  {list.map((it) => (
                    <ItemRow key={it.key} item={it} day={d} onOpen={onOpen} />
                  ))}
                </div>
              ) : (
                <p className="px-3 pb-2 text-xs text-muted-foreground">Rien de prévu</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

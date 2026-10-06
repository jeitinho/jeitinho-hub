import { cn } from "@/lib/utils";
import {
  addDays,
  compareItems,
  diffDays,
  fmtDayLong,
  type CalendarItem,
} from "@/lib/ops/calendrier";
import { ItemRow } from "./items";

export function AgendaView({
  from,
  to,
  today,
  items,
  onOpen,
}: {
  from: string;
  to: string;
  today: string;
  items: CalendarItem[];
  onOpen: (item: CalendarItem) => void;
}) {
  const days = Array.from({ length: diffDays(from, to) }, (_, i) => addDays(from, i));
  // Chaque élément apparaît une fois : à son premier jour (ou au début de la période s'il est déjà en cours).
  const groups = days
    .map((d) => ({
      day: d,
      list: items
        .filter((it) => (d === from ? it.start <= d && it.end >= d : it.start === d))
        .sort(compareItems),
    }))
    .filter((g) => g.list.length > 0);

  if (groups.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border/60 bg-card/50 p-10 text-center text-sm text-muted-foreground">
        Rien de prévu sur ces 30 jours pour les types sélectionnés.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <section
          key={g.day}
          className={cn(
            "grid gap-1 rounded-lg border border-border/60 bg-card p-2 sm:grid-cols-[11rem_1fr] sm:gap-4",
            g.day === today && "border-primary/50 bg-primary/[0.04]",
          )}
        >
          <h3
            className={cn(
              "px-2 pt-2 text-sm font-medium capitalize",
              g.day === today && "text-primary",
            )}
          >
            {fmtDayLong(g.day)}
            {g.day === today && (
              <span className="block text-[10px] uppercase tracking-wide">Aujourd'hui</span>
            )}
          </h3>
          <div className="min-w-0">
            {g.list.map((it) => (
              <ItemRow key={it.key} item={it} day={g.day} onOpen={onOpen} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

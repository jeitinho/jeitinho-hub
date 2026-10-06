import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";
import { whenLabel, type CalendarItem } from "@/lib/ops/calendrier";
import { SOURCE_META } from "./sources";

/** Puce compacte (colonnes de la semaine, cases du mois). */
export function ItemChip({
  item,
  onOpen,
  dense = false,
}: {
  item: CalendarItem;
  onOpen: (item: CalendarItem) => void;
  dense?: boolean;
}) {
  const meta = SOURCE_META[item.source];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      title={item.title}
      className={cn(
        "flex w-full min-w-0 cursor-pointer items-start gap-1.5 rounded-md border px-1.5 py-1 text-left text-xs transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        meta.chip,
        item.tentative && "border-dashed",
      )}
    >
      <Icon className="mt-0.5 h-3 w-3 shrink-0 opacity-80" />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-1">
          {item.time && <span className="shrink-0 font-semibold tabular-nums">{item.time}</span>}
          <span className="truncate font-medium">{item.title}</span>
        </span>
        {!dense && item.subtitle && (
          <span className="block truncate text-[11px] opacity-75">{item.subtitle}</span>
        )}
      </span>
    </button>
  );
}

/** Barre multi-jours positionnée dans une grille à 7 colonnes. */
export function ItemBar({
  item,
  colStart,
  colEnd,
  clippedStart,
  clippedEnd,
  onOpen,
}: {
  item: CalendarItem;
  colStart: number;
  colEnd: number;
  clippedStart: boolean;
  clippedEnd: boolean;
  onOpen: (item: CalendarItem) => void;
}) {
  const meta = SOURCE_META[item.source];
  const Icon = meta.icon;
  const style: CSSProperties = { gridColumn: `${colStart} / ${colEnd}` };
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      title={item.title}
      style={style}
      className={cn(
        "flex min-w-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 py-0.5 text-left text-xs transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        meta.chip,
        item.tentative && "border-dashed",
        clippedStart && "rounded-l-none border-l-0",
        clippedEnd && "rounded-r-none border-r-0",
      )}
    >
      <Icon className="h-3 w-3 shrink-0 opacity-80" />
      <span className="truncate font-medium">{item.title}</span>
      {item.subtitle && (
        <span className="hidden truncate opacity-70 lg:inline">· {item.subtitle}</span>
      )}
    </button>
  );
}

/** Ligne de liste (mobile, agenda, détail d'un jour). */
export function ItemRow({
  item,
  day,
  onOpen,
}: {
  item: CalendarItem;
  day?: string;
  onOpen: (item: CalendarItem) => void;
}) {
  const meta = SOURCE_META[item.source];
  const Icon = meta.icon;
  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className="flex w-full cursor-pointer items-start gap-3 rounded-md px-2 py-2 text-left transition hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <span
        className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border",
          meta.chip,
          item.tentative && "border-dashed",
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="text-xs font-semibold tabular-nums text-muted-foreground">
            {whenLabel(item, day)}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
            {meta.label}
          </span>
        </span>
        <span className="block truncate text-sm font-medium">{item.title}</span>
        {item.subtitle && (
          <span className="block truncate text-xs text-muted-foreground">{item.subtitle}</span>
        )}
      </span>
      {item.status && (
        <span className="mt-1 shrink-0 rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
          {item.status}
        </span>
      )}
    </button>
  );
}

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2, Plus } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  CALENDAR_SOURCES,
  addDays,
  addMonths,
  deleteCalendarEvent,
  fetchCalendar,
  fmtDayLong,
  itemsOnDay,
  keyToUtcDate,
  mondayOf,
  startOfMonth,
  todayKey,
  type CalendarEventRow,
  type CalendarItem,
  type CalendarRange,
  type CalendarSource,
} from "@/lib/ops/calendrier";
import { SOURCE_META } from "./sources";
import { WeekView } from "./week-view";
import { MonthView } from "./month-view";
import { AgendaView } from "./agenda-view";
import { ItemRow } from "./items";
import { ItemSheet } from "./item-sheet";
import { EventFormDialog } from "./event-form-dialog";

type ViewMode = "week" | "month" | "list";

const VIEWS: { value: ViewMode; label: string }[] = [
  { value: "week", label: "Semaine" },
  { value: "month", label: "Mois" },
  { value: "list", label: "À venir" },
];

const LS_HIDDEN = "jeitinho.calendrier.hidden";
const LS_VIEW = "jeitinho.calendrier.view";

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function writeStorage(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* stockage indisponible : préférence non mémorisée */
  }
}

function rangeFor(view: ViewMode, anchor: string): CalendarRange {
  if (view === "week") {
    const from = mondayOf(anchor);
    return { from, to: addDays(from, 7) };
  }
  if (view === "month") {
    const m0 = startOfMonth(anchor);
    const lastDay = addDays(addMonths(m0, 1), -1);
    return { from: mondayOf(m0), to: addDays(mondayOf(lastDay), 7) };
  }
  return { from: anchor, to: addDays(anchor, 30) };
}

const monthFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  month: "long",
  year: "numeric",
});
const shortFmt = new Intl.DateTimeFormat("fr-FR", {
  timeZone: "UTC",
  day: "numeric",
  month: "short",
});

function periodLabel(view: ViewMode, anchor: string, range: CalendarRange) {
  if (view === "month") return monthFmt.format(keyToUtcDate(startOfMonth(anchor)));
  const last = addDays(range.to, -1);
  const year = keyToUtcDate(last).getUTCFullYear();
  return `${shortFmt.format(keyToUtcDate(range.from))} – ${shortFmt.format(keyToUtcDate(last))} ${year}`;
}

const VALID_SOURCES = new Set<string>(CALENDAR_SOURCES);

export function CalendarPage() {
  const qc = useQueryClient();
  const today = todayKey();
  const [view, setView] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(today);
  const [hidden, setHidden] = useState<CalendarSource[]>([]);
  const [selected, setSelected] = useState<CalendarItem | null>(null);
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [form, setForm] = useState<{ n: number; day: string; initial?: CalendarEventRow } | null>(
    null,
  );

  // Préférences locales (lues après montage : pas de localStorage côté serveur).
  useEffect(() => {
    const v = readStorage<string>(LS_VIEW, "week");
    if (v === "week" || v === "month" || v === "list") setView(v);
    const h = readStorage<unknown>(LS_HIDDEN, []);
    if (Array.isArray(h)) {
      setHidden(h.filter((s): s is CalendarSource => VALID_SOURCES.has(String(s))));
    }
  }, []);

  const changeView = (v: ViewMode) => {
    if (today >= range.from && today < range.to) setAnchor(today);
    setView(v);
    writeStorage(LS_VIEW, v);
  };
  const toggleSource = (s: CalendarSource, visible: boolean) => {
    setHidden((prev) => {
      const next = visible ? prev.filter((x) => x !== s) : Array.from(new Set([...prev, s]));
      writeStorage(LS_HIDDEN, next);
      return next;
    });
  };

  const range = useMemo(() => rangeFor(view, anchor), [view, anchor]);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["calendrier", range.from, range.to],
    queryFn: () => fetchCalendar(range),
    placeholderData: keepPreviousData,
  });

  const counts = useMemo(() => {
    const m = new Map<CalendarSource, number>();
    for (const r of data ?? []) m.set(r.source, r.items.length);
    return m;
  }, [data]);
  const failed = (data ?? []).filter((r) => r.error);
  const allFailed = !!data && data.length > 0 && failed.length === data.length;
  const items = useMemo(
    () => (data ?? []).filter((r) => !hidden.includes(r.source)).flatMap((r) => r.items),
    [data, hidden],
  );

  const step = (dir: -1 | 1) => {
    if (view === "week") setAnchor((a) => addDays(a, 7 * dir));
    else if (view === "month") setAnchor((a) => addMonths(startOfMonth(a), dir));
    else setAnchor((a) => addDays(a, 30 * dir));
  };
  const isCurrent = view === "list" ? anchor === today : today >= range.from && today < range.to;

  const refresh = () => qc.invalidateQueries({ queryKey: ["calendrier"] });
  const newEvent = (day?: string) =>
    setForm({ n: Date.now(), day: day ?? (isCurrent ? today : range.from) });

  const openItem = (it: CalendarItem) => {
    setOpenDay(null);
    setSelected(it);
  };

  return (
    <PageShell
      eyebrow="Vue unifiée"
      title="Calendrier"
      description="Réservations, voyages, devis, événements, éditorial, WhatsApp, tâches et rendez-vous."
      actions={
        <Button onClick={() => newEvent()}>
          <Plus /> Nouveau rendez-vous
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" onClick={() => step(-1)} aria-label="Précédent">
            <ChevronLeft />
          </Button>
          <Button variant="outline" onClick={() => setAnchor(today)} disabled={isCurrent}>
            Aujourd'hui
          </Button>
          <Button variant="outline" size="icon" onClick={() => step(1)} aria-label="Suivant">
            <ChevronRight />
          </Button>
        </div>
        <h2
          className="min-w-0 flex-1 text-xl first-letter:uppercase sm:text-2xl"
          style={{ fontFamily: "Fraunces, serif" }}
        >
          {periodLabel(view, anchor, range)}
          {isFetching && !isLoading && (
            <Loader2 className="ml-2 inline h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </h2>
        <div className="inline-flex rounded-md border border-border/60 p-0.5" role="tablist">
          {VIEWS.map((v) => (
            <button
              key={v.value}
              type="button"
              role="tab"
              aria-selected={view === v.value}
              onClick={() => changeView(v.value)}
              className={cn(
                "cursor-pointer rounded px-3 py-1.5 text-sm transition",
                view === v.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2">
        {CALENDAR_SOURCES.map((s) => {
          const meta = SOURCE_META[s];
          const id = `cal-src-${s}`;
          const n = counts.get(s);
          return (
            <label
              key={s}
              htmlFor={id}
              className="flex cursor-pointer items-center gap-1.5 text-sm"
            >
              <Checkbox
                id={id}
                checked={!hidden.includes(s)}
                onCheckedChange={(v) => toggleSource(s, v === true)}
                className={meta.check}
              />
              {meta.label}
              {n != null && n > 0 && (
                <span className="text-xs tabular-nums text-muted-foreground">{n}</span>
              )}
            </label>
          );
        })}
      </div>

      {failed.length > 0 && !allFailed && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Non chargé : {failed.map((r) => SOURCE_META[r.source].label).join(", ")}.{" "}
            <button type="button" className="cursor-pointer underline" onClick={() => refetch()}>
              Réessayer
            </button>
          </span>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-[28rem] w-full rounded-lg" />
      ) : error || allFailed ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-8 text-center text-sm">
          <p className="mb-3 text-destructive">
            Impossible de charger le calendrier
            {error
              ? ` : ${(error as Error).message}`
              : failed[0]?.error
                ? ` : ${failed[0].error}`
                : "."}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      ) : (
        <>
          {view === "week" && (
            <WeekView
              weekStart={range.from}
              today={today}
              items={items}
              onOpen={openItem}
              onAddOnDay={(d) => newEvent(d)}
            />
          )}
          {view === "month" && (
            <MonthView
              from={range.from}
              to={range.to}
              month={startOfMonth(anchor).slice(0, 7)}
              today={today}
              items={items}
              onOpen={openItem}
              onOpenDay={setOpenDay}
            />
          )}
          {view === "list" && (
            <AgendaView
              from={range.from}
              to={range.to}
              today={today}
              items={items}
              onOpen={openItem}
            />
          )}
          {view !== "list" && items.length === 0 && (
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Rien sur cette période pour les types sélectionnés.
            </p>
          )}
        </>
      )}

      <Dialog open={!!openDay} onOpenChange={(o) => !o && setOpenDay(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {openDay && (
            <>
              <DialogHeader>
                <DialogTitle className="first-letter:uppercase">{fmtDayLong(openDay)}</DialogTitle>
                <DialogDescription>
                  {itemsOnDay(items, openDay).length || "Aucun"} élément
                  {itemsOnDay(items, openDay).length > 1 ? "s" : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="-mx-2">
                {itemsOnDay(items, openDay).map((it) => (
                  <ItemRow key={it.key} item={it} day={openDay} onOpen={openItem} />
                ))}
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  const d = openDay;
                  setOpenDay(null);
                  newEvent(d);
                }}
              >
                <Plus /> Rendez-vous ce jour
              </Button>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ItemSheet
        item={selected}
        onClose={() => setSelected(null)}
        onEdit={(it) => {
          setSelected(null);
          setForm({ n: Date.now(), day: it.start, initial: it.manual });
        }}
        onDelete={async (it) => {
          if (!it.manual) return;
          try {
            await deleteCalendarEvent(it.manual.id);
            toast.success("Rendez-vous supprimé");
            setSelected(null);
            refresh();
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      />

      {form && (
        <EventFormDialog
          key={form.n}
          day={form.day}
          initial={form.initial}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            refresh();
          }}
        />
      )}
    </PageShell>
  );
}

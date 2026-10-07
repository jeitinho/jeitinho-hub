import { useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  BadgePercent,
  Banknote,
  BookOpen,
  CalendarDays,
  ChevronDown,
  FileText,
  Inbox,
  Plane,
  ReceiptText,
  Send,
  StickyNote,
  Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { fmtMoney } from "@/lib/ops/ops";
import {
  TIMELINE_KIND_LABELS,
  fmtWhen,
  relativeDays,
  type TimelineItem,
  type TimelineKind,
} from "@/lib/ops/client360";
import { TargetLink } from "./bits";

const KIND_ICON: Record<TimelineKind, ComponentType<{ className?: string }>> = {
  demande: Inbox,
  devis: FileText,
  paiement: Banknote,
  facture: ReceiptText,
  voyage: Plane,
  reservation: Ticket,
  tache: Send,
  rdv: CalendarDays,
  vente: BadgePercent,
  manuel: BookOpen,
  note: StickyNote,
};

const KIND_ORDER = Object.keys(TIMELINE_KIND_LABELS) as TimelineKind[];
const PAGE = 40;

/** Chronologie unique, du plus récent au plus ancien, filtrable par type. */
export function Timeline({
  items,
  emptyLabel = "Aucun historique pour l'instant.",
  compact = false,
}: {
  items: TimelineItem[];
  emptyLabel?: string;
  compact?: boolean;
}) {
  const [filter, setFilter] = useState<TimelineKind | "all">("all");
  const [limit, setLimit] = useState(PAGE);
  const now = Date.now();

  const counts = useMemo(() => {
    const m = new Map<TimelineKind, number>();
    for (const it of items) m.set(it.kind, (m.get(it.kind) ?? 0) + 1);
    return m;
  }, [items]);
  const kinds = KIND_ORDER.filter((k) => counts.has(k));
  const visible = filter === "all" ? items : items.filter((it) => it.kind === filter);

  if (!items.length) return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;

  return (
    <div>
      {kinds.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
            Tout <span className="opacity-60">{items.length}</span>
          </FilterChip>
          {kinds.map((k) => (
            <FilterChip key={k} active={filter === k} onClick={() => setFilter(k)}>
              {TIMELINE_KIND_LABELS[k]} <span className="opacity-60">{counts.get(k)}</span>
            </FilterChip>
          ))}
        </div>
      )}
      <ol className="relative space-y-4 border-l border-border/70 pl-5">
        {visible.slice(0, limit).map((it) => (
          <TimelineRow key={it.key} item={it} future={it.ts > now} compact={compact} now={now} />
        ))}
      </ol>
      {visible.length > limit && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-3 text-xs"
          onClick={() => setLimit((n) => n + PAGE)}
        >
          Afficher {Math.min(PAGE, visible.length - limit)} de plus
        </Button>
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
        active
          ? "border-foreground bg-foreground text-background"
          : "border-border text-muted-foreground hover:bg-muted/60"
      }`}
    >
      {children}
    </button>
  );
}

function TimelineRow({
  item: it,
  future,
  compact,
  now,
}: {
  item: TimelineItem;
  future: boolean;
  compact: boolean;
  now: number;
}) {
  const Icon = KIND_ICON[it.kind];
  return (
    <li className="relative">
      <span
        className={`absolute -left-[1.9rem] top-0.5 flex h-5 w-5 items-center justify-center rounded-full border bg-background ${
          future ? "border-primary text-primary" : "border-border text-muted-foreground"
        }`}
      >
        <Icon className="h-3 w-3" />
      </span>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <TargetLink
          link={it.link}
          className={`min-w-0 break-words text-sm font-medium ${it.link ? "hover:underline" : ""}`}
        >
          {it.title}
        </TargetLink>
        <span
          className="shrink-0 text-xs tabular-nums text-muted-foreground"
          title={relativeDays(it.ts, now)}
        >
          {fmtWhen(it.at)}
        </span>
      </div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {future && (
          <span className="rounded border border-primary/40 px-1.5 py-px text-[10px] text-primary">
            à venir · {relativeDays(it.ts, now)}
          </span>
        )}
        {it.status && (
          <span className="rounded border border-border px-1.5 py-px text-[10px]">{it.status}</span>
        )}
        {it.detail && (
          <span className={`min-w-0 break-words ${compact ? "line-clamp-2" : ""}`}>
            {it.detail}
          </span>
        )}
        {it.amount && (
          <span className="font-medium tabular-nums text-foreground">
            {fmtMoney(it.amount.value, it.amount.currency)}
          </span>
        )}
      </div>
      {it.message && <MessageToggle label={it.messageLabel ?? "Message"} text={it.message} />}
    </li>
  );
}

function MessageToggle({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
        aria-expanded={open}
      >
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
        {open ? "Masquer" : label}
      </button>
      {open && (
        <p className="mt-1.5 whitespace-pre-wrap break-words rounded-md border border-border/60 bg-muted/30 p-3 text-xs leading-relaxed">
          {text}
        </p>
      )}
    </div>
  );
}

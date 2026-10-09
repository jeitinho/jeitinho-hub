import { AlertTriangle, ArrowRight, ChevronDown, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  EDITORIAL_KINDS,
  EDITORIAL_STATUSES,
  PRIORITY_TONE,
  channelName,
  dayKey,
  fmtDayKey,
  fmtTime,
  isOverdue,
  nextStatus,
  normalizeStatus,
  overdueSince,
  statusMeta,
  type EditorialItem,
} from "@/lib/ops/media";
import { useSetStatus } from "./use-media";

export function StatusPill({ status }: { status: string }) {
  const m = statusMeta(status);
  return <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${m.tone}`}>{m.label}</span>;
}

export function OverdueBadge({ item }: { item: Pick<EditorialItem, "deadline" | "planned_at"> }) {
  const since = overdueSince(item);
  return (
    <span className="inline-flex items-center gap-1 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
      <AlertTriangle className="h-3 w-3" />
      En retard{since ? ` · ${fmtDayKey(since, { day: "numeric", month: "short" })}` : ""}
    </span>
  );
}

const CHANNEL_TONE: Record<string, string> = {
  ig_afrolove: "border-fuchsia-500/40 text-fuchsia-700 dark:text-fuchsia-300",
  ig_conciergerie: "border-primary/40 text-primary",
  ig_media: "border-sky-500/40 text-sky-700 dark:text-sky-300",
  blog: "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
  whatsapp: "border-green-600/40 text-green-700 dark:text-green-300",
};

export function ChannelBadge({ channel }: { channel: string | null }) {
  if (!channel) return null;
  return (
    <Badge variant="outline" className={`text-[10px] ${CHANNEL_TONE[channel] ?? ""}`}>
      {channelName(channel, true)}
    </Badge>
  );
}

/** Menu de statut : 1 clic pour ouvrir, 1 clic pour choisir. */
export function StatusMenu({ item }: { item: EditorialItem }) {
  const setStatus = useSetStatus();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex items-center gap-0.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={(e) => e.stopPropagation()}
        aria-label="Changer le statut"
      >
        <StatusPill status={item.status} />
        <ChevronDown className="h-3 w-3 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
        {EDITORIAL_STATUSES.map((s) => (
          <DropdownMenuItem
            key={s.value}
            disabled={s.value === normalizeStatus(item.status)}
            onSelect={() => setStatus(item, s.value)}
          >
            <span className={`rounded px-2 py-0.5 text-[11px] ${s.tone}`}>{s.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function EditorialItemCard({
  item,
  onOpen,
  showDate,
}: {
  item: EditorialItem;
  onOpen: (item: EditorialItem) => void;
  showDate?: boolean;
}) {
  const setStatus = useSetStatus();
  const next = nextStatus(item.status);
  const overdue = isOverdue(item);
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={() => onOpen(item)}
      onKeyDown={(e) => {
        if (e.key === "Enter" && e.target === e.currentTarget) onOpen(item);
      }}
      className={`cursor-pointer space-y-2 p-3 transition-colors hover:bg-accent/40 ${
        overdue ? "border-destructive/60" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusMenu item={item} />
        <Badge variant="outline" className="text-[10px]">
          {EDITORIAL_KINDS[item.kind] ?? item.kind}
        </Badge>
        <ChannelBadge channel={item.channel} />
        {item.priority && (
          <Badge variant="outline" className={`text-[10px] ${PRIORITY_TONE[item.priority] ?? ""}`}>
            {item.priority}
          </Badge>
        )}
        {overdue && <OverdueBadge item={item} />}
      </div>
      <p className="text-sm font-medium leading-snug">{item.title}</p>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
        {item.owner && <span className="font-medium text-foreground">{item.owner}</span>}
        {item.planned_at && (
          <span>
            {showDate
              ? `${fmtDayKey(dayKey(item.planned_at), { weekday: "short", day: "numeric" })} `
              : ""}
            {fmtTime(item.planned_at)}
          </span>
        )}
        {item.collection && <span className="truncate">{item.collection}</span>}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-0.5 text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            En ligne
          </a>
        )}
      </div>
      {next && (
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-full justify-between px-2 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            setStatus(item, next);
          }}
        >
          Passer en « {statusMeta(next).label} »
          <ArrowRight className="h-3 w-3" />
        </Button>
      )}
    </Card>
  );
}

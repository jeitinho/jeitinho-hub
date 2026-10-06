import { CalendarClock, MapPin } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  PIPELINE_COLUMNS,
  fmtDate,
  isNewApplication,
  isOverdue,
  pipelineOrder,
  type Partner,
} from "@/lib/ops/partenaires";
import { ContactButtons, KindPill, NewBadge, StatusMenu, StatusPill } from "./shared";

export function PipelineBoard({
  partners,
  onOpen,
}: {
  partners: Partner[];
  onOpen: (id: string) => void;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {PIPELINE_COLUMNS.map((col) => {
        const items = partners.filter((p) => col.statuses.includes(p.status)).sort(pipelineOrder);
        return (
          <div key={col.key} className="flex min-w-0 flex-col rounded-lg bg-muted/30 p-2">
            <div className="mb-2 flex items-center justify-between px-1">
              <h3 className="text-xs font-medium">{col.label}</h3>
              <span className="text-[11px] text-muted-foreground">{items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {items.length === 0 && (
                <p className="rounded-md border border-dashed border-border/60 px-3 py-6 text-center text-[11px] text-muted-foreground">
                  Vide
                </p>
              )}
              {items.map((p) => (
                <PipelineCard
                  key={p.id}
                  partner={p}
                  showStatus={col.statuses.length > 1}
                  onOpen={() => onOpen(p.id)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PipelineCard({
  partner: p,
  showStatus,
  onOpen,
}: {
  partner: Partner;
  showStatus: boolean;
  onOpen: () => void;
}) {
  const overdue = isOverdue(p);
  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "cursor-pointer space-y-2 p-3 transition-colors hover:border-primary/40",
        isNewApplication(p) && "border-primary/50",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1">
            {isNewApplication(p) && <NewBadge />}
            {showStatus && <StatusPill status={p.status} />}
          </div>
          <p className="truncate text-sm font-medium">{p.name}</p>
        </div>
        <StatusMenu partner={p} size="icon" />
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
        <KindPill kind={p.kind} />
        {p.location && (
          <span className="inline-flex min-w-0 items-center gap-0.5">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{p.location}</span>
          </span>
        )}
      </div>
      {(p.next_action || p.next_action_at) && (
        <p
          className={cn(
            "flex items-start gap-1 text-[11px]",
            overdue ? "text-destructive" : "text-muted-foreground",
          )}
        >
          <CalendarClock className="mt-px h-3 w-3 shrink-0" />
          <span className="line-clamp-2">
            {p.next_action_at && (
              <strong className="font-medium">{fmtDate(p.next_action_at)}</strong>
            )}
            {p.next_action_at && p.next_action && " · "}
            {p.next_action}
          </span>
        </p>
      )}
      <ContactButtons partner={p} compact />
    </Card>
  );
}

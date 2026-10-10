import { Link } from "@tanstack/react-router";
import { CalendarDays, ClipboardCheck, FileText, UserCheck, Users, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { fmtDateTime, fmtMoney } from "@/lib/ops/ops";
import {
  QUOTE_STATUS_LABEL,
  ageLabel,
  fmtTravelRange,
  sourceLabel,
  type Demande,
} from "@/lib/ops/demandes";
import { ContactButtons, CreateQuoteButton, StageMenu, TemperatureBadge } from "./shared";
import { useDemandeActions } from "./use-demande-actions";

const MAX_ACTIVITIES = 3;
const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

export function DemandeCard({
  demande: d,
  all,
  onOpen,
  onQualified,
}: {
  demande: Demande;
  all: Demande[];
  onOpen: () => void;
  onQualified: (prospectId: string) => void;
}) {
  const { moveTo, qualify, busy } = useDemandeActions();
  const range = fmtTravelRange(d.travelStart, d.travelEnd);
  const extra = d.activities.length - MAX_ACTIVITIES;
  const quote = d.pendingQuote ?? d.quotes[0] ?? null;
  const closed = d.stage === "gagnee" || d.stage === "perdue";

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        "cursor-pointer space-y-2 p-3 transition-colors hover:border-primary/40",
        d.temperature === "chaud" && !closed && "border-destructive/30",
        busy === d.key && "opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            {d.stage !== "gagnee" && <TemperatureBadge demande={d} />}
            <span className="text-[10px] text-muted-foreground" title={fmtDateTime(d.createdAt)}>
              {ageLabel(d.createdAt)}
            </span>
          </div>
          <p className="truncate text-sm font-medium">{d.name}</p>
          <p className="truncate text-[11px] text-muted-foreground" title={d.sources.join(" · ")}>
            {sourceLabel(d.source)}
            {d.leads.length > 1 && ` · ${d.leads.length} demandes`}
            {d.kind === "lead" && " · non qualifiée"}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {!closed && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              disabled={busy === d.key}
              onClick={(e) => {
                e.stopPropagation();
                void moveTo(d, "perdue");
              }}
              title="Marquer perdue"
              aria-label="Marquer perdue"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
          <StageMenu
            demande={d}
            size="icon"
            disabled={busy === d.key}
            onMove={(t) => void moveTo(d, t)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <CalendarDays className="h-3 w-3 shrink-0" />
          {range ?? "Dates inconnues"}
        </span>
        <span className="inline-flex items-center gap-1">
          <Users className="h-3 w-3 shrink-0" />
          {d.partySize ? `${d.partySize} pers.` : "Nb pers. inconnu"}
        </span>
      </div>

      {d.activities.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {d.activities.slice(0, MAX_ACTIVITIES).map((a) => (
            <span
              key={a}
              className="max-w-full truncate rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground"
            >
              {a}
            </span>
          ))}
          {extra > 0 && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] text-muted-foreground"
              title={d.activities.slice(MAX_ACTIVITIES).join(" · ")}
            >
              +{extra}
            </span>
          )}
        </div>
      )}

      {(quote || d.tasksToValidate > 0 || (d.stage === "gagnee" && d.clientId)) && (
        <div className="space-y-1 text-[11px]">
          {quote && (
            <Link
              to="/devis/$id"
              params={{ id: quote.id }}
              onClick={stop}
              className="flex items-center gap-1 text-foreground/80 hover:text-primary"
            >
              <FileText className="h-3 w-3 shrink-0" />
              <span className="truncate">
                Devis {quote.number ?? quote.reference} ·{" "}
                {fmtMoney(Number(quote.total_amount ?? 0), quote.currency)} ·{" "}
                {quote.status === "sent"
                  ? `envoyé ${ageLabel(quote.sent_at)}`
                  : (QUOTE_STATUS_LABEL[quote.status] ?? quote.status).toLowerCase()}
              </span>
            </Link>
          )}
          {d.tasksToValidate > 0 && (
            <Link
              to="/a-valider"
              onClick={stop}
              className="flex items-center gap-1 text-amber-700 hover:underline dark:text-amber-300"
            >
              <ClipboardCheck className="h-3 w-3 shrink-0" />
              {d.tasksToValidate} tâche{d.tasksToValidate > 1 ? "s" : ""} à valider
            </Link>
          )}
          {d.stage === "gagnee" && d.clientId && (
            <Link
              to="/clients/$id"
              params={{ id: d.clientId }}
              onClick={stop}
              className="flex items-center gap-1 text-foreground/80 hover:text-primary"
            >
              <UserCheck className="h-3 w-3 shrink-0" />
              Fiche client
            </Link>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 pt-1">
        <ContactButtons demande={d} compact />
        {d.kind === "prospect" ? (
          d.stage !== "gagnee" &&
          d.stage !== "perdue" && <CreateQuoteButton prospectId={d.id} className="min-w-0 flex-1" />
        ) : (
          <Button
            size="sm"
            className="h-8 min-w-0 flex-1 px-2.5 text-[11px]"
            disabled={busy === d.key || d.stage === "perdue"}
            onClick={async (e) => {
              e.stopPropagation();
              const prospectId = await qualify(d, all);
              if (prospectId) onQualified(prospectId);
            }}
            title="Créer le prospect, puis le devis"
          >
            Qualifier
          </Button>
        )}
      </div>
    </Card>
  );
}

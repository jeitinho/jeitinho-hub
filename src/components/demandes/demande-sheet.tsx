import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ClipboardCheck, ExternalLink, FileText, Trash2, UserPlus, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TASK_KIND_LABELS, fmtDateTime, fmtMoney } from "@/lib/ops/ops";
import {
  LEAD_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
  TASK_STATUS_LABEL,
  ageLabel,
  fmtTravelRange,
  sourceLabel,
  type Demande,
  type DemandeLead,
} from "@/lib/ops/demandes";
import {
  ContactButtons,
  CreateQuoteButton,
  StageMenu,
  StagePill,
  TemperatureBadge,
} from "./shared";
import { useDemandeActions } from "./use-demande-actions";

export function DemandeSheet({
  demande,
  all,
  onOpenChange,
  onQualified,
}: {
  demande: Demande | null;
  all: Demande[];
  onOpenChange: (open: boolean) => void;
  onQualified: (prospectId: string) => void;
}) {
  return (
    <Sheet open={!!demande} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {demande && (
          <DemandeDetail
            key={demande.key}
            demande={demande}
            all={all}
            onQualified={onQualified}
            onClose={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-border/60 pt-4">
      <h3 className="tracked mb-3 text-[10px] text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[110px_1fr] gap-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="min-w-0 break-words">{children}</span>
    </div>
  );
}

function DemandeDetail({
  demande: d,
  all,
  onQualified,
  onClose,
}: {
  demande: Demande;
  all: Demande[];
  onQualified: (prospectId: string) => void;
  onClose: () => void;
}) {
  const { moveTo, qualify, convert, remove, busy } = useDemandeActions();
  const pending = busy === d.key;
  const range = fmtTravelRange(d.travelStart, d.travelEnd);

  return (
    <div className="space-y-5">
      <SheetHeader className="pr-8">
        <div className="flex flex-wrap items-center gap-1.5">
          {d.stage !== "gagnee" && <TemperatureBadge demande={d} />}
          <StagePill stage={d.stage} />
          {d.kind === "lead" && (
            <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground">
              Non qualifiée
            </span>
          )}
        </div>
        <SheetTitle className="text-2xl" style={{ fontFamily: "Fraunces, serif" }}>
          {d.name}
        </SheetTitle>
        <SheetDescription>
          Reçue {ageLabel(d.createdAt)} ({fmtDateTime(d.createdAt)}) · {sourceLabel(d.source)}
        </SheetDescription>
        <p className="text-xs text-muted-foreground">
          {d.stage === "gagnee"
            ? `Dernière activité ${ageLabel(d.lastActivityAt)}`
            : `${d.temperatureReasons.join(" · ")} · dernière activité ${ageLabel(d.lastActivityAt)}`}
        </p>
      </SheetHeader>

      <div className="flex flex-wrap gap-2">
        <ContactButtons demande={d} />
        {d.kind === "prospect" ? (
          <CreateQuoteButton prospectId={d.id} className="text-xs" />
        ) : (
          <Button
            size="sm"
            className="h-8 text-xs"
            disabled={pending || d.stage === "perdue"}
            onClick={async () => {
              const id = await qualify(d, all);
              if (id) onQualified(id);
            }}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Qualifier
          </Button>
        )}
        <StageMenu demande={d} disabled={pending} onMove={(t) => void moveTo(d, t)} />
        {d.stage !== "perdue" && d.stage !== "gagnee" && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-destructive"
            disabled={pending}
            onClick={() => void moveTo(d, "perdue")}
          >
            <X className="h-3.5 w-3.5" />
            Perdue
          </Button>
        )}
      </div>

      <Section title="Contact">
        <div className="space-y-1.5">
          <Row label="E-mail">{d.email ?? "—"}</Row>
          <Row label="Téléphone">{d.phone ?? "—"}</Row>
          <Row label="Client">
            {d.clientId ? (
              <Link
                to="/clients/$id"
                params={{ id: d.clientId }}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                Fiche client <ExternalLink className="h-3 w-3" />
              </Link>
            ) : d.prospect ? (
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2 text-xs"
                disabled={pending}
                onClick={() => void convert(d)}
                title="Crée la fiche client et passe la demande en Gagnée"
              >
                Convertir en client
              </Button>
            ) : (
              <span className="text-muted-foreground">Qualifier d'abord</span>
            )}
          </Row>
        </div>
      </Section>

      <Section title="Voyage">
        <div className="space-y-1.5">
          <Row label="Dates">{range ?? "Inconnues"}</Row>
          <Row label="Personnes">{d.partySize ?? "Inconnu"}</Row>
          <Row label="Sources">{d.sources.join(" · ") || "—"}</Row>
        </div>
        {d.activities.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {d.activities.map((a) => (
              <span
                key={a}
                className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-muted-foreground"
              >
                {a}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Message d'origine">
        {d.message ? (
          <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">{d.message}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Aucun message.</p>
        )}
        {d.prospect?.notes && (
          <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">
            Notes : {d.prospect.notes}
          </p>
        )}
      </Section>

      <Section title={`Devis liés (${d.quotes.length})`}>
        {d.quotes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {d.kind === "lead" ? "Qualifiez la demande pour créer un devis." : "Aucun devis."}
          </p>
        ) : (
          <ul className="space-y-2">
            {d.quotes.map((q) => (
              <li key={q.id}>
                <Link
                  to="/devis/$id"
                  params={{ id: q.id }}
                  className="flex items-start justify-between gap-3 rounded-md border border-border/60 p-2.5 text-sm hover:border-primary/40"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 font-medium">
                      <FileText className="h-3.5 w-3.5 shrink-0" />
                      {q.number ?? q.reference}
                      <span className="rounded-full border border-border/70 px-1.5 text-[10px] font-normal text-muted-foreground">
                        {QUOTE_STATUS_LABEL[q.status] ?? q.status}
                      </span>
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">{q.title}</span>
                  </span>
                  <span className="shrink-0 text-right text-xs">
                    {fmtMoney(Number(q.total_amount ?? 0), q.currency)}
                    <span className="block text-muted-foreground">
                      {q.sent_at
                        ? `envoyé ${ageLabel(q.sent_at)}`
                        : `créé ${ageLabel(q.created_at)}`}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Tâches (${d.tasks.length})`}>
        {d.tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune tâche.</p>
        ) : (
          <ul className="space-y-1.5">
            {d.tasks.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate">{t.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {TASK_KIND_LABELS[t.kind] ?? t.kind} · échéance {fmtDateTime(t.due_at)}
                  </span>
                </span>
                {t.status === "a_valider" ? (
                  <Link
                    to="/a-valider"
                    className="inline-flex shrink-0 items-center gap-1 text-xs text-amber-700 hover:underline dark:text-amber-300"
                  >
                    <ClipboardCheck className="h-3 w-3" />À valider
                  </Link>
                ) : (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {TASK_STATUS_LABEL[t.status] ?? t.status}
                    {t.handled_at ? ` ${ageLabel(t.handled_at)}` : ""}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title={`Historique des demandes reçues (${d.leads.length})`}>
        {d.leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Saisie directement comme prospect, sans demande du site.
          </p>
        ) : (
          <ol className="space-y-3">
            {[...d.leads].reverse().map((l) => (
              <LeadEntry
                key={l.id}
                lead={l}
                onDelete={async () => {
                  const ok = await remove(l.id);
                  if (ok && d.kind === "lead") onClose();
                }}
              />
            ))}
          </ol>
        )}
      </Section>
    </div>
  );
}

function LeadEntry({ lead: l, onDelete }: { lead: DemandeLead; onDelete: () => void }) {
  const range = fmtTravelRange(l.travel_start, l.travel_end);
  const details = [range, l.party_size ? `${l.party_size} pers.` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="rounded-md border border-border/60 p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-medium">
            {fmtDateTime(l.received_at)}
            <span
              className={cn(
                "ml-2 rounded-full border px-1.5 text-[10px] font-normal",
                l.status === "spam" || l.status === "lost"
                  ? "border-destructive/40 text-destructive"
                  : "border-border/70 text-muted-foreground",
              )}
            >
              {LEAD_STATUS_LABEL[l.status] ?? l.status}
            </span>
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {l.source}
            {l.campaign ? ` · ${l.campaign}` : ""}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
          title="Supprimer ce lead"
          aria-label="Supprimer ce lead"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {details && <p className="mt-1 text-xs text-muted-foreground">{details}</p>}
      {(l.activities?.length ?? 0) > 0 && (
        <p className="mt-1 text-xs text-muted-foreground">{l.activities?.join(" · ")}</p>
      )}
      {l.message && (
        <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/80">{l.message}</p>
      )}
    </li>
  );
}

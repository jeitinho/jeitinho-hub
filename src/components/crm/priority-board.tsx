import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Flame, Thermometer, Snowflake, BellRing, CircleSlash, RefreshCw, FileDown, Check } from "lucide-react";
import {
  fetchPriorityLeads,
  fetchSentQuotes,
  markLeadContacted,
  rescoreAllLeads,
  setLeadNextAction,
  type FollowupQuote,
  type PriorityLead,
} from "@/lib/crm/crm";
import { formatMoney } from "@/lib/quotes/status";
import { followupDueAt, FOLLOWUP_LABELS } from "@/lib/crm/followups";

function isOverdue(iso: string | null) {
  return !!iso && new Date(iso).getTime() < Date.now();
}

function fmtDate(iso: string | null) {
  return iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
}

function priorityTone(p: string) {
  if (p === "HOT") return "border-destructive/50 bg-destructive/10 text-destructive";
  if (p === "WARM") return "border-primary/50 bg-primary/10 text-primary";
  return "border-border/60 bg-muted/40 text-muted-foreground";
}

function LeadCard({ lead }: { lead: PriorityLead }) {
  const qc = useQueryClient();
  const [action, setAction] = useState(lead.next_action ?? "");
  const [when, setWhen] = useState(lead.next_action_at ? lead.next_action_at.slice(0, 16) : "");
  const [editing, setEditing] = useState(false);
  const labels = lead.score_breakdown?.labels ?? [];

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["crm", "priority-leads"] });
    qc.invalidateQueries({ queryKey: ["leads"] });
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium tracking-wide ${priorityTone(lead.priority)}`}>
              {lead.priority} · {lead.score}/100
            </span>
            <span className="tracked text-[10px] text-muted-foreground">{lead.source}</span>
            {lead.campaign && <span className="tracked text-[10px] text-muted-foreground">{lead.campaign}</span>}
          </div>
          <h3 className="text-base font-medium">{lead.name}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {[lead.email, lead.phone].filter(Boolean).join(" · ") || "Pas de contact"}
            {lead.party_size ? ` · ${lead.party_size} pers.` : ""}
            {lead.travel_start ? ` · ${lead.travel_start}${lead.travel_end ? ` → ${lead.travel_end}` : ""}` : ""}
          </p>
          {lead.estimated_value != null && (
            <p className="mt-1 text-sm" style={{ fontFamily: "Fraunces, serif" }}>
              ≈ {formatMoney(Number(lead.estimated_value), "EUR")} de potentiel
            </p>
          )}
          {labels.length > 0 && (
            <p className="mt-1 text-[11px] text-muted-foreground">{labels.join(" · ")}</p>
          )}
          <p className={`mt-2 text-xs ${isOverdue(lead.next_action_at) ? "text-destructive" : "text-muted-foreground"}`}>
            {lead.next_action ? `→ ${lead.next_action} · ${fmtDate(lead.next_action_at)}` : "Aucune prochaine action définie"}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                try {
                  await markLeadContacted(lead);
                  toast.success("Contact enregistré.");
                  refresh();
                } catch (e: any) {
                  toast.error(e.message);
                }
              }}
            >
              <Check className="mr-1.5 h-3.5 w-3.5" />Contacté
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
              Prochaine action
            </Button>
            <Link to="/devis/new" search={lead.prospect_id ? { prospectId: lead.prospect_id } : {}}>
              <Button size="sm" className="btn-primary">
                <FileDown className="mr-1.5 h-3.5 w-3.5" />Devis
              </Button>
            </Link>
          </div>
          {editing && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <Input value={action} onChange={(e) => setAction(e.target.value)} placeholder="Ex. Appeler pour valider les dates" className="h-8 w-56 text-xs" />
              <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-8 w-44 text-xs" />
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    await setLeadNextAction(lead.id, action, when ? new Date(when).toISOString() : null);
                    toast.success("Prochaine action enregistrée.");
                    setEditing(false);
                    refresh();
                  } catch (e: any) {
                    toast.error(e.message);
                  }
                }}
              >
                Enregistrer
              </Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

function Section({
  icon,
  title,
  hint,
  children,
  count,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-baseline gap-2">
        {icon}
        <h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>{title}</h2>
        <span className="pill">{count}</span>
      </div>
      {count === 0 ? (
        <p className="text-xs text-muted-foreground">{hint}</p>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </section>
  );
}

function QuoteFollowupRow({ q }: { q: FollowupQuote }) {
  const nextStage = (q.followup_stage ?? 0) + 1;
  const anchor = q.followup_anchor_at ?? q.sent_at;
  const due = anchor ? followupDueAt(anchor, nextStage) : null;
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="mb-1 flex items-center gap-2">
          <span className="tracked text-[10px] text-muted-foreground">{q.number ?? q.reference}</span>
          <span className="pill">{FOLLOWUP_LABELS[nextStage - 1] ?? "Relance terminée"}</span>
        </div>
        <h3 className="truncate text-sm font-medium">{q.title}</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {q.clients?.full_name ?? "Client non renseigné"} · échéance {fmtDate(due)}
        </p>
      </div>
      <Link to="/devis/$id" params={{ id: q.id }}>
        <Button variant="outline" size="sm">Ouvrir le devis</Button>
      </Link>
    </Card>
  );
}

export function PriorityBoard() {
  const qc = useQueryClient();
  const [rescoring, setRescoring] = useState(false);

  const { data: leads, isLoading } = useQuery({ queryKey: ["crm", "priority-leads"], queryFn: fetchPriorityLeads });
  const { data: quotes } = useQuery({ queryKey: ["crm", "sent-quotes"], queryFn: fetchSentQuotes });

  const groups = useMemo(() => {
    const rows = leads ?? [];
    return {
      hot: rows.filter((l) => l.priority === "HOT"),
      warm: rows.filter((l) => l.priority === "WARM"),
      cold: rows.filter((l) => l.priority === "COLD"),
      noAction: rows.filter((l) => !l.next_action_at),
    };
  }, [leads]);

  const dueQuotes = useMemo(() => {
    const now = Date.now();
    return (quotes ?? []).filter((q) => {
      if (q.followup_paused) return false;
      const anchor = q.followup_anchor_at ?? q.sent_at;
      if (!anchor) return false;
      const due = followupDueAt(anchor, (q.followup_stage ?? 0) + 1);
      return !!due && new Date(due).getTime() <= now;
    });
  }, [quotes]);

  if (isLoading) return <div className="text-sm text-muted-foreground">Chargement…</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        {([
          ["HOT", groups.hot.length],
          ["WARM", groups.warm.length],
          ["COLD", groups.cold.length],
          ["Devis à relancer", dueQuotes.length],
          ["Sans prochaine action", groups.noAction.length],
        ] as [string, number][]).map(([label, n]) => (
          <span key={label} className="rounded-full border border-border/60 px-3 py-1.5 text-xs text-muted-foreground">
            {label} · <strong className="text-foreground">{n}</strong>
          </span>
        ))}
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto"
          disabled={rescoring}
          onClick={async () => {
            setRescoring(true);
            try {
              await rescoreAllLeads(leads ?? []);
              toast.success("Scores recalculés.");
              qc.invalidateQueries({ queryKey: ["crm", "priority-leads"] });
            } catch (e: any) {
              toast.error(e.message);
            } finally {
              setRescoring(false);
            }
          }}
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />Recalculer les scores
        </Button>
      </div>

      <Section icon={<Flame className="h-4 w-4 text-destructive" />} title="HOT — à traiter maintenant" hint="Aucun lead brûlant pour l'instant." count={groups.hot.length}>
        {groups.hot.map((l) => <LeadCard key={l.id} lead={l} />)}
      </Section>

      <Section icon={<BellRing className="h-4 w-4 text-primary" />} title="Devis à relancer aujourd'hui" hint="Aucune relance échue." count={dueQuotes.length}>
        {dueQuotes.map((q) => <QuoteFollowupRow key={q.id} q={q} />)}
      </Section>

      <Section icon={<CircleSlash className="h-4 w-4 text-muted-foreground" />} title="Sans prochaine action" hint="Tous les leads ont une prochaine action." count={groups.noAction.length}>
        {groups.noAction.map((l) => <LeadCard key={l.id} lead={l} />)}
      </Section>

      <Section icon={<Thermometer className="h-4 w-4 text-primary" />} title="WARM" hint="Aucun lead tiède." count={groups.warm.length}>
        {groups.warm.map((l) => <LeadCard key={l.id} lead={l} />)}
      </Section>

      <Section icon={<Snowflake className="h-4 w-4 text-muted-foreground" />} title="COLD" hint="Aucun lead froid." count={groups.cold.length}>
        {groups.cold.map((l) => <LeadCard key={l.id} lead={l} />)}
      </Section>
    </div>
  );
}

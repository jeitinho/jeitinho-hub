import { db } from "@/lib/db-client";
import { scoreLead, firstActionDelayHours, type Priority } from "./scoring";
import { estimateValue } from "./valuation";
import { FOLLOWUP_LABELS, followupDueAt, followupMessageDraft } from "./followups";

export type PriorityLead = {
  id: string; name: string; email: string | null; phone: string | null; source: string; campaign: string | null;
  request_type: string | null; status: string; party_size: number | null; travel_start: string | null; travel_end: string | null;
  activities: string[]; message: string | null; received_at: string; prospect_id: string | null; score: number; priority: Priority;
  score_breakdown: { labels?: string[] } | null; estimated_value: number | null; pipeline_stage: string; next_action: string | null;
  next_action_at: string | null; last_contact_at: string | null;
};

export const LEAD_SELECT = "id,name,email,phone,source,campaign,request_type,status,party_size,travel_start,travel_end,activities,message,received_at,prospect_id,score,priority,score_breakdown,estimated_value,pipeline_stage,next_action,next_action_at,last_contact_at";
const OPEN_STATUSES = ["new", "contacted", "qualified"];

export async function fetchPriorityLeads() {
  const { data, error } = await db.from<PriorityLead>("leads").select(LEAD_SELECT).in("status", OPEN_STATUSES).order("score", { ascending: false }).order("received_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as PriorityLead[];
}

export async function rescoreLead(lead: PriorityLead) {
  const scored = scoreLead(lead);
  const highSeason = scored.breakdown.labels.some((l) => l.startsWith("Haute saison"));
  const { error } = await db.from("leads").update({ score: scored.score, priority: scored.priority, score_breakdown: scored.breakdown, estimated_value: lead.estimated_value ?? estimateValue({ ...lead, highSeason }) }).eq("id", lead.id);
  if (error) throw new Error(error.message);
  return scored;
}
export async function rescoreAllLeads(leads: PriorityLead[]) { for (const lead of leads) await rescoreLead(lead); }

export async function markLeadContacted(lead: PriorityLead) {
  const now = new Date();
  const delay = firstActionDelayHours(lead.priority);
  const { error } = await db.from("leads").update({ status: lead.status === "new" ? "contacted" : lead.status, pipeline_stage: "contacte", last_contact_at: now.toISOString(), next_action: "Envoyer la proposition", next_action_at: new Date(now.getTime() + delay * 3_600_000).toISOString() }).eq("id", lead.id);
  if (error) throw new Error(error.message);
}
export async function setLeadNextAction(id: string, action: string, atIso: string | null) {
  const { error } = await db.from("leads").update({ next_action: action || null, next_action_at: atIso }).eq("id", id);
  if (error) throw new Error(error.message);
}

export type FollowupQuote = {
  id: string; number: string | null; reference: string; title: string; status: string; total_amount: number | null; currency: string;
  period_start: string | null; next_action: string | null; next_action_at: string | null; last_contact_at: string | null;
  followup_paused: boolean; followup_stage: number; followup_anchor_at: string | null; sent_at: string | null;
  clients: { full_name: string } | null;
};
export const QUOTE_FOLLOWUP_SELECT = "id,number,reference,title,status,total_amount,currency,period_start,next_action,next_action_at,last_contact_at,followup_paused,followup_stage,followup_anchor_at,sent_at";
export type CrmTask = { id: string; kind: string; channel: string; status: string; stage: number | null; title: string; message_draft: string | null; due_at: string; quote_id: string | null; lead_id: string | null };

export async function fetchSentQuotes() {
  const [{ data, error }, { data: clients, error: clientError }] = await Promise.all([
    db.from("quotes").select(QUOTE_FOLLOWUP_SELECT).eq("status", "sent").order("updated_at", { ascending: false }),
    db.from("clients").select("id,full_name"),
  ]);
  if (error) throw new Error(error.message);
  if (clientError) throw new Error(clientError.message);
  const byId = new Map((clients ?? [] as any[]).map((c: any) => [String(c.id), c.full_name]));
  return ((data ?? []) as any[]).map((q) => ({ ...q, clients: q.client_id ? { full_name: byId.get(String(q.client_id)) ?? "" } : null })) as FollowupQuote[];
}

export async function fetchOpenTasks() {
  const { data, error } = await db.from<CrmTask>("crm_tasks").select("id,kind,channel,status,stage,title,message_draft,due_at,quote_id,lead_id").in("status", ["a_valider", "valide"]).order("due_at");
  if (error) throw new Error(error.message);
  return (data ?? []) as CrmTask[];
}

export async function generateDueFollowups(quotes: FollowupQuote[], existing: CrmTask[]) {
  const now = Date.now();
  const seen = new Set(existing.filter((t) => t.quote_id).map((t) => `${t.quote_id}:${t.stage}`));
  const rows: Record<string, unknown>[] = [];
  for (const q of quotes) {
    if (q.followup_paused) continue;
    const anchor = q.followup_anchor_at ?? q.sent_at;
    if (!anchor) continue;
    for (let stage = (q.followup_stage ?? 0) + 1; stage <= FOLLOWUP_LABELS.length; stage++) {
      const due = followupDueAt(anchor, stage);
      if (!due || new Date(due).getTime() > now) break;
      if (seen.has(`${q.id}:${stage}`)) continue;
      rows.push({
        kind: "relance_devis", channel: "whatsapp", status: "a_valider", stage, quote_id: q.id, due_at: due,
        title: `${FOLLOWUP_LABELS[stage - 1]} — ${q.number ?? q.reference}`,
        message_draft: followupMessageDraft({ stage, clientName: q.clients?.full_name ?? null, quoteNumber: q.number ?? q.reference, title: q.title, amount: q.total_amount != null ? Number(q.total_amount) : null, currency: q.currency, periodStart: q.period_start }),
      });
    }
  }
  if (!rows.length) return 0;
  const { error } = await db.from("crm_tasks").upsert(rows, { onConflict: "quote_id,stage" });
  if (error) throw new Error(error.message);
  return rows.length;
}

export async function markTaskSent(task: CrmTask) {
  const nowIso = new Date().toISOString();
  const { error } = await db.from("crm_tasks").update({ status: "envoye", handled_at: nowIso }).eq("id", task.id);
  if (error) throw new Error(error.message);
  if (task.quote_id && task.stage) {
    const { error: quoteError } = await db.from("quotes").update({ followup_stage: task.stage, last_contact_at: nowIso, next_action: task.stage < FOLLOWUP_LABELS.length ? FOLLOWUP_LABELS[task.stage] : "Clôturer le dossier" }).eq("id", task.quote_id);
    if (quoteError) throw new Error(quoteError.message);
  }
}
export async function cancelTask(id: string) { const { error } = await db.from("crm_tasks").update({ status: "annule", handled_at: new Date().toISOString() }).eq("id", id); if (error) throw new Error(error.message); }
export async function snoozeTask(id: string, days = 2) { const { error } = await db.from("crm_tasks").update({ due_at: new Date(Date.now() + days * 86_400_000).toISOString() }).eq("id", id); if (error) throw new Error(error.message); }
export async function toggleQuoteFollowups(id: string, paused: boolean) { const { error } = await db.from("quotes").update({ followup_paused: paused }).eq("id", id); if (error) throw new Error(error.message); }

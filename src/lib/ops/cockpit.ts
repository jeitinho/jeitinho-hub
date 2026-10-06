import { supabase } from "@/integrations/supabase/client";
import {
  AGENTS,
  TASK_KIND_LABELS,
  latestByChannel,
  type AgentRun,
  type EventRow,
  type OtaBooking,
  type TicketCount,
} from "@/lib/ops/ops";

/*
 * Cockpit « Aujourd'hui » : tout ce qui demande une action de Rafael,
 * agrégé en une passe (une requête par source, en parallèle).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Res<T> = { data: T | null; error: { message: string } | null; count?: number | null };
function rows<T>(res: Res<T[]>): T[] {
  if (res.error) throw new Error(res.error.message);
  return res.data ?? [];
}
function count(res: Res<unknown>): number {
  if (res.error) throw new Error(res.error.message);
  return res.count ?? 0;
}

export type CockpitTask = {
  id: string;
  kind: string;
  title: string;
  due_at: string;
  client_id: string | null;
  partner_id: string | null;
  quote_id: string | null;
};

export type CockpitQuote = {
  id: string;
  number: string | null;
  title: string | null;
  status: string;
  total_amount: number | null;
  currency: string | null;
  updated_at: string;
  client_id: string | null;
};

export type CockpitEvent = EventRow & { sold: number };

export type AgentHealth = {
  key: string;
  name: string;
  schedule: string;
  last: AgentRun | null;
  state: "ok" | "attention" | "silence";
};

export type Cockpit = {
  tours: OtaBooking[];
  tasks: CockpitTask[];
  tasksByKind: { kind: string; label: string; n: number }[];
  newRequests: number;
  newApplications: number;
  partnersToChase: number;
  quotesToChase: CockpitQuote[];
  quotesUnpaid: CockpitQuote[];
  listingsToFix: number;
  editorialLate: number;
  nextEvent: CockpitEvent | null;
  agents: AgentHealth[];
};

const DAY = 86_400_000;

export async function fetchCockpit(): Promise<Cockpit> {
  const now = new Date();
  const in48h = new Date(now.getTime() + 2 * DAY).toISOString();
  const weekAgo = new Date(now.getTime() - 7 * DAY).toISOString();
  const fiveDaysAgo = new Date(now.getTime() - 5 * DAY).toISOString();

  const [
    tours,
    tasks,
    prospectsNew,
    leadsNew,
    applications,
    toChase,
    quotesSent,
    quotesAccepted,
    listings,
    editorialLate,
    events,
    runs,
  ] = await Promise.all([
    db
      .from("ota_bookings")
      .select("*")
      .in("status", ["confirmee", "modifiee"])
      .gte("start_at", new Date(now.getTime() - 6 * 3_600_000).toISOString())
      .lte("start_at", in48h)
      .order("start_at"),
    db
      .from("crm_tasks")
      .select("id,kind,title,due_at,client_id,partner_id,quote_id")
      .eq("status", "a_valider")
      .order("due_at"),
    db.from("prospects").select("id", { count: "exact", head: true }).eq("status", "new"),
    db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .gte("created_at", weekAgo),
    db.from("partners").select("id", { count: "exact", head: true }).eq("status", "nouveau"),
    db
      .from("partners")
      .select("id", { count: "exact", head: true })
      .neq("status", "refuse")
      .lt("next_action_at", now.toISOString()),
    db
      .from("quotes")
      .select("id,number,title,status,total_amount,currency,updated_at,client_id")
      .eq("status", "sent")
      .or(
        `next_action_at.lt.${now.toISOString()},and(next_action_at.is.null,updated_at.lt.${fiveDaysAgo})`,
      )
      .order("updated_at"),
    db
      .from("quotes")
      .select("id,number,title,status,total_amount,currency,updated_at,client_id")
      .eq("status", "accepted")
      .order("updated_at", { ascending: false }),
    db.from("ota_listings").select("id", { count: "exact", head: true }).eq("status", "a_corriger"),
    db
      .from("editorial_items")
      .select("id", { count: "exact", head: true })
      .lt("deadline", now.toISOString().slice(0, 10))
      .not("status", "in", "(publie,abandonne)"),
    db
      .from("events")
      .select("*")
      .neq("status", "annule")
      .gte("starts_at", new Date(now.getTime() - 12 * 3_600_000).toISOString())
      .order("starts_at")
      .limit(1),
    db.from("agent_runs").select("*").order("started_at", { ascending: false }).limit(200),
  ]);

  const taskRows = rows<CockpitTask>(tasks);
  const byKind = new Map<string, number>();
  for (const t of taskRows) byKind.set(t.kind, (byKind.get(t.kind) ?? 0) + 1);

  let nextEvent: CockpitEvent | null = null;
  const ev = rows<EventRow>(events)[0];
  if (ev) {
    const counts = rows<TicketCount>(
      await db.from("event_ticket_counts").select("*").eq("event_id", ev.id),
    );
    const sold = [...latestByChannel(counts).values()]
      .filter((c) => c.channel !== "invitation")
      .reduce((s, c) => s + c.tickets, 0);
    nextEvent = { ...ev, sold };
  }

  const runRows = rows<AgentRun>(runs);
  const agents: AgentHealth[] = AGENTS.map((a) => {
    const last = runRows.find((r) => r.agent === a.key) ?? null;
    let state: AgentHealth["state"] = "ok";
    if (!last) state = "silence";
    else if (last.status !== "ok") state = "attention";
    else if (now.getTime() - new Date(last.started_at).getTime() > 8 * DAY) state = "silence";
    return { key: a.key, name: a.name, schedule: a.schedule, last, state };
  });

  return {
    tours: rows<OtaBooking>(tours),
    tasks: taskRows,
    tasksByKind: [...byKind.entries()]
      .map(([kind, n]) => ({ kind, n, label: TASK_KIND_LABELS[kind] ?? kind }))
      .sort((a, b) => b.n - a.n),
    newRequests: count(prospectsNew) + count(leadsNew),
    newApplications: count(applications),
    partnersToChase: count(toChase),
    quotesToChase: rows<CockpitQuote>(quotesSent),
    quotesUnpaid: rows<CockpitQuote>(quotesAccepted),
    listingsToFix: count(listings),
    editorialLate: count(editorialLate),
    nextEvent,
    agents,
  };
}

/** Compteurs légers pour les badges du menu (rafraîchis toutes les 2 min). */
export async function fetchSidebarBadges(): Promise<Record<string, number>> {
  const [tasks, prospects, partners] = await Promise.all([
    db.from("crm_tasks").select("id", { count: "exact", head: true }).eq("status", "a_valider"),
    db.from("prospects").select("id", { count: "exact", head: true }).eq("status", "new"),
    db.from("partners").select("id", { count: "exact", head: true }).eq("status", "nouveau"),
  ]);
  return {
    "a-valider": tasks.count ?? 0,
    crm: prospects.count ?? 0,
    partenaires: partners.count ?? 0,
  };
}

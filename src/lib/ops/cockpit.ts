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
import {
  isContentLate,
  isQuoteToChase,
  isQuoteUnpaid,
  paidByQuote,
  rioDay,
  type ChaseQuote,
  type PaymentLine,
} from "@/lib/ops/cockpit-rules";

/*
 * Cockpit « Aujourd'hui » : tout ce qui demande une action de Rafael,
 * agrégé en une passe (une requête par source, en parallèle). Chaque bloc est
 * isolé : s'il échoue, sa tuile affiche « — » et l'erreur, le reste s'affiche.
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

/** Candidature partenaire = même définition que la page Partenaires (isApplication). */
const applicationsQuery = () =>
  db
    .from("partners")
    .select("id", { count: "exact", head: true })
    .eq("status", "nouveau")
    .eq("source", "blog");

/**
 * Nouvelles demandes = prospects 'new' + leads 'new' sans prospect rattaché
 * (un lead rattaché est déjà compté via son prospect, comme sur la page Demandes).
 * Utilisé pour la tuile du cockpit ET le badge du menu.
 */
async function countNewRequests(): Promise<number> {
  const [prospects, leads] = await Promise.all([
    db.from("prospects").select("id", { count: "exact", head: true }).eq("status", "new"),
    db
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("status", "new")
      .is("prospect_id", null),
  ]);
  return count(prospects) + count(leads);
}

/** Exécute chaque bloc séparément : une source en panne ne vide pas tout le cockpit. */
async function settle<T>(
  fn: () => Promise<T>,
  fallback: T,
  errors: CockpitErrors,
  key: CockpitKey,
) {
  try {
    return await fn();
  } catch (e) {
    errors[key] = e instanceof Error ? e.message : String(e);
    return fallback;
  }
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

export type CockpitKey =
  | "tours"
  | "tasks"
  | "newRequests"
  | "newApplications"
  | "partnersToChase"
  | "quotesToChase"
  | "quotesUnpaid"
  | "listingsToFix"
  | "editorialLate"
  | "nextEvent"
  | "agents";

/** Message d'erreur par bloc du cockpit (absent = chargé correctement). */
export type CockpitErrors = Partial<Record<CockpitKey, string>>;

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
  errors: CockpitErrors;
};

const DAY = 86_400_000;

export async function fetchCockpit(): Promise<Cockpit> {
  const now = new Date();
  const in48h = new Date(now.getTime() + 2 * DAY).toISOString();
  const errors: CockpitErrors = {};
  const QUOTE_COLS =
    "id,number,title,status,total_amount,currency,updated_at,client_id,sent_at,next_action_at,followup_paused,followup_anchor_at";

  const [
    tours,
    taskRows,
    newRequests,
    newApplications,
    partnersToChase,
    quotesToChase,
    quotesUnpaid,
    listingsToFix,
    editorialLate,
    nextEvent,
    agents,
  ] = await Promise.all([
    settle(
      async () =>
        rows<OtaBooking>(
          await db
            .from("ota_bookings")
            .select("*")
            .in("status", ["confirmee", "modifiee"])
            .gte("start_at", new Date(now.getTime() - 6 * 3_600_000).toISOString())
            .lte("start_at", in48h)
            .order("start_at"),
        ),
      [] as OtaBooking[],
      errors,
      "tours",
    ),
    settle(
      async () =>
        rows<CockpitTask>(
          await db
            .from("crm_tasks")
            .select("id,kind,title,due_at,client_id,partner_id,quote_id")
            .eq("status", "a_valider")
            .order("due_at"),
        ),
      [] as CockpitTask[],
      errors,
      "tasks",
    ),
    settle(countNewRequests, 0, errors, "newRequests"),
    settle(async () => count(await applicationsQuery()), 0, errors, "newApplications"),
    settle(
      async () =>
        count(
          await db
            .from("partners")
            .select("id", { count: "exact", head: true })
            .neq("status", "refuse")
            .lt("next_action_at", now.toISOString()),
        ),
      0,
      errors,
      "partnersToChase",
    ),
    settle(
      async () =>
        rows<CockpitQuote & ChaseQuote>(
          await db.from("quotes").select(QUOTE_COLS).eq("status", "sent").order("updated_at"),
        ).filter((q) => isQuoteToChase(q, now)),
      [] as CockpitQuote[],
      errors,
      "quotesToChase",
    ),
    settle(
      async () => {
        const accepted = rows<CockpitQuote>(
          await db
            .from("quotes")
            .select(QUOTE_COLS)
            .eq("status", "accepted")
            .order("updated_at", { ascending: false }),
        );
        if (!accepted.length) return [];
        const payments = rows<PaymentLine>(
          await db
            .from("payments")
            .select("quote_id,amount,kind")
            .in(
              "quote_id",
              accepted.map((q) => q.id),
            ),
        );
        const paid = paidByQuote(payments);
        return accepted.filter((q) => isQuoteUnpaid(q, paid));
      },
      [] as CockpitQuote[],
      errors,
      "quotesUnpaid",
    ),
    settle(
      async () =>
        count(
          await db
            .from("ota_listings")
            .select("id", { count: "exact", head: true })
            .eq("status", "a_corriger"),
        ),
      0,
      errors,
      "listingsToFix",
    ),
    settle(
      async () =>
        rows<{ status: string; deadline: string | null; planned_at: string | null }>(
          await db
            .from("editorial_items")
            .select("id,status,deadline,planned_at")
            .not("status", "in", "(publie,abandonne)")
            .or(`deadline.lt.${rioDay(now)},planned_at.lt.${now.toISOString()}`),
        ).filter((it) => isContentLate(it, now)).length,
      0,
      errors,
      "editorialLate",
    ),
    settle(
      async (): Promise<CockpitEvent | null> => {
        const ev = rows<EventRow>(
          await db
            .from("events")
            .select("*")
            .neq("status", "annule")
            .gte("starts_at", new Date(now.getTime() - 12 * 3_600_000).toISOString())
            .order("starts_at")
            .limit(1),
        )[0];
        if (!ev) return null;
        const counts = rows<TicketCount>(
          await db.from("event_ticket_counts").select("*").eq("event_id", ev.id),
        );
        const sold = [...latestByChannel(counts).values()]
          .filter((c) => c.channel !== "invitation")
          .reduce((s, c) => s + c.tickets, 0);
        return { ...ev, sold };
      },
      null,
      errors,
      "nextEvent",
    ),
    settle(
      async () => {
        const runRows = rows<AgentRun>(
          await db
            .from("agent_runs")
            .select("*")
            .order("started_at", { ascending: false })
            .limit(200),
        );
        return agentHealth(runRows, now);
      },
      [] as AgentHealth[],
      errors,
      "agents",
    ),
  ]);

  const byKind = new Map<string, number>();
  for (const t of taskRows) byKind.set(t.kind, (byKind.get(t.kind) ?? 0) + 1);

  return {
    tours,
    tasks: taskRows,
    tasksByKind: [...byKind.entries()]
      .map(([kind, n]) => ({ kind, n, label: TASK_KIND_LABELS[kind] ?? kind }))
      .sort((a, b) => b.n - a.n),
    newRequests,
    newApplications,
    partnersToChase,
    quotesToChase,
    quotesUnpaid,
    listingsToFix,
    editorialLate,
    nextEvent,
    agents,
    errors,
  };
}

/** État de chaque agent déclaré, plus ceux qui écrivent dans agent_runs sans être déclarés. */
export function agentHealth(runRows: AgentRun[], now: Date = new Date()): AgentHealth[] {
  const known = new Set(AGENTS.map((a) => a.key));
  const declared: AgentHealth[] = AGENTS.map((a) => {
    const last = runRows.find((r) => r.agent === a.key) ?? null;
    let state: AgentHealth["state"] = "ok";
    if (!last) state = "silence";
    else if (last.status !== "ok") state = "attention";
    else if (now.getTime() - new Date(last.started_at).getTime() > 8 * DAY) state = "silence";
    return { key: a.key, name: a.name, schedule: a.schedule, last, state };
  });
  const undeclared: AgentHealth[] = [];
  for (const r of runRows) {
    if (known.has(r.agent)) continue;
    known.add(r.agent);
    undeclared.push({
      key: r.agent,
      name: `${r.agent} (non déclaré)`,
      schedule: "Non déclaré dans le registre",
      last: r,
      state: "attention",
    });
  }
  return [...declared, ...undeclared];
}

/** Compteurs légers pour les badges du menu (rafraîchis toutes les 2 min). */
export async function fetchSidebarBadges(): Promise<Record<string, number>> {
  const [tasks, requests, partners] = await Promise.allSettled([
    db.from("crm_tasks").select("id", { count: "exact", head: true }).eq("status", "a_valider"),
    countNewRequests(),
    applicationsQuery(),
  ]);
  const n = (r: PromiseSettledResult<unknown>) =>
    r.status === "fulfilled"
      ? typeof r.value === "number"
        ? r.value
        : ((r.value as Res<unknown>).count ?? 0)
      : 0;
  return {
    "a-valider": n(tasks),
    crm: n(requests),
    partenaires: n(partners),
  };
}

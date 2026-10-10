import { supabase } from "@/integrations/supabase/client";
import { deleteLead } from "@/lib/leads-gateway";
import {
  buildDemandes,
  type Demande,
  type DemandeLead,
  type DemandeProspect,
  type DemandeQuote,
  type DemandeTask,
  type StagePatch,
} from "./demandes-rules";

/*
 * Données du pipeline « Demandes → Devis » (onglet Demandes du CRM).
 * Lit prospects + leads + devis + tâches, les fusionne en demandes (voir demandes-rules.ts)
 * et écrit les changements d'étape. Toutes les lectures/écritures passent par RLS (can_manage).
 */

export * from "./demandes-rules";

// Tables récentes : typage souple, les types générés restent la référence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

export const DEMANDES_QUERY_KEY = ["demandes"] as const;

/** Clés à rafraîchir après une écriture (autres vues CRM qui lisent les mêmes tables). */
export const DEMANDES_RELATED_KEYS = [
  ["demandes"],
  ["leads"],
  ["prospects"],
  ["crm"],
  ["clients"],
] as const;

const PROSPECT_SELECT =
  "id,status,source,name,email,phone,travel_start,travel_end,party_size,activities,message,notes,client_id,created_at,updated_at,last_contact_at";
const LEAD_SELECT =
  "id,source,status,name,email,phone,travel_start,travel_end,party_size,activities,message,prospect_id,received_at,processed_at,updated_at,last_contact_at,request_type,campaign";
const QUOTE_SELECT =
  "id,number,reference,title,status,total_amount,currency,client_id,prospect_id,sent_at,accepted_at,paid_at,created_at";
const TASK_SELECT =
  "id,kind,status,title,lead_id,prospect_id,quote_id,due_at,handled_at,created_at";

export type DemandesData = {
  demandes: Demande[];
  /** Tous les devis (y compris hors demandes) : compteur « devis sans réponse ». */
  quotes: DemandeQuote[];
};

export async function fetchDemandes(): Promise<DemandesData> {
  const [prospects, leads, quotes, tasks] = await Promise.all([
    db.from("prospects").select(PROSPECT_SELECT).order("created_at", { ascending: false }),
    db.from("leads").select(LEAD_SELECT).order("received_at", { ascending: false }),
    db.from("quotes").select(QUOTE_SELECT).order("created_at", { ascending: false }),
    db
      .from("crm_tasks")
      .select(TASK_SELECT)
      .neq("status", "annule")
      .or("lead_id.not.is.null,prospect_id.not.is.null,quote_id.not.is.null"),
  ]);
  const quoteRows = check<DemandeQuote[]>(quotes);
  return {
    demandes: buildDemandes({
      prospects: check<DemandeProspect[]>(prospects),
      leads: check<DemandeLead[]>(leads),
      quotes: quoteRows,
      tasks: check<DemandeTask[]>(tasks),
    }),
    quotes: quoteRows,
  };
}

/** Applique un changement d'étape calculé par stagePatch (ou son annulation). */
export async function applyStagePatch(p: StagePatch, values: Record<string, string | null>) {
  check(await db.from(p.table).update(values).eq("id", p.id));
}

/**
 * Qualifie un lead orphelin en prospect — même chemin que l'ancien onglet Leads du CRM
 * (insert prospects puis lead → 'qualified' + prospect_id). Si un prospect existe déjà
 * avec le même e-mail (comme le fait capture_public_lead), le lead y est rattaché.
 * Retourne l'id du prospect.
 */
export async function qualifyLead(lead: DemandeLead, existingProspectId?: string | null) {
  let prospectId = existingProspectId ?? null;
  if (!prospectId) {
    const created = check<{ id: string }>(
      await db
        .from("prospects")
        .insert({
          name: lead.name ?? "Lead sans nom",
          email: lead.email,
          phone: lead.phone,
          party_size: lead.party_size,
          travel_start: lead.travel_start,
          travel_end: lead.travel_end,
          activities: lead.activities ?? [],
          message: lead.message,
          source: lead.source,
          status: "new",
        })
        .select("id")
        .single(),
    );
    prospectId = created.id;
  }
  check(
    await db
      .from("leads")
      .update({
        status: "qualified",
        prospect_id: prospectId,
        processed_at: new Date().toISOString(),
      })
      .eq("id", lead.id),
  );
  return prospectId as string;
}

/** Prospect existant portant le même e-mail qu'un lead orphelin (comparaison sans casse). */
export function findProspectByEmail(demandes: Demande[], email: string | null) {
  const e = email?.trim().toLowerCase();
  if (!e) return null;
  return (
    demandes.find((d) => d.kind === "prospect" && d.prospect?.email?.trim().toLowerCase() === e)
      ?.prospect ?? null
  );
}

/** Crée la fiche client depuis le prospect (RPC existante, passe le prospect en 'won'). */
export async function convertProspectToClient(prospectId: string) {
  const clientId = check<string | null>(
    await db.rpc("convert_prospect_to_client", { p_prospect_id: prospectId }),
  );
  if (!clientId) throw new Error("La conversion n'a pas retourné de client.");
  return clientId as string;
}

/** Supprime un lead (et ses tâches) via /api/leads, comme l'ancien onglet Leads. */
export async function removeLead(id: string) {
  await deleteLead(id);
}

/* ---------- Modification / suppression d'une demande ---------- */

/** Champs modifiables d'une demande (prospect, ou lead non qualifié). */
export type DemandeEditable = {
  name: string;
  email: string | null;
  phone: string | null;
  travel_start: string | null;
  travel_end: string | null;
  party_size: number | null;
  activities: string[];
  message: string | null;
  /** Prospects uniquement (la table leads n'a pas de notes). */
  notes: string | null;
  next_action: string | null;
  next_action_at: string | null;
};

const EDIT_SELECT_PROSPECT =
  "name,email,phone,travel_start,travel_end,party_size,activities,message,notes,next_action,next_action_at";
const EDIT_SELECT_LEAD =
  "name,email,phone,travel_start,travel_end,party_size,activities,message,next_action,next_action_at";

/** Relit la ligne en base (prospects ou leads) pour le formulaire « Modifier ». */
export async function fetchDemandeEditable(d: Pick<Demande, "kind" | "id">) {
  const isProspect = d.kind === "prospect";
  const row = check<Partial<DemandeEditable>>(
    await db
      .from(isProspect ? "prospects" : "leads")
      .select(isProspect ? EDIT_SELECT_PROSPECT : EDIT_SELECT_LEAD)
      .eq("id", d.id)
      .single(),
  );
  return {
    name: row.name ?? "",
    email: row.email ?? null,
    phone: row.phone ?? null,
    travel_start: row.travel_start ?? null,
    travel_end: row.travel_end ?? null,
    party_size: row.party_size ?? null,
    activities: row.activities ?? [],
    message: row.message ?? null,
    notes: row.notes ?? null,
    next_action: row.next_action ?? null,
    next_action_at: row.next_action_at ?? null,
  } satisfies DemandeEditable;
}

export async function updateDemande(d: Pick<Demande, "kind" | "id">, values: DemandeEditable) {
  if (!values.name.trim()) throw new Error("Le nom est obligatoire.");
  if (values.travel_start && values.travel_end && values.travel_end < values.travel_start)
    throw new Error("La date de départ doit être après la date d'arrivée.");
  const { notes, ...common } = values;
  const patch = { ...common, name: values.name.trim() };
  if (d.kind === "prospect") {
    check(
      await db
        .from("prospects")
        .update({ ...patch, notes })
        .eq("id", d.id),
    );
  } else {
    check(await db.from("leads").update(patch).eq("id", d.id));
  }
}

/**
 * Supprime une demande.
 * - lead non qualifié : le lead et ses tâches (via /api/leads)
 * - prospect : refusé s'il a des devis (sinon les devis perdraient leur demande d'origine) ;
 *   sinon supprime ses tâches, les leads reçus rattachés, puis le prospect.
 */
export async function deleteDemande(d: Pick<Demande, "kind" | "id">) {
  if (d.kind === "lead") {
    await deleteLead(d.id);
    return;
  }
  const quotes = check<{ id: string; number: string | null; reference: string }[]>(
    await db.from("quotes").select("id,number,reference").eq("prospect_id", d.id),
  );
  if (quotes.length) {
    const list = quotes.map((q) => q.number ?? q.reference).join(", ");
    throw new Error(
      `Cette demande a ${quotes.length} devis (${list}). Supprimez ou rattachez ailleurs ces devis d'abord, ou passez la demande en « Perdue ».`,
    );
  }
  const leads = check<{ id: string }[]>(
    await db.from("leads").select("id").eq("prospect_id", d.id),
  );
  check(await db.from("crm_tasks").delete().eq("prospect_id", d.id));
  for (const l of leads) await deleteLead(l.id);
  check(await db.from("prospects").delete().eq("id", d.id));
}

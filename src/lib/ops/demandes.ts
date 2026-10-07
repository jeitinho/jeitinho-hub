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

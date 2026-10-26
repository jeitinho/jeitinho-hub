import { supabase } from "@/integrations/supabase/client";
import { fetchCatalogLineOptions, type CatalogOption } from "@/components/catalog-line-picker";
import { matchCatalogActivities } from "@/lib/ops/demandes-rules";

export type ProspectForTrip = {
  id: string;
  name: string;
  client_id: string | null;
  travel_start: string | null;
  travel_end: string | null;
  party_size: number | null;
  activities: string[] | null;
};

function fmtDay(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

/** « {Prénom} - Du {jj/mm} au {jj/mm} » — même format que le trigger `auto_create_trip_from_prospect`. */
export function tripTitleFromProspect(
  p: Pick<ProspectForTrip, "name" | "travel_start" | "travel_end">,
): string {
  const firstName = p.name.trim().split(/\s+/)[0] || "Client";
  if (p.travel_start && p.travel_end)
    return `${firstName} - Du ${fmtDay(p.travel_start)} au ${fmtDay(p.travel_end)}`;
  if (p.travel_start) return `${firstName} - Du ${fmtDay(p.travel_start)}`;
  if (p.travel_end) return `${firstName} - Jusqu'au ${fmtDay(p.travel_end)}`;
  return firstName;
}

/**
 * Associe les activités demandées (texte libre) aux entrées du catalogue et les pose sur le
 * voyage sans créneau (« à placer » — le planning n'existe qu'à partir du Lot 2). Utilisée à la
 * création du voyage (mode manuel) et par le bouton « Associer les activités demandées »
 * (mode automatique, où le voyage brouillon est créé par un trigger qui ne connaît pas le
 * catalogue) : une seule logique de correspondance, `matchCatalogActivities`.
 */
export async function attachMatchedActivities(
  tripId: string,
  partySize: number | null,
  activities: string[],
  currency = "EUR",
): Promise<number> {
  if (!activities.length) return 0;
  const options = await fetchCatalogLineOptions(currency);
  const matches = matchCatalogActivities(activities, options);
  if (!matches.length) return 0;

  const rows = matches.map((o: CatalogOption) => {
    const quantity = o.perPerson && partySize ? partySize : 1;
    const salePrice = o.unitPrice * quantity;
    return {
      trip_id: tripId,
      experience_id: o.sourceType === "experience" ? o.sourceId : null,
      service_id: o.sourceType === "service" ? o.sourceId : null,
      ticket_offer_id: o.sourceType === "ticket" ? o.sourceId : null,
      title: o.label,
      activity_type: o.sourceType ?? "experience",
      status: "to_plan",
      quantity,
      sale_price: salePrice,
      supplier_cost: 0,
      commission_amount: 0,
      margin_amount: salePrice,
      currency: o.currency,
      metadata: { source: "demande-activities-match" },
    };
  });
  const { error } = await supabase.from("trip_activities").insert(rows as never);
  if (error) throw new Error(error.message);
  return rows.length;
}

async function currentUserId(): Promise<string | null> {
  const me = await fetch("/api/auth/me", { credentials: "include" })
    .then((r) => r.json())
    .catch(() => null);
  return me?.user?.id ?? null;
}

/**
 * Idempotent : une demande (prospect) a au plus un voyage lié (`trips.source_prospect_id`).
 * Si un voyage existe déjà pour ce prospect, le renvoie tel quel au lieu d'en créer un second.
 */
export async function createOrFindTripFromProspect(prospect: ProspectForTrip): Promise<string> {
  const { data: existingTrip, error: findError } = await supabase
    .from("trips")
    .select("id")
    .eq("source_prospect_id", prospect.id)
    .maybeSingle();
  if (findError) throw new Error(findError.message);
  if (existingTrip) return existingTrip.id;

  const { data: reference, error: refError } = await supabase.rpc("next_trip_reference");
  if (refError) throw new Error(refError.message);

  const { data: trip, error } = await supabase
    .from("trips")
    .insert({
      reference: reference as string,
      title: tripTitleFromProspect(prospect),
      client_id: prospect.client_id,
      status: "draft",
      start_date: prospect.travel_start,
      end_date: prospect.travel_end,
      party_size: prospect.party_size,
      source: "manual",
      source_prospect_id: prospect.id,
      created_by: await currentUserId(),
    } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  const tripId = (trip as { id: string }).id;

  await attachMatchedActivities(tripId, prospect.party_size, prospect.activities ?? []);

  return tripId;
}

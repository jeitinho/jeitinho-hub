import { supabase } from "@/integrations/supabase/client";

type TripActivityRow = {
  id: string;
  title: string;
  activity_type: string;
  experience_id: string | null;
  service_id: string | null;
  ticket_offer_id: string | null;
  quantity: number | string;
  sale_price: number | string;
  currency: string;
  is_offered: boolean;
};

async function currentUserId(): Promise<string | null> {
  const me = await fetch("/api/auth/me", { credentials: "include" })
    .then((r) => r.json())
    .catch(() => null);
  return me?.user?.id ?? null;
}

/**
 * Crée le devis « brouillon » depuis le voyage (1ʳᵉ génération), régénère les lignes d'un
 * brouillon existant (pas encore envoyé), ou — si le devis actuel est figé (envoyé ou plus) —
 * crée une nouvelle version (même numéro de base, suffixe « vN »), sans toucher à l'ancienne.
 * Une ligne par activité facturable du planning (`kind = 'activity'`) ; le prix reste celui
 * négocié sur `trip_activities` (jamais recalculé depuis le catalogue).
 */
export async function generateOrUpdateQuoteFromTrip(
  tripId: string,
): Promise<{ quoteId: string; versioned: boolean }> {
  const { data: trip, error: tripError } = await supabase
    .from("trips")
    .select("id,title,client_id,currency,party_size,start_date,end_date,quote_id")
    .eq("id", tripId)
    .single();
  if (tripError) throw new Error(tripError.message);

  const { data: activitiesRaw, error: actError } = await supabase
    .from("trip_activities")
    .select(
      "id,title,activity_type,experience_id,service_id,ticket_offer_id,quantity,sale_price,currency,is_offered",
    )
    .eq("trip_id", tripId)
    .eq("kind", "activity");
  if (actError) throw new Error(actError.message);
  const activities = (activitiesRaw ?? []) as TripActivityRow[];
  if (!activities.length) throw new Error("Aucune activité facturable dans le planning.");

  const experienceIds = [
    ...new Set(activities.filter((a) => a.experience_id).map((a) => a.experience_id as string)),
  ];
  const { data: experiences } = experienceIds.length
    ? await supabase
        .from("experiences")
        .select("id,price_model,inclusions,exclusions")
        .in("id", experienceIds)
    : {
        data: [] as {
          id: string;
          price_model: string | null;
          inclusions: unknown;
          exclusions: unknown;
        }[],
      };
  const experienceMap = new Map((experiences ?? []).map((e) => [e.id, e]));

  const serviceIds = [
    ...new Set(activities.filter((a) => a.service_id).map((a) => a.service_id as string)),
  ];
  const { data: services } = serviceIds.length
    ? await supabase.from("services").select("id,price_model").in("id", serviceIds)
    : { data: [] as { id: string; price_model: string | null }[] };
  const serviceMap = new Map((services ?? []).map((s) => [s.id, s]));

  const unitFor = (a: TripActivityRow): string => {
    if (a.activity_type === "ticket") return "Billet";
    const priceModel = a.experience_id
      ? experienceMap.get(a.experience_id)?.price_model
      : a.service_id
        ? serviceMap.get(a.service_id)?.price_model
        : null;
    return priceModel === "per_person" ? "Personne" : "Forfait";
  };

  // Inclus/exclus du PDF = union dédoublonnée des catalogues des activités du planning.
  const included = new Set<string>();
  const excluded = new Set<string>();
  for (const e of experienceMap.values()) {
    for (const item of Array.isArray(e.inclusions) ? e.inclusions : []) {
      if (typeof item === "string") included.add(item);
    }
    for (const item of Array.isArray(e.exclusions) ? e.exclusions : []) {
      if (typeof item === "string") excluded.add(item);
    }
  }

  const currency = (trip.currency ?? "EUR").toUpperCase();

  let currentQuote: {
    id: string;
    status: string;
    number: string | null;
    reference: string;
    version: number;
  } | null = null;
  if (trip.quote_id) {
    const { data, error } = await supabase
      .from("quotes")
      .select("id,status,number,reference,version")
      .eq("id", trip.quote_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    currentQuote = data;
  }

  const isFrozen = !!currentQuote && currentQuote.status !== "draft";
  let targetQuoteId: string;
  let versioned = false;
  const syncedAt = new Date().toISOString();

  if (!currentQuote) {
    const { data: ref, error: refErr } = await supabase.rpc("next_quote_number");
    if (refErr) throw new Error(refErr.message);
    const reference = ref as string;
    const { data: created, error } = await supabase
      .from("quotes")
      .insert({
        reference,
        number: reference,
        title: trip.title,
        client_id: trip.client_id,
        trip_id: tripId,
        status: "draft",
        currency,
        party_size: trip.party_size,
        period_start: trip.start_date,
        period_end: trip.end_date,
        deposit_pct: 50,
        highlights: { included: [...included], excluded: [...excluded] },
        planning_synced_at: syncedAt,
        created_by: await currentUserId(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    targetQuoteId = (created as { id: string }).id;
  } else if (!isFrozen) {
    targetQuoteId = currentQuote.id;
    const { error } = await supabase
      .from("quotes")
      .update({
        title: trip.title,
        client_id: trip.client_id,
        currency,
        party_size: trip.party_size,
        period_start: trip.start_date,
        period_end: trip.end_date,
        highlights: { included: [...included], excluded: [...excluded] },
        planning_synced_at: syncedAt,
      })
      .eq("id", targetQuoteId);
    if (error) throw new Error(error.message);
  } else {
    versioned = true;
    const { data: ref, error: refErr } = await supabase.rpc("next_quote_number");
    if (refErr) throw new Error(refErr.message);
    const reference = ref as string;
    const baseNumber = (currentQuote.number ?? currentQuote.reference).replace(/\s+v\d+$/, "");
    const nextVersion = currentQuote.version + 1;
    const { data: created, error } = await supabase
      .from("quotes")
      .insert({
        reference,
        number: `${baseNumber} v${nextVersion}`,
        title: trip.title,
        client_id: trip.client_id,
        trip_id: tripId,
        status: "draft",
        currency,
        party_size: trip.party_size,
        period_start: trip.start_date,
        period_end: trip.end_date,
        deposit_pct: 50,
        version: nextVersion,
        highlights: { included: [...included], excluded: [...excluded] },
        planning_synced_at: syncedAt,
        created_by: await currentUserId(),
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    targetQuoteId = (created as { id: string }).id;
  }

  // Remplace les lignes générées depuis le planning ; laisse intactes les lignes ajoutées à la
  // main sur le devis (trip_activity_id IS NULL), s'il y en a.
  const { error: delError } = await supabase
    .from("quote_lines")
    .delete()
    .eq("quote_id", targetQuoteId)
    .not("trip_activity_id", "is", null);
  if (delError) throw new Error(delError.message);

  const rows = activities.map((a, position) => {
    const qty = Number(a.quantity) || 1;
    const salePrice = Number(a.sale_price) || 0;
    return {
      quote_id: targetQuoteId,
      trip_activity_id: a.id,
      position,
      label: a.title,
      unit: unitFor(a),
      quantity: qty,
      unit_price: qty > 0 ? salePrice / qty : salePrice,
      currency: a.currency || currency,
      is_offered: a.is_offered,
      experience_id: a.experience_id,
      service_id: a.service_id,
      ticket_offer_id: a.ticket_offer_id,
    };
  });
  const { error: insError } = await supabase.from("quote_lines").insert(rows as never);
  if (insError) throw new Error(insError.message);

  const { error: tripUpdateError } = await supabase
    .from("trips")
    .update({ quote_id: targetQuoteId })
    .eq("id", tripId);
  if (tripUpdateError) throw new Error(tripUpdateError.message);

  return { quoteId: targetQuoteId, versioned };
}

/** Vrai si une activité facturable a été modifiée après la dernière génération du devis. */
export async function hasPlanningChangedSince(tripId: string, syncedAt: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("trip_activities")
    .select("id", { count: "exact", head: true })
    .eq("trip_id", tripId)
    .eq("kind", "activity")
    .gt("updated_at", syncedAt);
  if (error) throw new Error(error.message);
  return (count ?? 0) > 0;
}

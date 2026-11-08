/**
 * Créer / compléter un voyage à partir d'un devis existant.
 * La copie des lignes est faite côté base par la RPC `import_quote_into_trip`
 * (idempotente : une ligne de devis n'est jamais importée deux fois dans le même voyage).
 */
import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

import { QUOTE_STATUSES_FOR_TRIP, type QuoteCandidate } from "./trip-from-quote-rules";
export * from "./trip-from-quote-rules";

export async function fetchQuoteCandidates(): Promise<QuoteCandidate[]> {
  const [quotesR, linkedR] = await Promise.all([
    db
      .from("quotes")
      .select(
        "id,number,reference,title,status,client_id,prospect_id,period_start,period_end,party_size,currency,total_amount,trip_id,updated_at,client:clients(full_name),lines:quote_lines(label,position,is_optional)",
      )
      .in("status", QUOTE_STATUSES_FOR_TRIP as unknown as string[])
      .is("trip_id", null)
      .order("updated_at", { ascending: false })
      .limit(100),
    db.from("trips").select("quote_id").not("quote_id", "is", null),
  ]);
  if (quotesR.error) throw new Error(quotesR.error.message);
  const linked = new Set(((linkedR.data ?? []) as { quote_id: string }[]).map((t) => t.quote_id));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((quotesR.data ?? []) as any[])
    .filter((q) => !linked.has(q.id))
    .map((q) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const lines = ((q.lines ?? []) as any[])
        .filter((l) => !l.is_optional)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
      return {
        id: q.id,
        number: q.number,
        reference: q.reference,
        title: q.title,
        status: q.status,
        client_id: q.client_id,
        prospect_id: q.prospect_id,
        client_name: q.client?.full_name ?? null,
        period_start: q.period_start,
        period_end: q.period_end,
        party_size: q.party_size,
        currency: q.currency,
        total_amount: q.total_amount == null ? null : Number(q.total_amount),
        line_count: lines.length,
        line_labels: lines.map((l) => String(l.label ?? "")).filter(Boolean),
      } satisfies QuoteCandidate;
    });
}

export async function importQuoteIntoTrip(tripId: string, quoteId: string): Promise<number> {
  const { data, error } = await db.rpc("import_quote_into_trip", {
    p_trip_id: tripId,
    p_quote_id: quoteId,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

/** Règles pures « voyage depuis un devis » (sans accès réseau, testées dans trip-from-quote.test.ts). */

export type QuoteCandidate = {
  id: string;
  number: string | null;
  reference: string | null;
  title: string | null;
  status: string;
  client_id: string | null;
  prospect_id: string | null;
  client_name: string | null;
  period_start: string | null;
  period_end: string | null;
  party_size: number | null;
  currency: string | null;
  total_amount: number | null;
  line_count: number;
  line_labels: string[];
};

/** Devis qui peuvent encore donner un voyage : ni refusés, ni expirés, ni déjà liés à un voyage. */
export const QUOTE_STATUSES_FOR_TRIP = ["draft", "sent", "accepted", "paid", "ready"] as const;

const ddmm = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : "");

export function quoteLabel(
  q: Pick<
    QuoteCandidate,
    "number" | "reference" | "title" | "client_name" | "period_start" | "period_end"
  >,
) {
  const id = q.number || q.reference || "Devis";
  const who = q.client_name || q.title || "";
  const when = q.period_start
    ? ` · ${ddmm(q.period_start)}${q.period_end ? `→${ddmm(q.period_end)}` : ""}`
    : "";
  return `${id}${who ? ` · ${who}` : ""}${when}`;
}

/** Titre de voyage par défaut, même format que la création automatique : « Prénom - Du jj/mm au jj/mm ». */
export function tripTitleFromQuote(
  q: Pick<QuoteCandidate, "title" | "client_name" | "period_start" | "period_end">,
) {
  const first = (q.client_name ?? "").trim().split(/\s+/)[0];
  if (first && q.period_start && q.period_end)
    return `${first} - Du ${ddmm(q.period_start)} au ${ddmm(q.period_end)}`;
  if (first && q.period_start) return `${first} - Du ${ddmm(q.period_start)}`;
  return (q.title ?? "").trim() || (first ? `Voyage de ${first}` : "");
}

/** Valeurs du formulaire « Nouveau voyage » préremplies depuis un devis. Les champs déjà saisis sont gardés. */
export function tripDefaultsFromQuote(
  q: QuoteCandidate,
  current: {
    title: string;
    clientId: string;
    start: string;
    end: string;
    partySize: string;
    currency: string;
  },
) {
  return {
    title: current.title.trim() ? current.title : tripTitleFromQuote(q),
    clientId: current.clientId !== "none" ? current.clientId : (q.client_id ?? "none"),
    start: current.start || q.period_start || "",
    end: current.end || q.period_end || "",
    partySize: current.partySize || (q.party_size ? String(q.party_size) : ""),
    currency: (q.currency || current.currency || "EUR").toUpperCase(),
  };
}

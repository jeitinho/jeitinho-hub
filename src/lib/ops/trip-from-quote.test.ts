import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteLabel, tripTitleFromQuote, tripDefaultsFromQuote } from "./trip-from-quote-rules";

const q = {
  id: "q1",
  number: "2026-012",
  reference: null,
  title: "Séjour Rio",
  status: "sent",
  client_id: "c1",
  prospect_id: null,
  client_name: "Anna Martin",
  period_start: "2026-11-15",
  period_end: "2026-11-28",
  party_size: 4,
  currency: "eur",
  total_amount: 1200,
  line_count: 3,
  line_labels: ["City Tour"],
};

test("titre au format de la création automatique", () => {
  assert.equal(tripTitleFromQuote(q), "Anna - Du 15/11 au 28/11");
  assert.equal(tripTitleFromQuote({ ...q, client_name: null }), "Séjour Rio");
});

test("libellé du devis dans la liste", () => {
  assert.equal(quoteLabel(q), "2026-012 · Anna Martin · 15/11→28/11");
});

test("préremplissage sans écraser ce qui est déjà saisi", () => {
  const empty = { title: "", clientId: "none", start: "", end: "", partySize: "", currency: "EUR" };
  assert.deepEqual(tripDefaultsFromQuote(q, empty), {
    title: "Anna - Du 15/11 au 28/11",
    clientId: "c1",
    start: "2026-11-15",
    end: "2026-11-28",
    partySize: "4",
    currency: "EUR",
  });
  const typed = { ...empty, title: "Mon titre", start: "2026-11-16" };
  const r = tripDefaultsFromQuote(q, typed);
  assert.equal(r.title, "Mon titre");
  assert.equal(r.start, "2026-11-16");
});

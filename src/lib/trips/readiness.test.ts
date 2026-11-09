import { test } from "node:test";
import assert from "node:assert/strict";
import { defaultTripTab, tripReadiness } from "./readiness";

const trip = { start_date: "2026-11-11", end_date: "2026-11-22", party_size: 2, client_id: "c", guide_id: null };

test("voyage vide : rien de prêt sauf dates et client", () => {
  const r = tripReadiness({ trip, travelersCount: 0, activities: [], quoteStatus: null });
  assert.deepEqual(r.checks.filter((c) => c.done).map((c) => c.id), ["dates", "client"]);
  assert.equal(r.total, 7);
});

test("prestations : à placer, confirmées, équipe, client informé", () => {
  const r = tripReadiness({
    trip,
    travelersCount: 2,
    activities: [
      { status: "client_informed", day: "2026-11-12", assignee_id: "u" },
      { status: "to_plan", day: null },
      { status: "cancelled", day: null },
      { status: "confirmed", day: "2026-11-13", kind: "note" },
    ],
    quoteStatus: "accepted",
  });
  const by = Object.fromEntries(r.checks.map((c) => [c.id, c]));
  assert.equal(by.travelers.done, true);
  assert.equal(by.quote.done, true);
  assert.equal(by.planning.detail, "1 à placer");
  assert.equal(by.suppliers.detail, "1/2");
  assert.equal(by.staff.detail, "1/2");
  assert.equal(by.informed.done, false);
});

test("guide du voyage = toute l'équipe assignée", () => {
  const r = tripReadiness({
    trip: { ...trip, guide_id: "g" },
    travelersCount: 1,
    activities: [{ status: "confirmed", day: "2026-11-12" }],
    quoteStatus: null,
  });
  assert.equal(r.checks.find((c) => c.id === "staff")!.done, true);
  assert.equal(r.checks.find((c) => c.id === "travelers")!.done, false);
});

test("onglet par défaut", () => {
  assert.equal(defaultTripTab(true, 3), "planning");
  assert.equal(defaultTripTab(false, 3), "infos");
});

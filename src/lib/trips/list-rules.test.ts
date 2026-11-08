import { test } from "node:test";
import assert from "node:assert/strict";
import { countdownLabel, formatTripRange, nights, sortTrips, tripPhase } from "./list-rules";

const T = "2026-11-08";

test("phase d'un voyage", () => {
  assert.equal(
    tripPhase({ start_date: "2026-11-17", end_date: "2026-11-27", status: "draft" }, T),
    "a_venir",
  );
  assert.equal(
    tripPhase({ start_date: "2026-11-05", end_date: "2026-11-10", status: "confirmed" }, T),
    "en_cours",
  );
  assert.equal(
    tripPhase({ start_date: "2026-10-01", end_date: "2026-10-05", status: "confirmed" }, T),
    "passe",
  );
  assert.equal(tripPhase({ start_date: null, end_date: null, status: "draft" }, T), "sans_date");
});

test("compte à rebours", () => {
  assert.equal(countdownLabel({ start_date: "2026-11-20", end_date: null }, T), "J-12");
  assert.equal(countdownLabel({ start_date: "2026-11-09", end_date: null }, T), "Demain");
  assert.equal(countdownLabel({ start_date: "2026-11-06", end_date: "2026-11-10" }, T), "Jour 3/5");
  assert.equal(countdownLabel({ start_date: "2026-10-01", end_date: "2026-10-03" }, T), "Terminé");
});

test("plage de dates lisible", () => {
  assert.equal(formatTripRange("2026-11-17", "2026-11-27"), "17 → 27 nov. 2026");
  assert.equal(formatTripRange("2026-11-28", "2026-12-03"), "28 nov. → 3 déc. 2026");
  assert.equal(formatTripRange("2026-12-30", "2027-01-04"), "30 déc. 2026 → 4 janv. 2027");
  assert.equal(formatTripRange(null, null), "Dates à définir");
  assert.equal(nights("2026-11-17", "2026-11-27"), 10);
});

test("tri : en cours, à venir, sans date, passés", () => {
  const trips = [
    { id: "past", start_date: "2026-10-01", end_date: "2026-10-03", status: "done" },
    { id: "nodate", start_date: null, end_date: null, status: "draft" },
    { id: "later", start_date: "2026-12-20", end_date: null, status: "draft" },
    { id: "soon", start_date: "2026-11-12", end_date: null, status: "draft" },
    { id: "now", start_date: "2026-11-07", end_date: "2026-11-09", status: "confirmed" },
  ];
  assert.deepEqual(
    sortTrips(trips, T).map((t) => t.id),
    ["now", "soon", "later", "nodate", "past"],
  );
});

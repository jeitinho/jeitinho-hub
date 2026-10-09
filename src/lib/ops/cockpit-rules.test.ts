import { test } from "node:test";
import assert from "node:assert/strict";
import { isContentLate, isQuoteToChase, isQuoteUnpaid, paidByQuote, rioDay } from "./cockpit-rules";

const now = new Date("2026-10-09T01:30:00Z"); // 8 oct. 22h30 à Rio

test("date du jour à Rio, pas UTC", () => {
  assert.equal(rioDay(now), "2026-10-08");
});

test("devis à relancer : pause, ancre de relance, prochaine action", () => {
  const base = {
    status: "sent",
    followup_paused: false,
    followup_anchor_at: null,
    sent_at: "2026-09-30T12:00:00Z",
    next_action_at: null,
    updated_at: "2026-10-08T12:00:00Z",
  };
  assert.equal(isQuoteToChase(base, now), true, "envoyé il y a 9 jours");
  assert.equal(isQuoteToChase({ ...base, followup_paused: true }, now), false);
  assert.equal(
    isQuoteToChase({ ...base, followup_anchor_at: "2026-10-07T12:00:00Z" }, now),
    false,
    "l'ancre de relance récente prime sur sent_at",
  );
  assert.equal(isQuoteToChase({ ...base, next_action_at: "2026-10-10T12:00:00Z" }, now), false);
  assert.equal(isQuoteToChase({ ...base, status: "accepted" }, now), false);
});

test("devis acceptés non soldés : paiements et remboursements", () => {
  const paid = paidByQuote([
    { quote_id: "a", amount: 300, kind: "acompte" },
    { quote_id: "a", amount: 700, kind: "solde" },
    { quote_id: "b", amount: 300, kind: "acompte" },
    { quote_id: "b", amount: 100, kind: "remboursement" },
    { quote_id: "b", amount: 50, kind: "commission" },
  ]);
  assert.equal(isQuoteUnpaid({ id: "a", status: "accepted", total_amount: 1000 }, paid), false);
  assert.equal(isQuoteUnpaid({ id: "b", status: "accepted", total_amount: 1000 }, paid), true);
  assert.equal(isQuoteUnpaid({ id: "c", status: "paid", total_amount: 1000 }, paid), false);
});

test("contenus en retard : date de Rio et date prévue dépassée", () => {
  const it = { status: "planifie", deadline: null, planned_at: null };
  assert.equal(
    isContentLate({ ...it, deadline: "2026-10-08" }, now),
    false,
    "échéance aujourd'hui à Rio",
  );
  assert.equal(isContentLate({ ...it, deadline: "2026-10-07" }, now), true);
  assert.equal(isContentLate({ ...it, planned_at: "2026-10-08T20:00:00Z" }, now), true);
  assert.equal(
    isContentLate({ ...it, status: "publie", planned_at: "2026-10-01T20:00:00Z" }, now),
    false,
  );
});

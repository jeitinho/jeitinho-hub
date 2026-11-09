import { test } from "node:test";
import assert from "node:assert/strict";
import { paymentSchedule } from "./payment-schedule";

const Q = {
  total_amount: 1000,
  currency: "EUR",
  deposit_pct: 50,
  accepted_at: "2026-11-01T10:00:00Z",
  balance_due_on: null,
};
const T = "2026-11-09";

test("acompte attendu tant que rien n'est payé", () => {
  const s = paymentSchedule(Q, [], T);
  assert.equal(s.state, "acompte_attendu");
  assert.equal(s.deposit, 500);
  assert.equal(s.daysSinceAccepted, 8);
});

test("acompte reçu, solde à venir puis en retard", () => {
  const pay = [{ amount: 500, currency: "EUR", kind: "acompte", paid_at: "2026-11-02" }];
  assert.equal(paymentSchedule(Q, pay, T).state, "acompte_recu");
  assert.equal(
    paymentSchedule({ ...Q, balance_due_on: "2026-11-15" }, pay, T).state,
    "solde_a_venir",
  );
  const late = paymentSchedule({ ...Q, balance_due_on: "2026-11-05" }, pay, T);
  assert.equal(late.state, "en_retard");
  assert.equal(late.remaining, 500);
});

test("soldé ; remboursement déduit ; autre devise non additionnée", () => {
  const s = paymentSchedule(
    Q,
    [
      { amount: 1000, currency: "EUR", kind: "total", paid_at: null },
      { amount: 100, currency: "EUR", kind: "remboursement", paid_at: null },
      { amount: 600, currency: "BRL", kind: "solde", paid_at: null },
    ],
    T,
  );
  assert.equal(s.paid, 900);
  assert.equal(s.state, "acompte_recu");
  assert.equal(s.otherCurrencyCount, 1);
  assert.equal(
    paymentSchedule(Q, [{ amount: 1000, currency: "EUR", kind: "total", paid_at: null }], T).state,
    "solde",
  );
});

// Tests des règles de paiements : npx tsx --test src/lib/ops/payments-rules.test.ts
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { convertAmount, paymentBalance, paymentSign } from "./payments-rules.ts";

const RATES = { EUR: 1, BRL: 5.92 };

describe("paymentSign", () => {
  test("encaissements, remboursement, hors calcul", () => {
    assert.equal(paymentSign("acompte"), 1);
    assert.equal(paymentSign("solde"), 1);
    assert.equal(paymentSign("total"), 1);
    assert.equal(paymentSign("remboursement"), -1);
    assert.equal(paymentSign("commission"), 0);
    assert.equal(paymentSign("depense"), 0);
  });
});

describe("convertAmount", () => {
  test("même devise, conversion, devise inconnue", () => {
    assert.equal(convertAmount(10, "eur", "EUR", RATES), 10);
    assert.equal(convertAmount(592, "BRL", "EUR", RATES), 100);
    assert.equal(convertAmount(100, "EUR", "BRL", RATES), 592);
    assert.equal(convertAmount(100, "USD", "EUR", RATES), null);
  });
});

describe("paymentBalance", () => {
  test("acompte + solde = soldé", () => {
    const b = paymentBalance(
      1000,
      "EUR",
      [
        { amount: 300, currency: "EUR", kind: "acompte" },
        { amount: "700", currency: "EUR", kind: "solde" },
      ],
      RATES,
    );
    assert.equal(b.paid, 1000);
    assert.equal(b.remaining, 0);
    assert.equal(b.settled, true);
  });

  test("remboursement déduit, commission ignorée", () => {
    const b = paymentBalance(
      1000,
      "EUR",
      [
        { amount: 1000, currency: "EUR", kind: "total" },
        { amount: 200, currency: "EUR", kind: "remboursement" },
        { amount: 50, currency: "EUR", kind: "commission" },
      ],
      RATES,
    );
    assert.equal(b.paid, 800);
    assert.equal(b.remaining, 200);
    assert.equal(b.settled, false);
  });

  test("autre devise convertie au taux indicatif, devise inconnue listée à part", () => {
    const b = paymentBalance(
      1000,
      "EUR",
      [
        { amount: 500, currency: "EUR", kind: "acompte" },
        { amount: 592, currency: "BRL", kind: "solde" },
        { amount: 40, currency: "USD", kind: "solde" },
      ],
      RATES,
    );
    assert.equal(b.paidSameCurrency, 500);
    assert.equal(b.paid, 600);
    assert.equal(b.remaining, 400);
    assert.deepEqual(b.otherCurrencies, { BRL: 592, USD: 40 });
    assert.deepEqual(b.unconverted, { USD: 40 });
  });

  test("devis à 0 n'est jamais « soldé »", () => {
    assert.equal(paymentBalance(0, "BRL", [], RATES).settled, false);
  });
});

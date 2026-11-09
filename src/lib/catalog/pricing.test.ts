import { test } from "node:test";
import assert from "node:assert/strict";
import { matchesSearch, pricingSummary, unitEconomics, type PricingRow } from "./pricing";

test("marge = prix − coût − frais fixes − commission", () => {
  const e = unitEconomics({ price: 100, supplierCost: 50, supplierNet: null, fixedCost: 10, commissionPct: 10 });
  assert.equal(e.margin, 30);
  assert.equal(e.rate, 0.3);
});

test("net fournisseur utilisé si pas de coût", () => {
  assert.equal(unitEconomics({ price: 80, supplierCost: null, supplierNet: 60, fixedCost: null, commissionPct: 0 }).margin, 20);
});

test("coût inconnu → pas de marge inventée", () => {
  const e = unitEconomics({ price: 80, supplierCost: null, supplierNet: null, fixedCost: 0, commissionPct: 0 });
  assert.equal(e.costKnown, false);
  assert.equal(e.margin, null);
});

test("coût à 0 saisi = coût connu (activité 100 % maison)", () => {
  assert.equal(unitEconomics({ price: 50, supplierCost: 0, supplierNet: null, fixedCost: null, commissionPct: null }).margin, 50);
});

const row = (o: Partial<PricingRow>): PricingRow => ({
  key: "k", kind: "experience", id: "1", title: "Pão de Açúcar", group: "Rio", currency: "EUR", priceModel: "per_person",
  price: 60, supplierCost: 50, supplierNet: null, fixedCost: null, commissionPct: 0, published: true, ...o,
});

test("résumé du catalogue", () => {
  const s = pricingSummary([row({}), row({ supplierCost: null }), row({ price: 40, supplierCost: 50 }), row({ price: null })]);
  assert.equal(s.total, 4);
  assert.equal(s.withoutCost, 1);
  assert.equal(s.negative, 1);
  assert.equal(s.withoutPrice, 1);
});

test("recherche sans accents", () => {
  assert.ok(matchesSearch(row({}), "acucar"));
  assert.ok(!matchesSearch(row({}), "maracana"));
});

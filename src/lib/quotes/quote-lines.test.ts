import { test } from "node:test";
import assert from "node:assert/strict";
import { diffQuoteLines, moveItem, quoteTotals } from "./quote-lines";

const L = (p: Partial<Parameters<typeof quoteTotals>[0][number]>) => ({
  label: "x",
  quantity: 1,
  unit_price: 0,
  is_offered: false,
  is_optional: false,
  ...p,
});

test("totaux : offert, option, par personne, acompte", () => {
  const r = quoteTotals(
    [
      L({ quantity: 4, unit_price: 50, supplier_cost: 10 }),
      L({ quantity: 1, unit_price: 200, is_offered: true }),
      L({ quantity: 1, unit_price: 300, is_optional: true }),
      L({ label: "  ", quantity: 1, unit_price: 999 }),
    ],
    { partySize: 4, depositPct: 50 },
  );
  assert.equal(r.total, 200);
  assert.equal(r.totalWithOptions, 500);
  assert.equal(r.perPerson, 50);
  assert.equal(r.deposit, 100);
  assert.equal(r.balance, 100);
  assert.equal(r.estimatedMargin, 160);
  assert.equal(r.hasOptions, true);
});

test("marge inconnue sans coût catalogue", () => {
  assert.equal(quoteTotals([L({ unit_price: 100 })]).estimatedMargin, null);
});

test("différentiel : mise à jour, insertion, suppression, ids stables", () => {
  const d = diffQuoteLines([{ id: "a" }, {}, { id: "c" }], ["a", "b", "c"]);
  assert.deepEqual(d.toDelete, ["b"]);
  assert.deepEqual(
    d.toUpdate.map((x) => [x.line.id, x.position]),
    [
      ["a", 0],
      ["c", 2],
    ],
  );
  assert.deepEqual(
    d.toInsert.map((x) => x.position),
    [1],
  );
});

test("déplacer une ligne", () => {
  assert.deepEqual(moveItem([1, 2, 3], 0, 2), [2, 3, 1]);
  assert.deepEqual(moveItem([1, 2, 3], 0, -1), [1, 2, 3]);
});

test("taux de marge sur les lignes chiffrées et lignes sans coût", () => {
  const t = quoteTotals([
    { label: "A", quantity: 2, unit_price: 100, supplier_cost: 60, is_offered: false, is_optional: false },
    { label: "B", quantity: 1, unit_price: 100, supplier_cost: null, is_offered: false, is_optional: false },
    { label: "C", quantity: 1, unit_price: 50, supplier_cost: null, is_offered: true, is_optional: false },
  ] as never);
  assert.equal(t.estimatedMargin, 80);
  assert.equal(t.marginRate, 0.4);
  assert.equal(t.uncostedLines, 1);
  assert.ok(Math.abs(t.marginCoverage - 2 / 3) < 1e-9);
});

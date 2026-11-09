import { test } from "node:test";
import assert from "node:assert/strict";
import { canAccessModule, profileKind } from "../../hooks/use-auth";
import { computeMonthSplit, monthBounds, type LedgerEntry } from "./partner-split";

const S = {
  pro_labore: 3000,
  tax_pct: 6,
  guide_pct: 30,
  apporteur_pct: 10,
  reserve_pct: 20,
  vehicle_fee: 40,
};
const M = [
  { user_id: "luan", display_name: "Luan" },
  { user_id: "rafael", display_name: "Rafael" },
  { user_id: "patricia", display_name: "Patricia" },
];
const e = (p: Partial<LedgerEntry>): LedgerEntry => ({
  revenue: 0,
  direct_cost: 0,
  guided_internally: false,
  guide_id: null,
  apporteur_id: null,
  vehicle_used: false,
  ...p,
});

test("mois à 40 000 : impôts, marge, primes de guide de l'exemple", () => {
  const entries = [
    e({
      revenue: 15000,
      direct_cost: 100,
      guided_internally: true,
      guide_id: "luan",
      apporteur_id: "luan",
    }),
    e({
      revenue: 5000,
      direct_cost: 1700,
      guided_internally: true,
      guide_id: "patricia",
      apporteur_id: "patricia",
    }),
    e({
      revenue: 5000,
      direct_cost: 1700,
      guided_internally: true,
      guide_id: "rafael",
      apporteur_id: "rafael",
    }),
    e({ revenue: 10000, direct_cost: 4120, apporteur_id: "rafael" }),
    e({ revenue: 5000, direct_cost: 2180, apporteur_id: "patricia" }),
  ];
  const r = computeMonthSplit(entries, M, S);
  assert.equal(r.revenue, 40000);
  assert.equal(r.taxes, 2400);
  assert.equal(r.margin, 27800);
  const by = Object.fromEntries(r.members.map((m) => [m.user_id, m]));
  assert.equal(by.luan.guide_bonus, 4200);
  assert.equal(by.patricia.guide_bonus, 900);
  assert.equal(by.rafael.guide_bonus, 900);
  assert.equal(by.luan.apporteur_bonus, 1400);
  assert.equal(r.pro_labore_total, 9000);
});

test("tout l'argent est réparti : membres + réserve + véhicules = marge", () => {
  const entries = [
    e({
      revenue: 12000,
      direct_cost: 2000,
      guided_internally: true,
      guide_id: "luan",
      apporteur_id: "patricia",
      vehicle_used: true,
    }),
    e({ revenue: 8000, direct_cost: 5000, apporteur_id: "rafael" }),
    e({
      revenue: 20000,
      direct_cost: 3000,
      guided_internally: true,
      guide_id: "rafael",
      vehicle_used: true,
    }),
  ];
  const r = computeMonthSplit(entries, M, S);
  const paid = r.members.reduce((a, m) => a + m.total, 0);
  assert.ok(Math.abs(paid + r.reserve + r.vehicle - r.margin) < 0.05);
  assert.equal(r.vehicle, 80);
  assert.equal(r.members.find((m) => m.user_id === "luan")?.vehicle_refund, 40);
  assert.equal(r.shortfall, 0);
});

test("saison basse : manque signalé, pas de solde négatif", () => {
  const r = computeMonthSplit([e({ revenue: 5000, direct_cost: 1000 })], M, S);
  assert.ok(r.shortfall > 0);
  assert.equal(r.balance, 0);
  assert.equal(r.reserve, 0);
  assert.ok(r.warnings.length > 0);
});

test("tour guidé sans guide : aucune prime, avertissement", () => {
  const r = computeMonthSplit([e({ revenue: 50000, guided_internally: true })], M, S);
  assert.equal(r.guide_bonus_total, 0);
  assert.ok(r.unassigned_guide_margin > 0);
});

test("bornes de mois", () => {
  assert.deepEqual(monthBounds("2026-02"), { from: "2026-02-01", to: "2026-02-28" });
  assert.deepEqual(monthBounds("2026-12"), { from: "2026-12-01", to: "2026-12-31" });
});

test("rôle associé : conciergerie oui, AFRO LOVE / finances non", () => {
  assert.equal(profileKind(["associe"]), "pilotage");
  for (const m of ["crm", "devis", "voyages", "clients", "experiences", "manuel", "associes"])
    assert.ok(canAccessModule(m, ["associe"]), m);
  for (const m of ["evenements", "audience", "agents", "finances", "parametres", "a-valider"])
    assert.ok(!canAccessModule(m, ["associe"]), m);
});

test("argent à venir : hors partage, totalisé à part", () => {
  const r = computeMonthSplit(
    [
      {
        ...e({ revenue: 0, guided_internally: true, guide_id: "luan" }),
        cash_status: "a_recevoir",
        expected_amount: 600,
        expected_currency: "BRL",
      },
      {
        ...e({ revenue: 20000, direct_cost: 0, guided_internally: true, guide_id: "luan" }),
        cash_status: "recu",
      },
    ],
    M,
    S,
  );
  assert.equal(r.revenue, 20000);
  assert.equal(r.pending_count, 1);
  assert.deepEqual(r.pending_by_currency, { BRL: 600 });
});

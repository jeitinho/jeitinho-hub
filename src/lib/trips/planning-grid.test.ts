import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { buildDayGrid, isEveningRow, slotFromTime, type GridLine } from "./planning-grid";

const l = (title: string, slot: string | null, extra: Partial<GridLine> = {}): GridLine => ({
  slot,
  title,
  displayTime: null,
  category: "activite",
  isOffered: false,
  kind: "activity",
  ...extra,
});

describe("Planning PDF : grille des créneaux", () => {
  test("une journée vide garde ses cinq créneaux", () => {
    const rows = buildDayGrid([]);
    assert.deepEqual(rows.map((r) => r.slots), [["matin"], ["midi"], ["apres_midi"], ["soir"], ["nuit"]]);
  });

  test("une activité sur matin + midi fusionne les deux lignes", () => {
    const rows = buildDayGrid([l("Ilhas Cagarras", "matin", { slotSpan: 2 }), l("City tour", "apres_midi"), l("Vitrinni", "nuit")]);
    assert.deepEqual(rows.map((r) => r.slots), [["matin", "midi"], ["apres_midi"], ["soir"], ["nuit"]]);
    assert.equal(rows[0].lines[0].title, "Ilhas Cagarras");
  });

  test("deux activités au même créneau partagent la ligne", () => {
    const rows = buildDayGrid([l("Pain de Sucre", "apres_midi"), l("Morro da Urca", "apres_midi")]);
    assert.equal(rows.find((r) => r.slots[0] === "apres_midi")?.lines.length, 2);
  });

  test("une fusion s'arrête avant un créneau déjà pris", () => {
    const rows = buildDayGrid([l("Plage", "matin", { slotSpan: 3 }), l("Déjeuner", "midi")]);
    assert.deepEqual(rows[0].slots, ["matin", "midi", "apres_midi"]);
    assert.equal(rows[0].lines.length, 2);
  });

  test("sans créneau, l'heure affichée décide", () => {
    assert.equal(slotFromTime("15h"), "apres_midi");
    assert.equal(slotFromTime("03h30"), "matin");
    assert.equal(slotFromTime("20:00"), "soir");
    assert.equal(slotFromTime("Matin"), null);
    const rows = buildDayGrid([l("Stand de tir", null, { displayTime: "20h" })]);
    assert.equal(rows.find((r) => r.slots[0] === "soir")?.lines[0].title, "Stand de tir");
  });

  test("soirée et nuit en terracotta, OFF jamais", () => {
    const [row] = buildDayGrid([l("Pedra do Sal", "nuit")]).filter((r) => r.lines.length);
    assert.equal(isEveningRow(row), true);
    const [off] = buildDayGrid([l("OFF", "nuit", { kind: "free" })]).filter((r) => r.lines.length);
    assert.equal(isEveningRow(off), false);
  });
});

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  conflicts,
  dispatchSummary,
  displayTime,
  filterItems,
  groupByDay,
  itemKey,
  loadByPerson,
  needsStaff,
  type DispatchItem,
} from "./dispatch-rules";

const base: DispatchItem = {
  source: "gyg",
  source_id: "a",
  item_index: 0,
  day: "2026-11-11",
  time_label: "09h00",
  sort_at: "2026-11-11T12:00:00Z",
  title: "Pain de Sucre",
  pax: 2,
  client_name: "Marco",
  client_phone: null,
  language: "en",
  meeting_point: null,
  assignee_id: null,
  partner_id: null,
  confirmed: true,
  done: false,
  ref: "GYG1",
  trip_id: null,
};
const it = (o: Partial<DispatchItem>): DispatchItem => ({ ...base, ...o });

test("une sortie confirmée sans personne ni prestataire est à staffer", () => {
  assert.equal(needsStaff(it({})), true);
  assert.equal(needsStaff(it({ partner_id: "p" })), false);
  assert.equal(needsStaff(it({ confirmed: false })), false);
  assert.equal(needsStaff(it({ done: true })), false);
});

test("filtres combinés", () => {
  const items = [it({ source_id: "1" }), it({ source_id: "2", assignee_id: "luan" }), it({ source_id: "3", confirmed: false, source: "voyage" })];
  assert.equal(filterItems(items, { confirmedOnly: true, unassignedOnly: false, personId: null, source: null }).length, 2);
  assert.equal(filterItems(items, { confirmedOnly: true, unassignedOnly: true, personId: null, source: null }).length, 1);
  assert.equal(filterItems(items, { confirmedOnly: false, unassignedOnly: false, personId: "luan", source: null }).length, 1);
  assert.equal(filterItems(items, { confirmedOnly: false, unassignedOnly: false, personId: null, source: "voyage" }).length, 1);
});

test("regroupement par jour, trié", () => {
  const g = groupByDay([it({ day: "2026-11-12", sort_at: "2026-11-12T10:00:00Z" }), it({ source_id: "b" })]);
  assert.deepEqual(g.map((d) => d.day), ["2026-11-11", "2026-11-12"]);
});

test("résumé : sorties à venir, à staffer, voyageurs", () => {
  const s = dispatchSummary([it({}), it({ source_id: "b", assignee_id: "x", pax: 3 }), it({ source_id: "c", done: true })]);
  assert.deepEqual(s, { total: 2, toStaff: 1, pax: 5 });
});

test("charge par personne", () => {
  assert.deepEqual(loadByPerson([it({ assignee_id: "x" }), it({ source_id: "b", assignee_id: "x" })]), { x: 2 });
});

test("conflit : même personne, même jour, moins de 3 h", () => {
  const a = it({ assignee_id: "x" });
  const b = it({ source_id: "b", assignee_id: "x", sort_at: "2026-11-11T13:30:00Z" });
  const c = it({ source_id: "c", assignee_id: "x", sort_at: "2026-11-11T20:00:00Z" });
  const k = conflicts([a, b, c]);
  assert.ok(k.has(itemKey(a)) && k.has(itemKey(b)));
  assert.ok(!k.has(itemKey(c)));
});

test("heure inconnue et dates", () => {
  assert.equal(displayTime("00h00"), "Heure ?");
  assert.equal(displayTime("10h00"), "10h00");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
});

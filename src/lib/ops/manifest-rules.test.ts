import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildManifest,
  manifestSummary,
  shiftDay,
  whatsappLink,
  type ManifestActivity,
  type ManifestBooking,
} from "./manifest-rules";

const B = (p: Partial<ManifestBooking>): ManifestBooking => ({
  id: "b1",
  platform: "getyourguide",
  booking_ref: "GYG1",
  activity_title: "Rocinha",
  start_at: "2026-11-11T12:30:00Z",
  participants: 2,
  participants_detail: null,
  lead_name: "Ana",
  lead_phone: "+33 6 12 34 56 78",
  lead_language: "Français",
  status: "confirmee",
  guide_id: null,
  checkin_status: null,
  meeting_point: "Rua Sá Ferreira 44",
  notes: null,
  ...p,
});
const A = (p: Partial<ManifestActivity>): ManifestActivity => ({
  id: "a1",
  trip_id: "t1",
  trip_title: "Anna",
  trip_reference: "TRIP-1",
  title: "Pain de Sucre",
  day: "2026-11-11",
  slot: "apres_midi",
  display_time: null,
  scheduled_start: null,
  status: "confirmed",
  party_size: 4,
  client_name: "Anna",
  client_phone: null,
  guide_id: "luan",
  ...p,
});

test("réservation et prestation du même jour, triées par heure (heure de Rio)", () => {
  const items = buildManifest(
    "2026-11-11",
    [B({}), B({ id: "b2", start_at: "2026-11-12T12:00:00Z" })],
    [A({})],
  );
  assert.deepEqual(
    items.map((i) => [i.key, i.time]),
    [
      ["b:b1", "09h30"],
      ["a:a1", "Après-midi"],
    ],
  );
});

test("résumé : départs, personnes, sans guide, pointés, annulés exclus", () => {
  const items = buildManifest(
    "2026-11-11",
    [B({ checkin_status: "present" }), B({ id: "b3", status: "annulee", participants: 9 })],
    [A({ status: "completed" })],
  );
  assert.deepEqual(manifestSummary(items), {
    departures: 2,
    pax: 6,
    unassigned: 1,
    done: 2,
    noShow: 0,
  });
});

test("liens et dates", () => {
  assert.equal(whatsappLink("+33 6 12 34 56 78"), "https://wa.me/33612345678");
  assert.equal(whatsappLink("abc"), null);
  assert.equal(shiftDay("2026-12-31", 1), "2027-01-01");
});

import { fromDispatch } from "./manifest-rules";

test("liste unifiée → manifeste : site et voyage, pointage, heure inconnue", () => {
  const base = {
    item_index: 0, day: "2026-11-11", pax: 2, client_name: "A", client_phone: null, language: null,
    meeting_point: null, assignee_id: null, partner_id: null, done: false, ref: null, trip_id: null, notes: null,
  };
  const rows = fromDispatch([
    { ...base, source: "voyage", source_id: "v", time_label: "Soir", sort_at: "2026-11-11T22:00:00Z", title: "Baile", confirmed: false, checkin: null },
    { ...base, source: "gyg", source_id: "g", time_label: "00h00", sort_at: "2026-11-11T03:00:00Z", title: "Pão", confirmed: true, checkin: "present" },
    { ...base, source: "site", source_id: "s", item_index: 1, time_label: "10h00", sort_at: "2026-11-11T13:00:00Z", title: "Rocinha", confirmed: true, checkin: "no_show" },
  ]);
  assert.deepEqual(rows.map((r) => r.title), ["Pão", "Rocinha", "Baile"]);
  assert.equal(rows[0].time, "?");
  assert.equal(rows[0].done, true);
  assert.equal(rows[1].noShow, true);
  assert.equal(rows[1].index, 1);
  assert.equal(rows[2].kind, "activity");
  assert.equal(rows[2].tentative, true);
});

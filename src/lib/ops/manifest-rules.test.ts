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

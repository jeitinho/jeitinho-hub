/**
 * Manifeste du jour (sur le modèle FareHarbor / Bókun / Rezdy) : toutes les sorties d'une date,
 * réservations plateformes et prestations des voyages sur mesure, dans une seule liste triée.
 * Fonctions pures, testées dans manifest-rules.test.ts.
 */

export type ManifestBooking = {
  id: string;
  platform: string;
  booking_ref: string | null;
  activity_title: string | null;
  start_at: string | null;
  participants: number | null;
  participants_detail: string | null;
  lead_name: string | null;
  lead_phone: string | null;
  lead_language: string | null;
  status: string | null;
  guide_id: string | null;
  checkin_status: "present" | "no_show" | null;
  meeting_point: string | null;
  notes: string | null;
};

export type ManifestActivity = {
  id: string;
  trip_id: string;
  trip_title: string | null;
  trip_reference: string | null;
  title: string;
  day: string | null;
  slot: string | null;
  display_time: string | null;
  scheduled_start: string | null;
  status: string | null;
  party_size: number | null;
  client_name: string | null;
  client_phone: string | null;
  guide_id: string | null;
};

export type ManifestItem = {
  key: string;
  kind: "booking" | "activity";
  id: string;
  time: string; // « 09h30 », « Matin »…
  sortKey: string; // HH:MM ou rang du créneau
  title: string;
  subtitle: string;
  pax: number | null;
  contactName: string | null;
  contactPhone: string | null;
  language: string | null;
  meetingPoint: string | null;
  guideId: string | null;
  done: boolean;
  noShow: boolean;
  cancelled: boolean;
  source: string;
  notes: string | null;
};

const SLOT_LABEL: Record<string, string> = {
  matin: "Matin",
  midi: "Midi",
  apres_midi: "Après-midi",
  soir: "Soir",
  nuit: "Nuit",
};
const SLOT_SORT: Record<string, string> = {
  matin: "08:00",
  midi: "12:00",
  apres_midi: "14:00",
  soir: "19:00",
  nuit: "22:00",
};

/** Heure locale de Rio « HH:MM » d'un horodatage. */
export function rioTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}
/** Date locale de Rio « AAAA-MM-JJ ». */
export function rioDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-CA", { timeZone: "America/Sao_Paulo" });
}

const CANCELLED = new Set(["annulee", "cancelled", "canceled"]);

export function buildManifest(
  day: string,
  bookings: ManifestBooking[],
  activities: ManifestActivity[],
): ManifestItem[] {
  const items: ManifestItem[] = [];
  for (const b of bookings) {
    if (!b.start_at || rioDate(b.start_at) !== day) continue;
    const t = rioTime(b.start_at);
    items.push({
      key: `b:${b.id}`,
      kind: "booking",
      id: b.id,
      time: t.replace(":", "h"),
      sortKey: t,
      title: b.activity_title ?? "Réservation",
      subtitle: [
        b.platform ? b.platform.charAt(0).toUpperCase() + b.platform.slice(1) : null,
        b.booking_ref,
      ]
        .filter(Boolean)
        .join(" · "),
      pax: b.participants,
      contactName: b.lead_name,
      contactPhone: b.lead_phone,
      language: b.lead_language,
      meetingPoint: b.meeting_point,
      guideId: b.guide_id,
      done: b.checkin_status === "present",
      noShow: b.checkin_status === "no_show",
      cancelled: CANCELLED.has(b.status ?? ""),
      source: "plateforme",
      notes: [b.participants_detail, b.notes].filter(Boolean).join(" · ") || null,
    });
  }
  for (const a of activities) {
    if (a.day !== day) continue;
    const t =
      a.display_time ||
      (a.scheduled_start
        ? rioTime(a.scheduled_start).replace(":", "h")
        : (SLOT_LABEL[a.slot ?? ""] ?? ""));
    const sortKey = a.scheduled_start
      ? rioTime(a.scheduled_start)
      : (a.display_time?.replace("h", ":").padStart(5, "0") ?? SLOT_SORT[a.slot ?? ""] ?? "23:59");
    items.push({
      key: `a:${a.id}`,
      kind: "activity",
      id: a.id,
      time: t || "—",
      sortKey,
      title: a.title,
      subtitle: [a.trip_title, a.trip_reference].filter(Boolean).join(" · "),
      pax: a.party_size,
      contactName: a.client_name,
      contactPhone: a.client_phone,
      language: null,
      meetingPoint: null,
      guideId: a.guide_id,
      done: a.status === "completed" || a.status === "done",
      noShow: false,
      cancelled: a.status === "cancelled" || a.status === "replaced",
      source: "voyage",
      notes: null,
    });
  }
  return items.sort((x, y) => x.sortKey.localeCompare(y.sortKey) || x.title.localeCompare(y.title));
}

export function manifestSummary(items: ManifestItem[]) {
  const live = items.filter((i) => !i.cancelled);
  return {
    departures: live.length,
    pax: live.reduce((a, i) => a + (i.pax ?? 0), 0),
    unassigned: live.filter((i) => !i.guideId).length,
    done: live.filter((i) => i.done).length,
    noShow: live.filter((i) => i.noShow).length,
  };
}

/** Lien WhatsApp à partir d'un numéro saisi librement. */
export function whatsappLink(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

export function mapsLink(place: string | null): string | null {
  return place
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place}, Rio de Janeiro`)}`
    : null;
}

export function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

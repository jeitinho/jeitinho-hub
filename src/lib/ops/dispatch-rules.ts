/**
 * Dispatch terrain (modèle Bókun « Resource allocation » / FareHarbor « Staff ») :
 * toutes les sorties d'une période, groupées par jour, avec la personne et le
 * prestataire assignés. Fonctions pures, testées dans dispatch-rules.test.ts.
 */

export type DispatchSource = "gyg" | "site" | "voyage" | "manuel" | (string & {});

export type DispatchItem = {
  source: DispatchSource;
  source_id: string;
  item_index: number;
  day: string; // AAAA-MM-JJ (heure de Rio)
  time_label: string;
  sort_at: string;
  title: string;
  pax: number | null;
  client_name: string | null;
  client_phone: string | null;
  language: string | null;
  meeting_point: string | null;
  assignee_id: string | null;
  partner_id: string | null;
  confirmed: boolean;
  done: boolean;
  ref: string | null;
  trip_id: string | null;
  checkin?: "present" | "no_show" | null;
  notes?: string | null;
};

export const SOURCE_LABEL: Record<string, string> = {
  gyg: "GetYourGuide",
  site: "Site",
  voyage: "Voyage",
  manuel: "Manuel",
};

export const SOURCE_TONE: Record<string, string> = {
  gyg: "bg-[#FF5533]/10 text-[#C2391B] ring-[#FF5533]/25",
  site: "bg-primary/10 text-primary ring-primary/25",
  voyage: "bg-sky-50 text-sky-800 ring-sky-200",
  manuel: "bg-muted text-foreground/75 ring-border",
};

export function itemKey(i: Pick<DispatchItem, "source" | "source_id" | "item_index">): string {
  return `${i.source}:${i.source_id}:${i.item_index}`;
}

/** « 00h00 » vient d'une réservation sans heure : on ne l'invente pas. */
export function displayTime(label: string): string {
  return label === "00h00" ? "Heure ?" : label;
}

/** Une sortie réalisée compte comme confirmée (elle a eu lieu). */
export function isConfirmed(i: DispatchItem): boolean {
  return i.confirmed || i.done;
}

export function needsStaff(i: DispatchItem): boolean {
  return isConfirmed(i) && !i.done && !i.assignee_id && !i.partner_id;
}

export type DispatchFilter = {
  confirmedOnly: boolean;
  unassignedOnly: boolean;
  personId: string | null; // « Mes sorties » ou filtre par personne
  source: string | null;
};

export function filterItems(items: DispatchItem[], f: DispatchFilter): DispatchItem[] {
  return items.filter(
    (i) =>
      (!f.confirmedOnly || isConfirmed(i)) &&
      (!f.unassignedOnly || needsStaff(i)) &&
      (!f.personId || i.assignee_id === f.personId) &&
      (!f.source || i.source === f.source),
  );
}

export function groupByDay(items: DispatchItem[]): { day: string; items: DispatchItem[] }[] {
  const map = new Map<string, DispatchItem[]>();
  for (const i of [...items].sort((a, b) => a.sort_at.localeCompare(b.sort_at))) {
    const list = map.get(i.day) ?? [];
    list.push(i);
    map.set(i.day, list);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, items]) => ({ day, items }));
}

export function dispatchSummary(items: DispatchItem[]) {
  const live = items.filter((i) => isConfirmed(i) && !i.done);
  return {
    total: live.length,
    toStaff: live.filter((i) => !i.assignee_id && !i.partner_id).length,
    pax: live.reduce((s, i) => s + (i.pax ?? 0), 0),
  };
}

/** Charge par personne sur la période (sorties confirmées, non réalisées). */
export function loadByPerson(items: DispatchItem[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const i of items) {
    if (!isConfirmed(i) || i.done || !i.assignee_id) continue;
    out[i.assignee_id] = (out[i.assignee_id] ?? 0) + 1;
  }
  return out;
}

/** Deux sorties de la même personne le même jour à moins de 3 h d'écart. */
export function conflicts(items: DispatchItem[]): Set<string> {
  const out = new Set<string>();
  const byPerson = new Map<string, DispatchItem[]>();
  for (const i of items) {
    if (!i.assignee_id || !isConfirmed(i) || i.done) continue;
    const k = `${i.assignee_id}|${i.day}`;
    byPerson.set(k, [...(byPerson.get(k) ?? []), i]);
  }
  for (const list of byPerson.values()) {
    const sorted = list.sort((a, b) => a.sort_at.localeCompare(b.sort_at));
    for (let n = 1; n < sorted.length; n++) {
      const gap = new Date(sorted[n].sort_at).getTime() - new Date(sorted[n - 1].sort_at).getTime();
      if (gap < 3 * 3600_000) {
        out.add(itemKey(sorted[n]));
        out.add(itemKey(sorted[n - 1]));
      }
    }
  }
  return out;
}

export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

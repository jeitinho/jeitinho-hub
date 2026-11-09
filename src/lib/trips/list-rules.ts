/** Règles pures de la liste des voyages (phase, compte à rebours, plage de dates lisible). */

export type TripPhase = "en_cours" | "a_venir" | "sans_date" | "passe" | "annule";

const MONTHS = [
  "janv.",
  "févr.",
  "mars",
  "avr.",
  "mai",
  "juin",
  "juil.",
  "août",
  "sept.",
  "oct.",
  "nov.",
  "déc.",
];

/** Date du jour à Rio, AAAA-MM-JJ. */
export function todayRio(now = new Date()): string {
  return now.toLocaleDateString("fr-CA", { timeZone: "America/Sao_Paulo" });
}

export function tripPhase(
  t: { start_date: string | null; end_date: string | null; status: string | null },
  today: string,
): TripPhase {
  if (t.status === "cancelled" || t.status === "canceled" || t.status === "annule") return "annule";
  if (!t.start_date) return "sans_date";
  const end = t.end_date ?? t.start_date;
  if (end < today) return "passe";
  if (t.start_date <= today) return "en_cours";
  return "a_venir";
}

function dayDiff(a: string, b: string): number {
  return Math.round(
    (Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) -
      Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) /
      86_400_000,
  );
}

/** « J-12 », « Demain », « Aujourd'hui », « Jour 3/10 », « Terminé ». */
export function countdownLabel(
  t: { start_date: string | null; end_date: string | null },
  today: string,
): string | null {
  if (!t.start_date) return null;
  const end = t.end_date ?? t.start_date;
  const before = dayDiff(today, t.start_date);
  if (before > 1) return `J-${before}`;
  if (before === 1) return "Demain";
  if (before === 0) return "Aujourd'hui";
  if (end >= today)
    return `Jour ${dayDiff(t.start_date, today) + 1}/${dayDiff(t.start_date, end) + 1}`;
  return "Terminé";
}

/** « 17 → 27 nov. 2026 », « 28 nov. → 3 déc. 2026 », « 30 déc. 2026 → 4 janv. 2027 ». */
export function formatTripRange(start: string | null, end: string | null): string {
  if (!start) return "Dates à définir";
  const d = (iso: string) => ({
    y: iso.slice(0, 4),
    m: MONTHS[Number(iso.slice(5, 7)) - 1],
    d: String(Number(iso.slice(8, 10))),
  });
  const s = d(start);
  if (!end || end === start) return `${s.d} ${s.m} ${s.y}`;
  const e = d(end);
  if (s.y !== e.y) return `${s.d} ${s.m} ${s.y} → ${e.d} ${e.m} ${e.y}`;
  if (s.m !== e.m) return `${s.d} ${s.m} → ${e.d} ${e.m} ${e.y}`;
  return `${s.d} → ${e.d} ${e.m} ${e.y}`;
}

export function nights(start: string | null, end: string | null): number | null {
  if (!start || !end) return null;
  const n = dayDiff(start, end);
  return n > 0 ? n : null;
}

/** Ordre d'affichage : en cours, puis à venir (le plus proche d'abord), sans date, passés (le plus récent d'abord). */
export function sortTrips<
  T extends { start_date: string | null; end_date: string | null; status: string | null },
>(trips: T[], today: string): T[] {
  const rank: Record<TripPhase, number> = {
    en_cours: 0,
    a_venir: 1,
    sans_date: 2,
    passe: 3,
    annule: 4,
  };
  return [...trips].sort((a, b) => {
    const pa = tripPhase(a, today),
      pb = tripPhase(b, today);
    if (pa !== pb) return rank[pa] - rank[pb];
    const sa = a.start_date ?? "",
      sb = b.start_date ?? "";
    return pa === "passe" ? sb.localeCompare(sa) : sa.localeCompare(sb);
  });
}

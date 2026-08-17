/**
 * Scoring commercial JEITINHO — simple, déterministe et explicable.
 * 6 critères, 100 points au total. Le détail est stocké dans `score_breakdown`
 * pour que le commercial comprenne toujours POURQUOI un lead est HOT.
 */

export type Priority = "HOT" | "WARM" | "COLD";

export type ScoreInput = {
  received_at?: string | null;
  travel_start?: string | null;
  travel_end?: string | null;
  party_size?: number | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  activities?: string[] | null;
  source?: string | null;
  campaign?: string | null;
  request_type?: string | null;
};

export type ScoreBreakdown = {
  freshness: number;
  horizon: number;
  group: number;
  contact: number;
  intent: number;
  channel: number;
  bonus: number;
  labels: string[];
};

export type ScoreResult = { score: number; priority: Priority; breakdown: ScoreBreakdown };

const DAY = 86_400_000;

function daysBetween(from: Date, to: Date) {
  return Math.round((to.getTime() - from.getTime()) / DAY);
}

/** Mots-clés à forte valeur commerciale (haute saison, hébergement premium, groupes). */
const HIGH_VALUE_KEYWORDS = [
  "nouvel an",
  "réveillon",
  "reveillon",
  "nouvel-an",
  "new year",
  "carnaval",
  "villa",
  "privatis",
  "chambres",
  "yacht",
  "bateau privé",
  "anniversaire",
  "mariage",
  "eve",
];

function haystack(input: ScoreInput) {
  return [input.message, input.campaign, input.request_type, ...(input.activities ?? [])]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** Détecte un séjour qui chevauche la période Nouvel An / Carnaval (haute saison). */
function isHighSeason(input: ScoreInput) {
  const text = haystack(input);
  if (HIGH_VALUE_KEYWORDS.slice(0, 7).some((k) => text.includes(k))) return true;
  for (const raw of [input.travel_start, input.travel_end]) {
    if (!raw) continue;
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const md = (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
    if (md >= 1226 || md <= 105) return true; // 26 déc → 5 jan
    if (md >= 201 && md <= 301) return true; // fenêtre carnaval
  }
  return false;
}

export function scoreLead(input: ScoreInput, now: Date = new Date()): ScoreResult {
  const labels: string[] = [];

  // 1. Fraîcheur de la demande — 20 pts
  let freshness = 5;
  if (input.received_at) {
    const age = now.getTime() - new Date(input.received_at).getTime();
    if (age < DAY) freshness = 20;
    else if (age < 3 * DAY) freshness = 15;
    else if (age < 7 * DAY) freshness = 10;
    if (freshness === 20) labels.push("Demande de moins de 24h");
  }

  // 2. Horizon de voyage — 20 pts
  let horizon = 5;
  if (input.travel_start) {
    const d = new Date(input.travel_start);
    if (!Number.isNaN(d.getTime())) {
      const delta = daysBetween(now, d);
      if (delta < 0) horizon = 0;
      else if (delta <= 60) horizon = 20;
      else if (delta <= 120) horizon = 15;
      else if (delta <= 240) horizon = 10;
      if (horizon === 20) labels.push("Départ dans moins de 2 mois");
      if (horizon === 0) labels.push("Dates déjà passées");
    }
  }

  // 3. Taille du groupe — 15 pts
  const size = input.party_size ?? 0;
  let group = 3;
  if (size >= 9) group = 15;
  else if (size >= 5) group = 13;
  else if (size >= 3) group = 9;
  else if (size >= 1) group = 5;
  if (size >= 5) labels.push(`Groupe de ${size} personnes`);

  // 4. Qualité du contact — 15 pts
  const hasPhone = !!input.phone?.trim();
  const hasEmail = !!input.email?.trim();
  const contact = hasPhone && hasEmail ? 15 : hasPhone ? 11 : hasEmail ? 8 : 0;
  if (!hasPhone && !hasEmail) labels.push("Aucun moyen de contact");

  // 5. Intention exprimée — 20 pts
  let intent = 0;
  const msgLen = input.message?.trim().length ?? 0;
  if (msgLen > 400) intent += 10;
  else if (msgLen > 120) intent += 7;
  else if (msgLen > 0) intent += 4;
  if (input.travel_start && input.travel_end) intent += 6;
  else if (input.travel_start) intent += 3;
  if ((input.activities?.length ?? 0) > 0) intent += 4;
  intent = Math.min(intent, 20);

  // 6. Canal / campagne — 10 pts
  const src = (input.source ?? "").toLowerCase();
  let channel = 3;
  if (/reserv|booking|devis|villa|quote/.test(src)) channel = 10;
  else if (input.campaign?.trim()) channel = 8;
  else if (src) channel = 6;

  // Bonus haute saison / demande premium — 10 pts
  let bonus = 0;
  if (isHighSeason(input)) {
    bonus += 6;
    labels.push("Haute saison (Nouvel An / Carnaval)");
  }
  const text = haystack(input);
  if (/villa|privatis|yacht|chambres/.test(text)) {
    bonus += 4;
    labels.push("Hébergement / prestation premium");
  }

  const score = Math.max(
    0,
    Math.min(100, freshness + horizon + group + contact + intent + channel + bonus),
  );

  return {
    score,
    priority: priorityFromScore(score),
    breakdown: { freshness, horizon, group, contact, intent, channel, bonus, labels },
  };
}

export function priorityFromScore(score: number): Priority {
  if (score >= 70) return "HOT";
  if (score >= 45) return "WARM";
  return "COLD";
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  HOT: "HOT — à traiter maintenant",
  WARM: "WARM",
  COLD: "COLD",
};

/** Délai de première action recommandé selon la priorité (en heures). */
export function firstActionDelayHours(priority: Priority) {
  return priority === "HOT" ? 2 : priority === "WARM" ? 24 : 72;
}

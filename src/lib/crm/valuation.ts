/**
 * Estimation de la valeur potentielle d'un lead (EUR).
 * Volontairement simple : budget jour/personne × personnes × nuits estimées.
 * Ajustez ces constantes selon vos tarifs réels.
 */

export const DAILY_RATE_PER_PERSON = 150;
export const DEFAULT_NIGHTS = 6;
export const HIGH_SEASON_MULTIPLIER = 1.4;
export const PREMIUM_MULTIPLIER = 1.6;

const DAY = 86_400_000;

export function estimateValue(input: {
  party_size?: number | null;
  travel_start?: string | null;
  travel_end?: string | null;
  message?: string | null;
  activities?: string[] | null;
  highSeason?: boolean;
}) {
  const people = Math.max(1, input.party_size ?? 2);
  let nights = DEFAULT_NIGHTS;
  if (input.travel_start && input.travel_end) {
    const a = new Date(input.travel_start).getTime();
    const b = new Date(input.travel_end).getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) {
      nights = Math.max(1, Math.round((b - a) / DAY));
    }
  }
  let value = people * nights * DAILY_RATE_PER_PERSON;
  const text = [input.message, ...(input.activities ?? [])].filter(Boolean).join(" ").toLowerCase();
  if (/villa|privatis|yacht|chambres/.test(text)) value *= PREMIUM_MULTIPLIER;
  if (input.highSeason) value *= HIGH_SEASON_MULTIPLIER;
  return Math.round(value / 50) * 50;
}

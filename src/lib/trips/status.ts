/** Libellés français des statuts de voyage (enum trip_status) et des prestations (trip_activities.status). */
export const TRIP_STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  confirmed: "Confirmé",
  in_progress: "En cours",
  completed: "Terminé",
  cancelled: "Annulé",
};

export const TRIP_STATUSES = Object.entries(TRIP_STATUS_LABEL).map(([value, label]) => ({
  value,
  label,
}));

// L'application écrit « completed » pour une prestation réalisée ; « done » et « replaced »
// sont seulement affichés s'ils existent en base.
export const ACTIVITY_STATUS_LABEL: Record<string, string> = {
  to_plan: "À organiser",
  confirmed: "Confirmé",
  client_informed: "Client informé",
  completed: "Fait",
  done: "Fait",
  cancelled: "Annulé",
  replaced: "Remplacé",
};

/** Statuts proposés à la saisie (boutons et listes). */
export const ACTIVITY_STATUSES = (
  ["to_plan", "confirmed", "client_informed", "completed", "cancelled"] as const
).map((value) => ({ value, label: ACTIVITY_STATUS_LABEL[value] }));

export const tripStatusLabel = (s: string | null | undefined) =>
  (s && TRIP_STATUS_LABEL[s]) || s || "—";
export const activityStatusLabel = (s: string | null | undefined) =>
  (s && ACTIVITY_STATUS_LABEL[s]) || s || "—";

/**
 * Préparation d'un voyage (modèle Tourwriter / Travefy) : ce qui reste à faire
 * avant le départ, calculé à partir des données du voyage. Fonction pure.
 */
export type ReadinessTab = "infos" | "logistique" | "planning" | "synthese" | "programme";

export type ReadinessCheck = {
  id: string;
  label: string;
  done: boolean;
  detail?: string;
  tab: ReadinessTab;
};

type Act = {
  status: string | null;
  day: string | null;
  kind?: string | null;
  assignee_id?: string | null;
};

const CONFIRMED = new Set(["confirmed", "client_informed", "completed", "done"]);
const INFORMED = new Set(["client_informed", "completed", "done"]);
const LIVE = (a: Act) =>
  (a.kind ?? "activity") === "activity" && !["cancelled", "replaced"].includes(a.status ?? "");

export function tripReadiness(input: {
  trip: {
    start_date: string | null;
    end_date: string | null;
    party_size: number | null;
    client_id: string | null;
    guide_id: string | null;
  };
  travelersCount: number;
  activities: Act[];
  quoteStatus: string | null;
}): { checks: ReadinessCheck[]; done: number; total: number } {
  const { trip, travelersCount, quoteStatus } = input;
  const acts = input.activities.filter(LIVE);
  const placed = acts.filter((a) => a.day);
  const toPlace = acts.length - placed.length;
  const confirmed = acts.filter((a) => CONFIRMED.has(a.status ?? "")).length;
  const informed = acts.filter((a) => INFORMED.has(a.status ?? "")).length;
  const staffed = acts.filter((a) => a.assignee_id || trip.guide_id).length;

  const checks: ReadinessCheck[] = [
    {
      id: "dates",
      label: "Dates du séjour",
      done: !!trip.start_date && !!trip.end_date,
      tab: "infos",
    },
    { id: "client", label: "Client rattaché", done: !!trip.client_id, tab: "infos" },
    {
      id: "travelers",
      label: "Noms des voyageurs",
      done: travelersCount > 0 && (!trip.party_size || travelersCount >= trip.party_size),
      detail: trip.party_size ? `${travelersCount}/${trip.party_size}` : `${travelersCount}`,
      tab: "infos",
    },
  ];
  if (quoteStatus !== null) {
    checks.push({
      id: "quote",
      label: "Devis accepté",
      done: ["accepted", "paid", "ready"].includes(quoteStatus),
      tab: "programme",
    });
  }
  checks.push(
    {
      id: "planning",
      label: "Prestations placées au planning",
      done: acts.length > 0 && toPlace === 0,
      detail: acts.length === 0 ? "aucune prestation" : toPlace > 0 ? `${toPlace} à placer` : undefined,
      tab: "planning",
    },
    {
      id: "suppliers",
      label: "Prestataires confirmés",
      done: acts.length > 0 && confirmed === acts.length,
      detail: acts.length ? `${confirmed}/${acts.length}` : undefined,
      tab: "programme",
    },
    {
      id: "staff",
      label: "Équipe terrain assignée",
      done: acts.length > 0 && staffed === acts.length,
      detail: acts.length ? `${staffed}/${acts.length}` : undefined,
      tab: "programme",
    },
    {
      id: "informed",
      label: "Client informé du programme",
      done: acts.length > 0 && informed === acts.length,
      detail: acts.length ? `${informed}/${acts.length}` : undefined,
      tab: "programme",
    },
  );
  const done = checks.filter((c) => c.done).length;
  return { checks, done, total: checks.length };
}

/** Onglet d'ouverture : le planning dès qu'il y a des dates et des prestations. */
export function defaultTripTab(hasDates: boolean, activitiesCount: number): ReadinessTab {
  return hasDates && activitiesCount > 0 ? "planning" : "infos";
}

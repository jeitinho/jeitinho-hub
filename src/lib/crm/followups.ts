/** Paliers de relance des devis envoyés : J+1, J+3, J+7, J+14. */
export const FOLLOWUP_OFFSETS_DAYS = [1, 3, 7, 14] as const;

export const FOLLOWUP_LABELS = ["Relance J+1", "Relance J+3", "Relance J+7", "Relance J+14"] as const;

const DAY = 86_400_000;

export function followupDueAt(anchorIso: string, stage: number) {
  const offset = FOLLOWUP_OFFSETS_DAYS[stage - 1];
  if (!offset) return null;
  return new Date(new Date(anchorIso).getTime() + offset * DAY).toISOString();
}

/** Brouillon de message WhatsApp — copié puis envoyé manuellement par l'humain. */
export function followupMessageDraft(opts: {
  stage: number;
  clientName?: string | null;
  quoteNumber?: string | null;
  title?: string | null;
  amount?: number | null;
  currency?: string | null;
  periodStart?: string | null;
}) {
  const name = (opts.clientName ?? "").split(" ")[0] || "bonjour";
  const ref = opts.quoteNumber ? ` (réf. ${opts.quoteNumber})` : "";
  const montant =
    opts.amount != null
      ? ` — ${opts.amount.toLocaleString("fr-FR")} ${opts.currency ?? "EUR"}`
      : "";
  const periode = opts.periodStart ? ` pour ${opts.periodStart}` : "";

  switch (opts.stage) {
    case 1:
      return `Olá ${name} ! Je voulais m'assurer que vous avez bien reçu la proposition « ${opts.title ?? "votre séjour"} »${ref}${montant}. Des questions, des ajustements à faire ? Je suis là.`;
    case 2:
      return `Bonjour ${name}, un petit mot au sujet de votre projet${periode}${ref}. Si vous souhaitez modifier le programme ou le budget, je peux vous refaire une version en quelques minutes.`;
    case 3:
      return `Bonjour ${name}, je garde vos dates${periode} en tête. Les disponibilités bougent vite sur cette période — souhaitez-vous que je bloque les prestations principales ?`;
    default:
      return `Bonjour ${name}, je clôture votre dossier${ref} sauf si le projet est toujours d'actualité. Dites-moi simplement oui ou non, et je m'adapte à votre calendrier.`;
  }
}

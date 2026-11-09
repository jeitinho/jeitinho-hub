/**
 * Registre des parts de l'association JEITINHO (Rafael · Luan · Patricia).
 * Modèle validé le 08/11/2026 (proposition d'association, section « Répartition de l'argent ») :
 *
 *  1. Impôts (tax_pct du CA)              4. Pró-labore (fixe × associés actifs)
 *  2. Coûts directs → marge               5. Prime de guide : guide_pct de la marge des tours guidés en interne
 *  3. Forfait véhicule (Luan)             6. Prime d'apporteur : apporteur_pct de la marge de chaque vente
 *  7. Réserve : reserve_pct de ce qui reste    8. Solde partagé à parts égales
 *
 * Fonction pure : aucun accès réseau, testée dans partner-split.test.ts.
 */

export type PartnerSettings = {
  pro_labore: number;
  tax_pct: number;
  guide_pct: number;
  apporteur_pct: number;
  reserve_pct: number;
  vehicle_fee: number;
};

export type LedgerEntry = {
  id?: string;
  revenue: number;
  direct_cost: number;
  guided_internally: boolean;
  guide_id: string | null;
  apporteur_id: string | null;
  vehicle_used: boolean;
  /** « a_recevoir » : vente faite, argent pas encore sur le compte (ex. versement GetYourGuide). Non partagée. */
  cash_status?: "a_recevoir" | "recu";
  expected_amount?: number | null;
};

export type Member = { user_id: string; display_name: string };

export type MemberShare = {
  user_id: string;
  display_name: string;
  pro_labore: number;
  guide_bonus: number;
  apporteur_bonus: number;
  balance_share: number;
  total: number;
  vehicle_refund: number;
};

export type MonthSplit = {
  revenue: number;
  taxes: number;
  direct_costs: number;
  margin: number;
  vehicle: number;
  pro_labore_total: number;
  guide_bonus_total: number;
  apporteur_bonus_total: number;
  remainder: number;
  reserve: number;
  balance: number;
  /** Marge non attribuée (pas de guide / pas d'apporteur) : reste dans le solde partagé. */
  unassigned_guide_margin: number;
  members: MemberShare[];
  /** Le mois ne couvre pas pró-labore + primes : le manque vient de la réserve (règle de saison basse). */
  shortfall: number;
  /** Ventes faites dont l'argent n'est pas encore reçu : montants attendus, hors partage. */
  pending_count: number;
  pending_by_currency: Record<string, number>;
  warnings: string[];
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/** Marge d'une ligne, après sa part d'impôt. */
export function entryMargin(e: LedgerEntry, s: Pick<PartnerSettings, "tax_pct">): number {
  return n(e.revenue) - n(e.revenue) * (n(s.tax_pct) / 100) - n(e.direct_cost);
}

export function computeMonthSplit(
  allEntries: (LedgerEntry & { expected_currency?: string | null })[],
  members: Member[],
  settings: PartnerSettings,
): MonthSplit {
  const warnings: string[] = [];
  // Seul l'argent réellement reçu est partagé.
  const entries = allEntries.filter((e) => (e.cash_status ?? "recu") === "recu");
  const pendingEntries = allEntries.filter((e) => e.cash_status === "a_recevoir");
  const pending_by_currency: Record<string, number> = {};
  for (const e of pendingEntries) {
    const cur = (e.expected_currency ?? "BRL").toUpperCase();
    pending_by_currency[cur] = r2((pending_by_currency[cur] ?? 0) + n(e.expected_amount));
  }
  const memberIds = new Set(members.map((m) => m.user_id));
  const revenue = entries.reduce((a, e) => a + n(e.revenue), 0);
  const taxes = revenue * (n(settings.tax_pct) / 100);
  const direct_costs = entries.reduce((a, e) => a + n(e.direct_cost), 0);
  const margin = revenue - taxes - direct_costs;
  const vehicle = entries.filter((e) => e.vehicle_used).length * n(settings.vehicle_fee);
  const pro_labore_total = members.length * n(settings.pro_labore);

  const guide: Record<string, number> = {};
  const apporteur: Record<string, number> = {};
  let unassigned_guide_margin = 0;
  for (const e of entries) {
    const m = entryMargin(e, settings);
    if (m <= 0) continue;
    if (e.guided_internally) {
      if (e.guide_id && memberIds.has(e.guide_id)) {
        guide[e.guide_id] = (guide[e.guide_id] ?? 0) + m * (n(settings.guide_pct) / 100);
      } else {
        unassigned_guide_margin += m;
      }
    }
    if (e.apporteur_id && memberIds.has(e.apporteur_id)) {
      apporteur[e.apporteur_id] =
        (apporteur[e.apporteur_id] ?? 0) + m * (n(settings.apporteur_pct) / 100);
    }
  }
  if (unassigned_guide_margin > 0)
    warnings.push("Des tours guidés n'ont pas de guide : aucune prime n'est calculée pour eux.");
  const guide_bonus_total = Object.values(guide).reduce((a, b) => a + b, 0);
  const apporteur_bonus_total = Object.values(apporteur).reduce((a, b) => a + b, 0);

  const remainderRaw =
    margin - vehicle - pro_labore_total - guide_bonus_total - apporteur_bonus_total;
  const shortfall = remainderRaw < 0 ? -remainderRaw : 0;
  if (shortfall > 0)
    warnings.push(
      "La marge du mois ne couvre pas le pró-labore et les primes : le manque est pris sur la réserve.",
    );
  const remainder = Math.max(0, remainderRaw);
  const reserve = remainder * (n(settings.reserve_pct) / 100);
  const balance = remainder - reserve;
  const each = members.length ? balance / members.length : 0;

  const vehicleBy: Record<string, number> = {};
  // Forfait véhicule : remboursé au guide du tour (par défaut Luan, propriétaire des véhicules).
  for (const e of entries) {
    if (!e.vehicle_used) continue;
    const who = e.guide_id && memberIds.has(e.guide_id) ? e.guide_id : null;
    if (who) vehicleBy[who] = (vehicleBy[who] ?? 0) + n(settings.vehicle_fee);
  }

  const shares: MemberShare[] = members.map((m) => {
    const pro = n(settings.pro_labore);
    const g = guide[m.user_id] ?? 0;
    const a = apporteur[m.user_id] ?? 0;
    return {
      user_id: m.user_id,
      display_name: m.display_name,
      pro_labore: r2(pro),
      guide_bonus: r2(g),
      apporteur_bonus: r2(a),
      balance_share: r2(each),
      total: r2(pro + g + a + each),
      vehicle_refund: r2(vehicleBy[m.user_id] ?? 0),
    };
  });

  return {
    revenue: r2(revenue),
    taxes: r2(taxes),
    direct_costs: r2(direct_costs),
    margin: r2(margin),
    vehicle: r2(vehicle),
    pro_labore_total: r2(pro_labore_total),
    guide_bonus_total: r2(guide_bonus_total),
    apporteur_bonus_total: r2(apporteur_bonus_total),
    remainder: r2(remainder),
    reserve: r2(reserve),
    balance: r2(balance),
    unassigned_guide_margin: r2(unassigned_guide_margin),
    members: shares,
    shortfall: r2(shortfall),
    pending_count: pendingEntries.length,
    pending_by_currency,
    warnings,
  };
}

/** Premier et dernier jour (inclus) d'un mois « AAAA-MM ». */
export function monthBounds(month: string): { from: string; to: string } {
  const [y, m] = month.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}

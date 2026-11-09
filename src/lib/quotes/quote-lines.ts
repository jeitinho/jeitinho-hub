/** Règles pures des lignes de devis : totaux, marge estimée, différentiel d'enregistrement. */

export type QuoteLineLike = {
  id?: string;
  label: string;
  quantity: number;
  unit_price: number;
  is_offered: boolean;
  is_optional: boolean;
  /** Coût fournisseur unitaire (catalogue), si connu. */
  supplier_cost?: number | null;
};

export function lineAmount(l: QuoteLineLike): number {
  return l.is_offered ? 0 : (Number(l.quantity) || 0) * (Number(l.unit_price) || 0);
}

export function quoteTotals(
  lines: QuoteLineLike[],
  opts: { partySize?: number | null; depositPct?: number | null } = {},
) {
  const valid = lines.filter((l) => l.label.trim());
  const total = valid.filter((l) => !l.is_optional).reduce((a, l) => a + lineAmount(l), 0);
  const totalWithOptions = valid.reduce((a, l) => a + lineAmount(l), 0);
  const costed = valid.filter((l) => !l.is_optional && l.supplier_cost != null);
  const knownCost = costed.reduce(
    (a, l) => a + (Number(l.supplier_cost) || 0) * (Number(l.quantity) || 0),
    0,
  );
  const costedRevenue = costed.reduce((a, l) => a + lineAmount(l), 0);
  const pax = Number(opts.partySize) || 0;
  const deposit = Math.round(total * ((Number(opts.depositPct) || 0) / 100) * 100) / 100;
  return {
    total,
    totalWithOptions,
    hasOptions: valid.some((l) => l.is_optional),
    perPerson: pax > 0 ? Math.round((total / pax) * 100) / 100 : null,
    deposit,
    balance: Math.round((total - deposit) * 100) / 100,
    /** Marge sur les lignes dont le coût est connu, et part du total couverte par ce calcul. */
    estimatedMargin: costed.length ? Math.round((costedRevenue - knownCost) * 100) / 100 : null,
    marginCoverage: total > 0 ? costedRevenue / total : 0,
  };
}

/**
 * Différentiel d'enregistrement : on met à jour les lignes existantes, on insère les nouvelles
 * et on ne supprime que celles retirées — les identifiants restent stables (le planning du
 * voyage y est rattaché par quote_line_id).
 */
export function diffQuoteLines<T extends { id?: string }>(current: T[], persistedIds: string[]) {
  const keep = new Set(current.map((l) => l.id).filter((id): id is string => !!id));
  return {
    toUpdate: current.map((l, position) => ({ line: l, position })).filter((x) => !!x.line.id),
    toInsert: current.map((l, position) => ({ line: l, position })).filter((x) => !x.line.id),
    toDelete: persistedIds.filter((id) => !keep.has(id)),
  };
}

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

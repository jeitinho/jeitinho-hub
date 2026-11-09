/**
 * Économie d'un produit du catalogue (modèle Bókun « rates » : prix, coût, marge).
 * Même formule que la fiche produit : marge = prix − coût fournisseur − frais fixes − commission.
 * Coût inconnu (ni coût ni net fournisseur ni frais fixes) → marge non calculée : on n'invente rien.
 */
export type PricingInput = {
  price: number | null;
  supplierCost: number | null;
  supplierNet: number | null;
  fixedCost: number | null;
  commissionPct: number | null;
};

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === "" || Number.isNaN(Number(v)) ? null : Number(v);

export function unitEconomics(p: PricingInput): {
  costKnown: boolean;
  margin: number | null;
  rate: number | null;
} {
  const price = num(p.price);
  const cost = num(p.supplierCost) ?? num(p.supplierNet);
  const fixed = num(p.fixedCost);
  const costKnown = cost !== null || (fixed !== null && fixed > 0);
  if (price === null || !costKnown) return { costKnown, margin: null, rate: null };
  const commission = (price * (num(p.commissionPct) ?? 0)) / 100;
  const margin = Math.round((price - (cost ?? 0) - (fixed ?? 0) - commission) * 100) / 100;
  return { costKnown, margin, rate: price > 0 ? margin / price : null };
}

export type CatalogKind = "experience" | "service" | "ticket";

export type PricingRow = {
  key: string;
  kind: CatalogKind;
  id: string;
  title: string;
  group: string | null;
  currency: string;
  priceModel: string | null;
  price: number | null;
  supplierCost: number | null;
  supplierNet: number | null;
  fixedCost: number | null;
  commissionPct: number | null;
  published: boolean;
  /** Billets : secteurs (prix par secteur). */
  variants?: { id: string; label: string; price: number | null; cost?: number | null }[];
};

export function pricingSummary(rows: PricingRow[]) {
  const priced = rows.map((r) => ({ r, e: unitEconomics(r) }));
  const known = priced.filter((x) => x.e.rate !== null);
  return {
    total: rows.length,
    withoutCost: priced.filter((x) => !x.e.costKnown).length,
    withoutPrice: rows.filter((r) => r.price === null && !(r.variants ?? []).some((v) => v.price !== null)).length,
    negative: known.filter((x) => (x.e.margin ?? 0) < 0).length,
    avgRate: known.length ? known.reduce((a, x) => a + (x.e.rate ?? 0), 0) / known.length : null,
  };
}

export function matchesSearch(r: PricingRow, q: string): boolean {
  const n = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const needle = n(q.trim());
  return !needle || n(`${r.title} ${r.group ?? ""}`).includes(needle);
}

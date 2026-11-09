// Mirror of jeitinho.fr's src/lib/ticket-sale.ts: decides whether a ticket
// offer is bought online (Stripe) on jeitinho.fr or stays « sur demande »
// (WhatsApp / devis). Keep both files in sync.

export type SaleOffer = {
  is_published: boolean | null;
  is_active: boolean | null;
  pricing_model: string | null;
  currency: string | null;
  public_price: number | string | null;
  event_date: string | null;
};

export type SaleVariant = { public_price: number | string | null; is_active?: boolean | null };

export type SaleBlocker = "unpublished" | "on_request" | "currency" | "past" | "no_price";

export const ONLINE_PRICING_MODEL = "markup";
export const ON_REQUEST_PRICING_MODEL = "quote_only";

export const BLOCKER_LABELS: Record<SaleBlocker, string> = {
  unpublished: "Non publiée",
  on_request: "Sur demande",
  currency: "Prix hors euros",
  past: "Date passée",
  no_price: "Prix à renseigner",
};

function positive(value: number | string | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return false;
  const n = Number(value);
  return Number.isFinite(n) && n > 0;
}

export function rioToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

export function saleBlocker(offer: SaleOffer, variants: SaleVariant[], today: string = rioToday()): SaleBlocker | null {
  if (!offer.is_published || offer.is_active === false) return "unpublished";
  if (offer.pricing_model === ON_REQUEST_PRICING_MODEL) return "on_request";
  if ((offer.currency ?? "EUR").toUpperCase() !== "EUR") return "currency";
  if (offer.event_date && offer.event_date < today) return "past";
  const active = variants.filter((v) => v.is_active !== false);
  const hasPrice = active.length > 0 ? active.some((v) => positive(v.public_price)) : positive(offer.public_price);
  return hasPrice ? null : "no_price";
}

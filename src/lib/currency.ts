// Display-only currency conversion for the billetterie module. Stored
// amounts (ticket_offers.public_price, ticket_offer_variants.public_price)
// are entered and kept in EUR (see catalog-form.tsx / ticket-offer-variants-
// editor.tsx defaults) — this only affects how they're *shown*, mirroring
// jeitinho.fr's src/lib/currency.ts so both apps quote the same rates.

export type DisplayCurrency = "EUR" | "BRL";

// Same rates as jeitinho.fr's currency.ts — keep both in sync if refreshed.
export const RATES: Record<DisplayCurrency, number> = {
  EUR: 1,
  BRL: 5.92,
};

const LOCALES: Record<DisplayCurrency, string> = {
  EUR: "fr-FR",
  BRL: "pt-BR",
};

export function convertFromEur(amountEur: number, target: DisplayCurrency): number {
  return amountEur * RATES[target];
}

export function formatAmount(amount: number, currency: DisplayCurrency): string {
  return new Intl.NumberFormat(LOCALES[currency], { style: "currency", currency }).format(amount);
}

/** Converts an EUR amount and formats it in the target display currency in one step. */
export function displayEur(amountEur: number, target: DisplayCurrency): string {
  return formatAmount(convertFromEur(amountEur, target), target);
}

export const DISPLAY_CURRENCY_STORAGE_KEY = "jeitinho-hub:billetterie-display-currency";

export function loadDisplayCurrency(): DisplayCurrency {
  if (typeof window === "undefined") return "EUR";
  try {
    const stored = window.localStorage.getItem(DISPLAY_CURRENCY_STORAGE_KEY);
    return stored === "BRL" ? "BRL" : "EUR";
  } catch {
    return "EUR";
  }
}

export function saveDisplayCurrency(value: DisplayCurrency) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DISPLAY_CURRENCY_STORAGE_KEY, value);
  } catch {
    // ignore (private browsing, etc.)
  }
}

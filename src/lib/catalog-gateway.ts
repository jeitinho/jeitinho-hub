export type CatalogTable = "experiences" | "services" | "ticket_offers" | "ticket_offer_variants";

async function requestCatalog<T>(table: CatalogTable, init?: RequestInit, query?: Record<string, string>): Promise<T> {
  const params = new URLSearchParams({ table });
  for (const [key, value] of Object.entries(query ?? {})) params.set(key, value);
  const response = await fetch(`/api/catalog?${params.toString()}`, {
    credentials: "include",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => null) as T | { error?: { message?: string } } | null;
  if (!response.ok) throw new Error((body as any)?.error?.message ?? `Erreur catalogue (${response.status})`);
  return body as T;
}

export async function fetchCatalog<T = Record<string, unknown>>(
  table: CatalogTable,
  options?: { order?: string; ascending?: boolean },
): Promise<T[]> {
  const order = options?.order
    ? `${options.order}.${options.ascending === false ? "desc" : "asc"}`
    : table === "services"
      ? "group_slug.asc,title.asc"
      : "title.asc";
  return requestCatalog<T[]>(table, { method: "GET" }, { order });
}

export async function fetchCatalogItem<T = Record<string, unknown>>(
  table: CatalogTable,
  id: string,
): Promise<T> {
  return requestCatalog<T>(table, { method: "GET" }, { id });
}

export async function createCatalogItem<T = Record<string, unknown>>(table: CatalogTable, values: Record<string, unknown>): Promise<T> {
  const body = await requestCatalog<T[]>(table, { method: "POST", body: JSON.stringify({ values }) });
  if (!Array.isArray(body) || !body[0]) throw new Error("Création du catalogue impossible.");
  return body[0];
}

export async function updateCatalogItem<T = Record<string, unknown>>(table: CatalogTable, id: string, values: Record<string, unknown>): Promise<T> {
  const body = await requestCatalog<T[]>(table, { method: "PATCH", body: JSON.stringify({ id, values }) });
  if (!Array.isArray(body) || !body[0]) throw new Error("Mise à jour du catalogue impossible.");
  return body[0];
}

export async function deleteCatalogItem(table: CatalogTable, id: string): Promise<void> {
  await requestCatalog(table, { method: "DELETE", body: JSON.stringify({ id }) });
}

// Sector/price variants are scoped to a single ticket_offer_id — a separate
// small API from the generic fetchCatalog/createCatalogItem/etc above, which
// assume one flat, independently-listable table.
export async function fetchTicketOfferVariants<T = Record<string, unknown>>(ticketOfferId: string): Promise<T[]> {
  return requestCatalog<T[]>("ticket_offer_variants", { method: "GET" }, { order: "sort_order.asc", ticket_offer_id: ticketOfferId });
}

export async function createTicketOfferVariant<T = Record<string, unknown>>(values: Record<string, unknown>): Promise<T> {
  const body = await requestCatalog<T[]>("ticket_offer_variants", { method: "POST", body: JSON.stringify({ values }) });
  if (!Array.isArray(body) || !body[0]) throw new Error("Création du secteur impossible.");
  return body[0];
}

export async function updateTicketOfferVariant<T = Record<string, unknown>>(id: string, values: Record<string, unknown>): Promise<T> {
  const body = await requestCatalog<T[]>("ticket_offer_variants", { method: "PATCH", body: JSON.stringify({ id, values }) });
  if (!Array.isArray(body) || !body[0]) throw new Error("Mise à jour du secteur impossible.");
  return body[0];
}

export async function deleteTicketOfferVariant(id: string): Promise<void> {
  await requestCatalog("ticket_offer_variants", { method: "DELETE", body: JSON.stringify({ id }) });
}

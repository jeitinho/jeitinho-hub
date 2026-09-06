export type CatalogTable = "experiences" | "services" | "ticket_offers";

async function requestCatalog<T>(table: CatalogTable, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/catalog?table=${encodeURIComponent(table)}`, {
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
  return requestCatalog<T[]>(table, {
    method: "GET",
    headers: { "x-catalog-order": order },
  });
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

export type CatalogTable = "experiences" | "services" | "ticket_offers";

export async function fetchCatalog<T = Record<string, unknown>>(
  table: CatalogTable,
  options?: { order?: string; ascending?: boolean },
): Promise<T[]> {
  const params = new URLSearchParams({ table });
  if (options?.order) params.set("order", options.order);
  if (options?.ascending === false) params.set("ascending", "false");

  const response = await fetch(`/api/internal/catalog?${params.toString()}`, {
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.ok) throw new Error(body?.error || `Catalog gateway returned ${response.status}`);
  return Array.isArray(body.data) ? (body.data as T[]) : [];
}

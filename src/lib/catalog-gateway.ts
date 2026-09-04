import { supabase } from "@/integrations/supabase/client";

export type CatalogTable = "experiences" | "services" | "ticket_offers";

export async function fetchCatalog<T = Record<string, unknown>>(
  table: CatalogTable,
  options?: { order?: string; ascending?: boolean },
): Promise<T[]> {
  let query = supabase.from(table).select("*");
  if (options?.order) query = query.order(options.order, { ascending: options?.ascending !== false });
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as T[];
}

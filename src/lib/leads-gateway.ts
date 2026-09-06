export type LeadRecord = {
  id: string;
  source: string;
  status: "new" | "contacted" | "qualified" | "converted" | "lost" | "spam";
  name: string | null;
  email: string | null;
  phone: string | null;
  travel_start: string | null;
  travel_end: string | null;
  party_size: number | null;
  activities: string[];
  message: string | null;
  prospect_id: string | null;
  received_at: string;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

async function requestLeads<T>(init?: RequestInit, params?: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params);
  const response = await fetch(`/api/leads${query.size ? `?${query.toString()}` : ""}`, {
    credentials: "include",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => null) as T | { error?: { message?: string } } | null;
  if (!response.ok) throw new Error((body as any)?.error?.message ?? `Erreur leads (${response.status})`);
  return body as T;
}

export async function fetchLeads(): Promise<LeadRecord[]> {
  return requestLeads<LeadRecord[]>();
}

export async function createLead(values: Record<string, unknown>): Promise<LeadRecord> {
  const rows = await requestLeads<LeadRecord[]>({ method: "POST", body: JSON.stringify(values) });
  if (!rows[0]) throw new Error("Création du lead impossible.");
  return rows[0];
}

export async function updateLead(id: string, values: Record<string, unknown>): Promise<LeadRecord> {
  const rows = await requestLeads<LeadRecord[]>({ method: "PATCH", body: JSON.stringify({ id, values }) });
  if (!rows[0]) throw new Error("Mise à jour du lead impossible.");
  return rows[0];
}

export async function deleteLead(id: string): Promise<void> {
  await requestLeads({ method: "DELETE", body: JSON.stringify({ id }) });
}

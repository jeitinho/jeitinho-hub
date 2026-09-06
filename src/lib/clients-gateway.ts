export type ClientRecord = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  stage: string;
  source: string | null;
  notes: string | null;
  tags: string[];
  assigned_to: string | null;
  last_contact_at: string | null;
  created_at: string;
  updated_at: string;
  legal_type: "individual" | "company";
  company_name: string | null;
  siret: string | null;
  vat_number: string | null;
  billing_address: string | null;
};

export type ClientQuote = {
  id: string;
  number: string | null;
  reference: string | null;
  title: string;
  status: string;
  total_amount: number;
  currency: string;
  updated_at: string;
};

async function requestClients<T>(init?: RequestInit, params?: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params);
  const response = await fetch(`/api/clients${query.size ? `?${query.toString()}` : ""}`, {
    credentials: "include",
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
  const body = await response.json().catch(() => null) as T | { error?: { message?: string } } | null;
  if (!response.ok) throw new Error((body as any)?.error?.message ?? `Erreur clients (${response.status})`);
  return body as T;
}

export async function fetchClients(): Promise<ClientRecord[]> {
  return requestClients<ClientRecord[]>();
}

export async function fetchClient(id: string): Promise<ClientRecord> {
  const rows = await requestClients<ClientRecord[]>(undefined, { id });
  if (!rows[0]) throw new Error("Client introuvable.");
  return rows[0];
}

export async function fetchClientQuotes(id: string): Promise<ClientQuote[]> {
  return requestClients<ClientQuote[]>(undefined, { quotes_for: id });
}

export async function createClient(values: Record<string, unknown>): Promise<ClientRecord> {
  const rows = await requestClients<ClientRecord[]>({ method: "POST", body: JSON.stringify(values) });
  if (!rows[0]) throw new Error("Création du client impossible.");
  return rows[0];
}

export async function updateClient(id: string, values: Record<string, unknown>): Promise<ClientRecord> {
  const rows = await requestClients<ClientRecord[]>({ method: "PATCH", body: JSON.stringify({ id, values }) });
  if (!rows[0]) throw new Error("Mise à jour du client impossible.");
  return rows[0];
}

export async function deleteClient(id: string): Promise<void> {
  await requestClients({ method: "DELETE", body: JSON.stringify({ id }) });
}

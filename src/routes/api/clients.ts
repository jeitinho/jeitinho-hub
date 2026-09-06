import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/supabase-auth";

const SUPABASE_URL = "https://sxzdabtarlgozixcbzus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lCRfloaagzEBNlbvdspIcA_VCQfL6Cn";
const WRITE_ROLES = new Set(["admin", "manager"]);
const CLIENT_FIELDS = new Set([
  "full_name", "email", "phone", "status", "stage", "source", "notes", "tags", "assigned_to",
  "last_contact_at", "legal_type", "company_name", "siret", "vat_number", "billing_address",
]);

function headers(accessToken: string, extra?: Record<string, string>) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function cleanClientValues(input: unknown) {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(source).filter(([key]) => CLIENT_FIELDS.has(key)));
}

async function clearClientReferences(table: string, accessToken: string, clientId: string) {
  const restUrl = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  restUrl.searchParams.set("client_id", `eq.${clientId}`);
  const response = await fetch(restUrl, {
    method: "PATCH",
    headers: { ...headers(accessToken), Prefer: "return=minimal" },
    body: JSON.stringify({ client_id: null }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Impossible de dissocier le client de ${table}.`);
  }
}

async function clearClientTaskReferences(accessToken: string, clientId: string) {
  const restUrl = new URL(`${SUPABASE_URL}/rest/v1/crm_tasks`);
  restUrl.searchParams.set("client_id", `eq.${clientId}`);
  const response = await fetch(restUrl, {
    method: "PATCH",
    headers: { ...headers(accessToken), Prefer: "return=minimal" },
    body: JSON.stringify({ client_id: null }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Impossible de dissocier les tâches CRM du client.");
  }
}

async function handle({ request }: { request: Request }) {
  const current = await getCurrentUser(request);
  if (!current) return Response.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const quotesFor = url.searchParams.get("quotes_for");
  const baseHeaders = headers(current.session.access_token);

  if (request.method === "GET") {
    if (quotesFor) {
      const restUrl = new URL(`${SUPABASE_URL}/rest/v1/quotes`);
      restUrl.searchParams.set("select", "id,number,reference,title,status,total_amount,currency,updated_at");
      restUrl.searchParams.set("client_id", `eq.${quotesFor}`);
      restUrl.searchParams.set("order", "updated_at.desc");
      const response = await fetch(restUrl, { headers: baseHeaders });
      const body = await response.text();
      return new Response(body, { status: response.status, headers: { "content-type": "application/json" } });
    }

    const restUrl = new URL(`${SUPABASE_URL}/rest/v1/clients`);
    restUrl.searchParams.set("select", "*");
    restUrl.searchParams.set("order", "updated_at.desc");
    if (id) restUrl.searchParams.set("id", `eq.${id}`);
    const response = await fetch(restUrl, { headers: baseHeaders });
    const body = await response.text();
    return new Response(body, { status: response.status, headers: { "content-type": "application/json" } });
  }

  if (!Array.from(current.user.roles).some((role) => WRITE_ROLES.has(role))) {
    return Response.json({ data: null, error: { message: "Forbidden" } }, { status: 403 });
  }

  if (request.method === "POST") {
    const raw = await request.json().catch(() => null);
    const values = cleanClientValues(raw);
    if (typeof values.full_name !== "string" || !values.full_name.trim()) {
      return Response.json({ data: null, error: { message: "Le nom complet est obligatoire." } }, { status: 400 });
    }
    values.full_name = values.full_name.trim();
    if (!values.source) values.source = "manual";
    if (!values.status) values.status = "client";
    if (!values.stage) values.stage = "nouveau";
    const restUrl = new URL(`${SUPABASE_URL}/rest/v1/clients`);
    const response = await fetch(restUrl, {
      method: "POST",
      headers: { ...baseHeaders, Prefer: "return=representation" },
      body: JSON.stringify(values),
    });
    const body = await response.text();
    return new Response(body, { status: response.status, headers: { "content-type": "application/json" } });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const targetId = typeof body?.id === "string" && body.id ? body.id : id;
  if (!targetId) return Response.json({ data: null, error: { message: "Missing id" } }, { status: 400 });

  const restUrl = new URL(`${SUPABASE_URL}/rest/v1/clients`);
  restUrl.searchParams.set("id", `eq.${targetId}`);

  if (request.method === "PATCH") {
    const values = cleanClientValues(body?.values ?? {});
    const response = await fetch(restUrl, {
      method: "PATCH",
      headers: { ...baseHeaders, Prefer: "return=representation" },
      body: JSON.stringify(values),
    });
    const text = await response.text();
    return new Response(text, { status: response.status, headers: { "content-type": "application/json" } });
  }

  if (request.method === "DELETE") {
    try {
      // Keep historical business records and only remove their client relationship.
      // This also makes deletion work in environments where the historical FK
      // was created with NO ACTION instead of the intended SET NULL behavior.
      await Promise.all([
        clearClientReferences("prospects", current.session.access_token, targetId),
        clearClientReferences("quotes", current.session.access_token, targetId),
        clearClientReferences("trips", current.session.access_token, targetId),
        clearClientReferences("invoices", current.session.access_token, targetId),
        clearClientTaskReferences(current.session.access_token, targetId),
      ]);
    } catch (error) {
      return Response.json({
        data: null,
        error: { message: error instanceof Error ? error.message : "Impossible de supprimer les dépendances du client." },
      }, { status: 409 });
    }

    const response = await fetch(restUrl, {
      method: "DELETE",
      headers: { ...baseHeaders, Prefer: "return=minimal" },
    });
    const text = await response.text();
    return new Response(text, { status: response.status, headers: { "content-type": "application/json" } });
  }

  return Response.json({ data: null, error: { message: "Method not allowed" } }, { status: 405 });
}

export const Route = createFileRoute("/api/clients")({
  server: { handlers: { GET: handle, POST: handle, PATCH: handle, DELETE: handle } },
});

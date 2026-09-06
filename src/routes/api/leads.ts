import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/supabase-auth";

const SUPABASE_URL = "https://sxzdabtarlgozixcbzus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lCRfloaagzEBNlbvdspIcA_VCQfL6Cn";
const WRITE_ROLES = new Set(["admin", "manager"]);
const LEAD_FIELDS = new Set([
  "source", "status", "name", "email", "phone", "travel_start", "travel_end", "party_size",
  "activities", "message", "processed_at",
]);

function headers(accessToken: string, extra?: Record<string, string>) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

function cleanLeadValues(input: unknown) {
  const source = input && typeof input === "object" ? input as Record<string, unknown> : {};
  return Object.fromEntries(Object.entries(source).filter(([key]) => LEAD_FIELDS.has(key)));
}

async function handle({ request }: { request: Request }) {
  const current = await getCurrentUser(request);
  if (!current) return Response.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const baseHeaders = headers(current.session.access_token);

  if (request.method === "GET") {
    const restUrl = new URL(`${SUPABASE_URL}/rest/v1/leads`);
    restUrl.searchParams.set("select", "id,source,status,name,email,phone,travel_start,travel_end,party_size,activities,message,prospect_id,received_at,processed_at,created_at,updated_at");
    restUrl.searchParams.set("order", "received_at.desc");
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
    const values = cleanLeadValues(raw);
    if (typeof values.name !== "string" || !values.name.trim()) {
      return Response.json({ data: null, error: { message: "Le nom du lead est obligatoire." } }, { status: 400 });
    }
    values.name = values.name.trim();
    if (!values.source) values.source = "manual";
    if (!values.status) values.status = "new";
    const restUrl = new URL(`${SUPABASE_URL}/rest/v1/leads`);
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

  const restUrl = new URL(`${SUPABASE_URL}/rest/v1/leads`);
  restUrl.searchParams.set("id", `eq.${targetId}`);

  if (request.method === "PATCH") {
    const values = cleanLeadValues(body?.values ?? {});
    const response = await fetch(restUrl, {
      method: "PATCH",
      headers: { ...baseHeaders, Prefer: "return=representation" },
      body: JSON.stringify(values),
    });
    const text = await response.text();
    return new Response(text, { status: response.status, headers: { "content-type": "application/json" } });
  }

  if (request.method === "DELETE") {
    const response = await fetch(restUrl, { method: "DELETE", headers: { ...baseHeaders, Prefer: "return=minimal" } });
    const text = await response.text();
    return new Response(text, { status: response.status, headers: { "content-type": "application/json" } });
  }

  return Response.json({ data: null, error: { message: "Method not allowed" } }, { status: 405 });
}

export const Route = createFileRoute("/api/leads")({
  server: { handlers: { GET: handle, POST: handle, PATCH: handle, DELETE: handle } },
});

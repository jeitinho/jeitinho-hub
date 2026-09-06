import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/supabase-auth";

const SUPABASE_URL = "https://sxzdabtarlgozixcbzus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lCRfloaagzEBNlbvdspIcA_VCQfL6Cn";
const TABLES = new Set(["experiences", "services", "ticket_offers"]);

function headers(accessToken: string) {
  return {
    apikey: SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

async function handle({ request }: { request: Request }) {
  const current = await getCurrentUser(request);
  if (!current) return Response.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });

  const url = new URL(request.url);
  const table = url.searchParams.get("table") ?? "";
  if (!TABLES.has(table)) return Response.json({ data: null, error: { message: "Invalid catalog table" } }, { status: 400 });

  const restUrl = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  restUrl.searchParams.set("select", "*");

  if (request.method === "GET") {
    const id = url.searchParams.get("id");
    const order = url.searchParams.get("order") ?? "title.asc";
    const allowedOrders = new Set(["title.asc", "title.desc", "group_slug.asc,title.asc"]);
    if (id) restUrl.searchParams.set("id", `eq.${id}`);
    restUrl.searchParams.set("order", allowedOrders.has(order) ? order : "title.asc");
    const response = await fetch(restUrl, { headers: headers(current.session.access_token) });
    const body = await response.text();
    if (response.ok && id) {
      const rows = JSON.parse(body) as unknown[];
      if (!Array.isArray(rows) || rows.length !== 1) {
        return Response.json({ data: null, error: { message: "Catalogue item introuvable" } }, { status: 404 });
      }
      return Response.json(rows[0]);
    }
    return new Response(body, { status: response.status, headers: { "content-type": "application/json" } });
  }

  if (!current.user.roles.some((role) => ["admin", "manager", "redacteur_chef", "redacteur"].includes(role))) {
    return Response.json({ data: null, error: { message: "Forbidden" } }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ data: null, error: { message: "Invalid JSON" } }, { status: 400 });

  if (request.method === "POST") {
    const response = await fetch(restUrl, {
      method: "POST",
      headers: { ...headers(current.session.access_token), Prefer: "return=representation" },
      body: JSON.stringify(body.values ?? body),
    });
    const text = await response.text();
    return new Response(text, { status: response.status, headers: { "content-type": "application/json" } });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) return Response.json({ data: null, error: { message: "Missing id" } }, { status: 400 });
  restUrl.searchParams.set("id", `eq.${id}`);

  if (request.method === "PATCH") {
    const response = await fetch(restUrl, {
      method: "PATCH",
      headers: { ...headers(current.session.access_token), Prefer: "return=representation" },
      body: JSON.stringify(body.values ?? {}),
    });
    const text = await response.text();
    return new Response(text, { status: response.status, headers: { "content-type": "application/json" } });
  }

  if (request.method === "DELETE") {
    const response = await fetch(restUrl, {
      method: "DELETE",
      headers: { ...headers(current.session.access_token), Prefer: "return=minimal" },
    });
    const text = await response.text();
    return new Response(text, { status: response.status, headers: { "content-type": "application/json" } });
  }

  return Response.json({ data: null, error: { message: "Method not allowed" } }, { status: 405 });
}

export const Route = createFileRoute("/api/catalog")({
  server: { handlers: { GET: handle, POST: handle, PATCH: handle, DELETE: handle } },
});

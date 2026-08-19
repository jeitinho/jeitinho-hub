import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/public-config";
import type { Database } from "@/integrations/supabase/types";

const LOVABLE_CRM_URL = "https://jeitinho-heartbeat.lovable.app/api/internal/catalog";

function getBearer(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
}

async function requireManager(request: Request) {
  const token = getBearer(request);
  if (!token || token.split(".").length !== 3) throw new Response("Unauthorized", { status: 401 });

  const url = process.env.SUPABASE_URL || SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || SUPABASE_PUBLISHABLE_KEY;
  const supabase = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) throw new Response("Unauthorized", { status: 401 });

  const { data: canManage, error: roleError } = await supabase.rpc("can_manage", { _user_id: data.claims.sub });
  if (roleError || !canManage) throw new Response("Forbidden", { status: 403 });
}

async function proxy(request: Request, method: "GET" | "POST", body?: unknown) {
  const internalSecret = process.env.INTERNAL_PROCESS_SECRET;
  if (!internalSecret) return Response.json({ ok: false, error: "CRM proxy disabled" }, { status: 503 });

  const url = new URL(LOVABLE_CRM_URL);
  if (method === "GET") {
    const incoming = new URL(request.url);
    incoming.searchParams.forEach((value, key) => url.searchParams.set(key, value));
  }

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${internalSecret}`,
      ...(method === "POST" ? { "Content-Type": "application/json" } : {}),
    },
    ...(method === "POST" ? { body: JSON.stringify(body) } : {}),
  });

  const responseBody = await response.json().catch(() => ({ ok: false, error: "Invalid upstream response" }));
  if (!response.ok) {
    console.error("[api/public/crm] Lovable CRM endpoint failed", response.status, responseBody);
    return Response.json({ ok: false, error: responseBody?.error ?? "CRM upstream failed" }, { status: 502 });
  }

  return Response.json(responseBody, { status: response.status });
}

export const Route = createFileRoute("/api/public/crm")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          await requireManager(request);
          return proxy(request, "GET");
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[api/public/crm] GET failed", error);
          return Response.json({ ok: false, error: "CRM request failed" }, { status: 500 });
        }
      },
      POST: async ({ request }) => {
        try {
          await requireManager(request);
          const body = await request.json();
          return proxy(request, "POST", body);
        } catch (error) {
          if (error instanceof Response) return error;
          console.error("[api/public/crm] POST failed", error);
          return Response.json({ ok: false, error: "CRM request failed" }, { status: 500 });
        }
      },
    },
  },
});

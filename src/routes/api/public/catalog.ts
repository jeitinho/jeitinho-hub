import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/integrations/supabase/public-config";

const ALLOWED_TABLES = new Set(["experiences", "services", "ticket_offers"]);
const ALLOWED_ORDER_COLUMNS: Record<string, Set<string>> = {
  experiences: new Set(["title", "created_at", "updated_at"]),
  services: new Set(["group_slug", "title", "created_at", "updated_at"]),
  ticket_offers: new Set(["event_date", "title", "created_at", "updated_at"]),
};

// Production backend: Supabase Edge Function holds the private Supabase credential.
// Cloudflare/browser never receives the Supabase service-role key.
const CATALOG_READ_URL = `${SUPABASE_URL}/functions/v1/catalog-read`;

// Despite the /api/public/ path (kept to avoid a broader route rename), this
// endpoint returns supplier cost / commission / margin fields and unpublished
// drafts for the internal catalog admin UI (src/routes/_authenticated/experiences.tsx
// via src/lib/catalog-gateway.ts) — it is NOT consumed by jeitinho.fr. It must
// require a real Supabase session, mirroring requireSupabaseAuth.
async function requireCaller(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!token || token.split(".").length !== 3) return null;

  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return token;
}

export const Route = createFileRoute("/api/public/catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const token = await requireCaller(request);
        if (!token) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        const incoming = new URL(request.url);
        const table = incoming.searchParams.get("table") ?? "";
        const order = incoming.searchParams.get("order") ?? "";
        const ascending = incoming.searchParams.get("ascending") !== "false";

        if (!ALLOWED_TABLES.has(table)) {
          return Response.json({ ok: false, error: "Invalid table" }, { status: 400 });
        }
        if (order && !ALLOWED_ORDER_COLUMNS[table]?.has(order)) {
          return Response.json({ ok: false, error: "Invalid order column" }, { status: 400 });
        }

        try {
          const params = new URLSearchParams({ table, ...(order ? { order } : {}) });
          if (!ascending) params.set("ascending", "false");

          const response = await fetch(`${CATALOG_READ_URL}?${params.toString()}`, {
            headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          });
          const body = await response.json().catch(() => null);

          if (!response.ok || !body?.ok) {
            console.error("[api/public/catalog] edge function failed", response.status, body);
            return Response.json({ ok: false, error: body?.error || "Catalog read failed" }, { status: 502 });
          }

          return Response.json({ ok: true, table, data: Array.isArray(body.data) ? body.data : [] });
        } catch (error) {
          console.error("[api/public/catalog] edge function request failed", error);
          return Response.json({ ok: false, error: "Catalog read failed" }, { status: 502 });
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

// Internal catalog read endpoint. This route runs on the Lovable-hosted
// deployment, where SUPABASE_SERVICE_ROLE_KEY is available. It is never
// called directly by the browser; manager.jeitinho.fr proxies through it.
const ALLOWED_TABLES = new Set(["experiences", "services", "ticket_offers"]);
const ALLOWED_ORDER_COLUMNS: Record<string, Set<string>> = {
  experiences: new Set(["title", "created_at", "updated_at"]),
  services: new Set(["group_slug", "title", "created_at", "updated_at"]),
  ticket_offers: new Set(["event_date", "title", "created_at", "updated_at"]),
};

export const Route = createFileRoute("/api/internal/catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.INTERNAL_PROCESS_SECRET;
        if (!secret) {
          console.error("[internal/catalog] INTERNAL_PROCESS_SECRET is not configured");
          return Response.json({ ok: false, error: "Disabled" }, { status: 503 });
        }

        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        if (!token || token !== secret) {
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
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          let query = supabaseAdmin.from(table as any).select("*");

          if (order) {
            query = query.order(order, { ascending });
          }

          const { data, error } = await query;
          if (error) {
            console.error("[internal/catalog] Supabase read failed", {
              table,
              order,
              ascending,
              code: error.code,
              message: error.message,
            });
            return Response.json({ ok: false, error: "Catalog read failed" }, { status: 502 });
          }

          return Response.json({
            ok: true,
            table,
            data: Array.isArray(data) ? data : [],
          });
        } catch (err) {
          console.error("[internal/catalog] Supabase request failed:", err);
          return Response.json({ ok: false, error: "Catalog read failed" }, { status: 502 });
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";

// Read-only public catalog gateway.
// The browser never receives a Supabase key. The query runs server-side with
// the existing Supabase service-role client, exactly like other trusted server
// routes. This removes the dependency on the Lovable-hosted catalog-read
// endpoint while keeping the public catalog endpoint authentication-free.
const ALLOWED_TABLES = new Set(["experiences", "services", "ticket_offers"]);
const ALLOWED_ORDER_COLUMNS: Record<string, Set<string>> = {
  experiences: new Set(["title", "created_at", "updated_at"]),
  services: new Set(["group_slug", "title", "created_at", "updated_at"]),
  ticket_offers: new Set(["event_date", "title", "created_at", "updated_at"]),
};

export const Route = createFileRoute("/api/public/catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
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
          // Keep the service-role client out of the client bundle. The server
          // helper itself explicitly recommends a dynamic import from route files.
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          let query = supabaseAdmin.from(table as any).select("*");

          if (order) {
            query = query.order(order, { ascending });
          }

          const { data, error } = await query;

          if (error) {
            console.error("[api/public/catalog] Supabase read failed", {
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
          console.error("[api/public/catalog] Supabase request failed:", err);
          return Response.json({ ok: false, error: "Catalog read failed" }, { status: 502 });
        }
      },
    },
  },
});

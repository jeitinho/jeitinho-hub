import { createFileRoute } from "@tanstack/react-router";

// Read-only catalog gateway. The Hub runs on Cloudflare without the Supabase
// service-role key, so the actual query is delegated to the Lovable-hosted
// server endpoint that already has the working Supabase server credentials.
// The browser does not need Supabase authentication; the server-to-server hop
// remains protected by INTERNAL_PROCESS_SECRET.
const CATALOG_READ_URL = "https://jeitinho-heartbeat.lovable.app/api/internal/catalog-read";
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
        const secret = process.env.INTERNAL_PROCESS_SECRET;
        if (!secret) {
          console.error("[api/public/catalog] INTERNAL_PROCESS_SECRET is not configured");
          return Response.json({ ok: false, error: "Catalog gateway disabled" }, { status: 503 });
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

        const params = new URLSearchParams({ table });
        if (order) params.set("order", order);
        if (!ascending) params.set("ascending", "false");

        try {
          const res = await fetch(`${CATALOG_READ_URL}?${params.toString()}`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${secret}`,
            },
          });
          const body = await res.json().catch(() => null);
          if (!res.ok || !body?.ok) {
            console.error("[api/public/catalog] catalog-read responded", res.status, body);
            return Response.json({ ok: false, error: "Catalog read failed" }, { status: 502 });
          }
          return Response.json({ ok: true, table, data: Array.isArray(body.data) ? body.data : [] });
        } catch (err) {
          console.error("[api/public/catalog] catalog-read request failed:", err);
          return Response.json({ ok: false, error: "Catalog read failed" }, { status: 502 });
        }
      },
    },
  },
});

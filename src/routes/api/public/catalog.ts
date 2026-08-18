import { createFileRoute } from "@tanstack/react-router";

// Read-only catalog gateway for manager.jeitinho.fr.
// The Cloudflare deployment does not hold the private Supabase credential.
// Reads are therefore delegated to the Lovable-hosted deployment, which has
// the existing Supabase service-role credential. The browser never receives
// that credential.
const ALLOWED_TABLES = new Set(["experiences", "services", "ticket_offers"]);
const ALLOWED_ORDER_COLUMNS: Record<string, Set<string>> = {
  experiences: new Set(["title", "created_at", "updated_at"]),
  services: new Set(["group_slug", "title", "created_at", "updated_at"]),
  ticket_offers: new Set(["event_date", "title", "created_at", "updated_at"]),
};

const CATALOG_READ_URL = "https://jeitinho-heartbeat.lovable.app/api/internal/catalog";

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

        const internalSecret = process.env.INTERNAL_PROCESS_SECRET;
        if (!internalSecret) {
          console.error("[api/public/catalog] INTERNAL_PROCESS_SECRET is not configured");
          return Response.json({ ok: false, error: "Catalog gateway disabled" }, { status: 503 });
        }

        try {
          const params = new URLSearchParams({ table });
          if (order) params.set("order", order);
          if (!ascending) params.set("ascending", "false");

          const res = await fetch(`${CATALOG_READ_URL}?${params.toString()}`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${internalSecret}`,
            },
          });
          const body = await res.json().catch(() => null);

          if (!res.ok || !body?.ok) {
            console.error("[api/public/catalog] internal catalog responded", res.status, body);
            return Response.json({ ok: false, error: "Catalog read failed" }, { status: 502 });
          }

          return Response.json({
            ok: true,
            table,
            data: Array.isArray(body.data) ? body.data : [],
          });
        } catch (err) {
          console.error("[api/public/catalog] internal catalog request failed:", err);
          return Response.json({ ok: false, error: "Catalog read failed" }, { status: 502 });
        }
      },
    },
  },
});

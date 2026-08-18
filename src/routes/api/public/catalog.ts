import { createFileRoute } from "@tanstack/react-router";

const ALLOWED_TABLES = new Set(["experiences", "services", "ticket_offers"]);
const ALLOWED_ORDER_COLUMNS: Record<string, Set<string>> = {
  experiences: new Set(["title", "created_at", "updated_at"]),
  services: new Set(["group_slug", "title", "created_at", "updated_at"]),
  ticket_offers: new Set(["event_date", "title", "created_at", "updated_at"]),
};

// Production backend: Supabase Edge Function. No Supabase private key is kept in Cloudflare.
const CATALOG_READ_URL = "https://ltrshfejyjzpokexgnmb.supabase.co/functions/v1/catalog-read";

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
          return Response.json({ ok: false, error: "Catalog gateway disabled" }, { status: 503 });
        }

        try {
          const params = new URLSearchParams({ table, ...(order ? { order } : {}) });
          if (!ascending) params.set("ascending", "false");

          const response = await fetch(`${CATALOG_READ_URL}?${params.toString()}`, {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${internalSecret}`,
            },
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

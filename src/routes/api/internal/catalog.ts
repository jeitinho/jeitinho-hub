import { createFileRoute } from "@tanstack/react-router";
import { getBindings } from "@/lib/cloudflare-db";
import { getCurrentUser } from "@/lib/auth/cloudflare-auth";

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
        const db = getBindings().DB;
        const user = await getCurrentUser(db, request);
        if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        if (!(user.roles.includes("admin") || user.roles.includes("manager") || user.roles.includes("redacteur_chef") || user.roles.includes("redacteur"))) {
          return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
        }

        const incoming = new URL(request.url);
        const table = incoming.searchParams.get("table") ?? "";
        const order = incoming.searchParams.get("order") ?? "";
        const ascending = incoming.searchParams.get("ascending") !== "false";
        if (!ALLOWED_TABLES.has(table)) return Response.json({ ok: false, error: "Invalid table" }, { status: 400 });
        if (order && !ALLOWED_ORDER_COLUMNS[table]?.has(order)) return Response.json({ ok: false, error: "Invalid order column" }, { status: 400 });

        try {
          const orderSql = order ? ` ORDER BY ${order} ${ascending ? "ASC" : "DESC"}` : "";
          const rows = await db.prepare(`SELECT * FROM ${table}${orderSql}`).all<Record<string, unknown>>();
          return Response.json({ ok: true, table, data: rows.results ?? [] });
        } catch (error) {
          console.error("[internal/catalog] D1 read failed", error);
          return Response.json({ ok: false, error: "Catalog read failed" }, { status: 502 });
        }
      },
    },
  },
});

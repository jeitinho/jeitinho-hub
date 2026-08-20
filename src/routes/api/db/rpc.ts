import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/cloudflare-auth";
import { getBindings } from "@/lib/cloudflare-db";

export const Route = createFileRoute("/api/db/rpc")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const db = getBindings().DB;
        const user = await getCurrentUser(db, request);
        if (!user) return Response.json({ data: null, error: { message: "Unauthorized" } }, { status: 401 });
        const body = await request.json().catch(() => null) as { fn?: string; args?: Record<string, unknown> } | null;
        const fn = body?.fn;
        const args = body?.args ?? {};
        const isManager = user.roles.includes("admin") || user.roles.includes("manager");

        try {
          switch (fn) {
            case "convert_prospect_to_client": {
              if (!isManager) return Response.json({ data: null, error: { message: "Forbidden" } }, { status: 403 });
              const prospectId = String(args.p_prospect_id ?? "");
              const prospect = await db.prepare("SELECT * FROM prospects WHERE id = ? LIMIT 1").bind(prospectId).first<Record<string, unknown>>();
              if (!prospect) return Response.json({ data: null, error: { message: "Prospect introuvable" } }, { status: 404 });
              if (prospect.client_id) return Response.json({ data: prospect.client_id, error: null });
              const clientId = crypto.randomUUID();
              await db.batch([
                db.prepare("INSERT INTO clients (id,full_name,email,phone,status,stage,source,notes,tags,assigned_to,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
                  .bind(clientId, prospect.name, prospect.email ?? null, prospect.phone ?? null, "client", "nouveau", prospect.source ?? "jeitinho.fr", prospect.notes ?? null, prospect.metadata ?? "[]", prospect.owner_id ?? user.id, new Date().toISOString(), new Date().toISOString()),
                db.prepare("UPDATE prospects SET client_id = ?, status = ?, updated_at = ? WHERE id = ?")
                  .bind(clientId, "won", new Date().toISOString(), prospectId),
              ]);
              return Response.json({ data: clientId, error: null });
            }
            case "convert_accepted_quote_to_trip": {
              if (!isManager) return Response.json({ data: null, error: { message: "Forbidden" } }, { status: 403 });
              const quoteId = String(args.p_quote_id ?? "");
              const quote = await db.prepare("SELECT * FROM quotes WHERE id = ? LIMIT 1").bind(quoteId).first<Record<string, unknown>>();
              if (!quote) return Response.json({ data: null, error: { message: "Devis introuvable" } }, { status: 404 });
              if (quote.status !== "accepted") return Response.json({ data: null, error: { message: "Le devis doit être accepté" } }, { status: 409 });
              const tripId = crypto.randomUUID();
              const now = new Date().toISOString();
              const ref = `TRIP-${new Date().getFullYear()}-${tripId.slice(0, 8).toUpperCase()}`;
              await db.prepare(
                "INSERT INTO trips (id,reference,title,client_id,status,start_date,end_date,notes,created_by,created_at,updated_at,quote_id,currency,quoted_amount,metadata) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)"
              ).bind(tripId, ref, quote.title ?? "Voyage JEITINHO", quote.client_id ?? null, "draft", quote.period_start ?? null, quote.period_end ?? null, quote.notes ?? null, user.id, now, now, quoteId, quote.currency ?? "EUR", quote.total_amount ?? 0, quote.metadata ?? "{}").run();
              return Response.json({ data: tripId, error: null });
            }
            case "next_quote_number": {
              if (!isManager) return Response.json({ data: null, error: { message: "Forbidden" } }, { status: 403 });
              const year = Number(args.p_year ?? new Date().getFullYear());
              const existing = await db.prepare("SELECT next_number FROM quote_number_sequences WHERE year = ? LIMIT 1").bind(year).first<{ next_number: number }>();
              const next = existing?.next_number ?? 1;
              await db.prepare("INSERT INTO quote_number_sequences (year,next_number,updated_at) VALUES (?,?,?) ON CONFLICT(year) DO UPDATE SET next_number=excluded.next_number,updated_at=excluded.updated_at")
                .bind(year, next + 1, new Date().toISOString()).run();
              return Response.json({ data: `DEV-${year}-${String(next).padStart(4, "0")}`, error: null });
            }
            case "next_trip_reference": {
              if (!isManager) return Response.json({ data: null, error: { message: "Forbidden" } }, { status: 403 });
              const year = Number(args.p_year ?? new Date().getFullYear());
              const existing = await db.prepare("SELECT next_number FROM trip_number_sequences WHERE year = ? LIMIT 1").bind(year).first<{ next_number: number }>();
              const next = existing?.next_number ?? 1;
              await db.prepare("INSERT INTO trip_number_sequences (year,next_number,updated_at) VALUES (?,?,?) ON CONFLICT(year) DO UPDATE SET next_number=excluded.next_number,updated_at=excluded.updated_at")
                .bind(year, next + 1, new Date().toISOString()).run();
              return Response.json({ data: `TRIP-${year}-${String(next).padStart(4, "0")}`, error: null });
            }
            default:
              return Response.json({ data: null, error: { message: `RPC inconnue: ${fn ?? ""}` } }, { status: 404 });
          }
        } catch (error) {
          console.error("[db/rpc]", error);
          return Response.json({ data: null, error: { message: error instanceof Error ? error.message : "RPC failed" } }, { status: 400 });
        }
      },
    },
  },
});

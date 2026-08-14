import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Point d'entrée unique pour les leads générés sur les sites JEITINHO
// (jeitinho.fr, futurs sites de l'écosystème). Protégé par un secret
// partagé (Bearer) — jamais de policy RLS publique.
//
// The actual Supabase insert is delegated to /api/internal/process-lead on
// jeitinho-heartbeat.lovable.app, because this Cloudflare Worker
// (manager.jeitinho.fr) does not have a working SUPABASE_SERVICE_ROLE_KEY
// for this project — same class of fix applied on jeitinho.fr's side.
//
// Voir jeitinho/jeitinho: src/lib/forms.functions.ts (appelant) et
// src/lib/notify.ts (le TODO "wire to /api/public/notify endpoint" —
// c'est cet endpoint, câblé directement dans les server fn plutôt que
// via le dispatcher client-side `dispatch()`, pour garder le secret
// côté serveur).

const LeadPayloadSchema = z.object({
  source: z.string().trim().min(1).max(80),
  external_ref: z.string().trim().max(200).nullish(),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254).nullish(),
  phone: z.string().trim().max(40).nullish(),
  party_size: z.number().int().min(1).max(500).nullish(),
  travel_start: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  travel_end: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  activities: z.array(z.string().trim().max(200)).max(50).nullish(),
  message: z.string().trim().max(4000).nullish(),
  raw_payload: z.record(z.string(), z.unknown()).nullish(),
});

const PROCESS_LEAD_URL = "https://jeitinho-heartbeat.lovable.app/api/internal/process-lead";

export const Route = createFileRoute("/api/public/leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.LEADS_INGEST_SECRET;
        if (!secret) {
          console.error("[api/public/leads] LEADS_INGEST_SECRET is not configured");
          return Response.json({ ok: false, error: "Leads ingestion disabled" }, { status: 503 });
        }
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        if (!token || token !== secret) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        let json: unknown;
        try {
          json = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = LeadPayloadSchema.safeParse(json);
        if (!parsed.success) {
          return Response.json({ ok: false, error: "Invalid payload", issues: parsed.error.issues }, { status: 422 });
        }

        const internalSecret = process.env.INTERNAL_PROCESS_SECRET;
        if (!internalSecret) {
          console.error("[api/public/leads] INTERNAL_PROCESS_SECRET is not configured");
          return Response.json({ ok: false, error: "Leads ingestion disabled" }, { status: 503 });
        }

        try {
          const res = await fetch(PROCESS_LEAD_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${internalSecret}` },
            body: JSON.stringify(parsed.data),
          });
          const body = await res.json().catch(() => null);
          if (!res.ok || !body?.ok) {
            console.error("[api/public/leads] process-lead responded", res.status, body);
            return Response.json({ ok: false, error: "Insert failed" }, { status: 500 });
          }
          return Response.json({ ok: true, id: body.id }, { status: 201 });
        } catch (err) {
          console.error("[api/public/leads] process-lead request failed:", err);
          return Response.json({ ok: false, error: "Insert failed" }, { status: 500 });
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Point d'entrée unique pour les leads générés sur les sites JEITINHO
// (jeitinho.fr, futurs sites de l'écosystème). Protégé par un secret
// partagé (Bearer) — jamais de policy RLS publique, l'insert passe par
// supabaseAdmin (service role) une fois le secret vérifié.
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
        const lead = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("leads")
          .insert({
            source: lead.source,
            external_ref: lead.external_ref ?? null,
            name: lead.name,
            email: lead.email ?? null,
            phone: lead.phone ?? null,
            party_size: lead.party_size ?? null,
            travel_start: lead.travel_start ?? null,
            travel_end: lead.travel_end ?? null,
            activities: lead.activities ?? [],
            message: lead.message ?? null,
            raw_payload: (lead.raw_payload ?? {}) as never,
          })
          .select("id")
          .single();

        if (error) {
          console.error("[api/public/leads] insert failed:", error);
          return Response.json({ ok: false, error: "Insert failed" }, { status: 500 });
        }

        return Response.json({ ok: true, id: data.id }, { status: 201 });
      },
    },
  },
});

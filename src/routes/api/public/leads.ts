import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// Public, signed intake endpoint for leads pushed from external sites
// (jeitinho.fr's `syncLeadToHub`, and later blog.jeitinho.fr). Was the
// #1 item on ARCHITECTURE.md's "points de reprise" backlog — never
// implemented, which is why the sync from jeitinho.fr always failed.
//
// Auth: shared-secret Bearer token (JEITINHO_HUB_LEADS_SECRET), must
// match the value configured as JEITINHO_HUB_LEADS_SECRET in the
// jeitinho.fr environment. Not a Supabase JWT — this is a
// server-to-server call, not a browser call.
//
// Writes only to `leads` (the raw intake table) — never to
// `prospects`/`clients`, so a malformed or duplicate push can't
// corrupt the worked CRM pipeline. Triage into `prospects` stays a
// manual/separate step.

const LeadPayloadSchema = z.object({
  source: z.string().trim().min(1).max(200),
  external_ref: z.string().trim().max(200).nullish(),
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(254).nullish(),
  phone: z.string().trim().max(40).nullish(),
  party_size: z.number().int().min(0).max(500).nullish(),
  travel_start: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  travel_end: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  activities: z.array(z.string().trim().max(200)).max(100).nullish(),
  message: z.string().trim().max(4000).nullish(),
  raw_payload: z.record(z.string(), z.unknown()).nullish(),
});

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export const Route = createFileRoute("/api/public/leads")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedSecret = process.env.JEITINHO_HUB_LEADS_SECRET;
        if (!expectedSecret) {
          console.error("[api/public/leads] JEITINHO_HUB_LEADS_SECRET not configured");
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }

        const authHeader = request.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.slice("Bearer ".length).trim();
        if (!timingSafeEqual(token, expectedSecret)) {
          return Response.json({ error: "Forbidden" }, { status: 403 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid JSON body" }, { status: 400 });
        }

        const parsed = LeadPayloadSchema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { error: "Invalid payload", details: parsed.error.flatten() },
            { status: 400 },
          );
        }
        const lead = parsed.data;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: inserted, error } = await supabaseAdmin
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
            raw_payload: lead.raw_payload ?? {},
          })
          .select("id")
          .single();

        if (error) {
          console.error("[api/public/leads] insert failed:", error);
          return Response.json({ error: "Insert failed" }, { status: 500 });
        }

        return Response.json({ ok: true, id: inserted.id }, { status: 201 });
      },
    },
  },
});

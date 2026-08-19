import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { scoreLead, firstActionDelayHours } from "@/lib/crm/scoring";
import { estimateValue } from "@/lib/crm/valuation";

// Public ingestion endpoint for the JEITINHO ecosystem.
// The caller authenticates with LEADS_INGEST_SECRET; the actual DB write is
// performed here with the server-only Supabase service-role client so RLS
// cannot block trusted server-to-server lead ingestion.

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
  campaign: z.string().trim().max(200).nullish(),
  utm_source: z.string().trim().max(200).nullish(),
  utm_medium: z.string().trim().max(200).nullish(),
  utm_campaign: z.string().trim().max(200).nullish(),
  utm_content: z.string().trim().max(200).nullish(),
  utm_term: z.string().trim().max(200).nullish(),
  request_type: z.string().trim().max(80).nullish(),
  raw_payload: z.record(z.string(), z.unknown()).nullish(),
});

const LEAD_SELECT =
  "id,name,email,phone,source,campaign,request_type,status,party_size,travel_start,travel_end,activities,message,received_at,prospect_id,score,priority,score_breakdown,estimated_value,pipeline_stage,next_action,next_action_at,last_contact_at";

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

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const lead = parsed.data;

          if (lead.source && lead.external_ref) {
            const { data: existing, error: lookupError } = await supabaseAdmin
              .from("leads")
              .select("id")
              .eq("source", lead.source)
              .eq("external_ref", lead.external_ref)
              .maybeSingle();
            if (lookupError) {
              console.error("[api/public/leads] idempotency lookup failed:", lookupError);
              return Response.json({ ok: false, error: "Idempotency lookup failed" }, { status: 500 });
            }
            if (existing?.id) return Response.json({ ok: true, id: existing.id, deduplicated: true }, { status: 200 });
          }

          const receivedAt = new Date().toISOString();
          const scoreInput = {
            received_at: receivedAt,
            travel_start: lead.travel_start ?? null,
            travel_end: lead.travel_end ?? null,
            party_size: lead.party_size ?? null,
            email: lead.email ?? null,
            phone: lead.phone ?? null,
            message: lead.message ?? null,
            activities: lead.activities ?? [],
            source: lead.source,
            campaign: lead.campaign ?? lead.utm_campaign ?? null,
            request_type: lead.request_type ?? null,
          };
          const scored = scoreLead(scoreInput);
          const highSeason = scored.breakdown.labels.some((label) => label.startsWith("Haute saison"));
          const nextActionAt = new Date(Date.now() + firstActionDelayHours(scored.priority) * 3_600_000).toISOString();

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
              raw_payload: lead.raw_payload ?? {},
              campaign: lead.campaign ?? lead.utm_campaign ?? null,
              utm_source: lead.utm_source ?? null,
              utm_medium: lead.utm_medium ?? null,
              utm_campaign: lead.utm_campaign ?? null,
              utm_content: lead.utm_content ?? null,
              utm_term: lead.utm_term ?? null,
              request_type: lead.request_type ?? null,
              score: scored.score,
              priority: scored.priority,
              score_breakdown: scored.breakdown,
              estimated_value: estimateValue({ ...scoreInput, highSeason }),
              next_action: "Premier contact WhatsApp",
              next_action_at: nextActionAt,
            })
            .select(LEAD_SELECT)
            .single();

          if (error) {
            if (error.code === "23505" && lead.source && lead.external_ref) {
              const { data: existing } = await supabaseAdmin
                .from("leads")
                .select("id")
                .eq("source", lead.source)
                .eq("external_ref", lead.external_ref)
                .maybeSingle();
              if (existing?.id) return Response.json({ ok: true, id: existing.id, deduplicated: true }, { status: 200 });
            }
            console.error("[api/public/leads] Supabase insert failed:", error);
            return Response.json({ ok: false, error: "Insert failed" }, { status: 500 });
          }

          return Response.json({ ok: true, id: data.id, deduplicated: false }, { status: 201 });
        } catch (err) {
          console.error("[api/public/leads] insert threw:", err);
          return Response.json({ ok: false, error: "Insert failed" }, { status: 500 });
        }
      },
    },
  },
});

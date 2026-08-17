import { createFileRoute } from "@tanstack/react-router";
import { scoreLead, firstActionDelayHours } from "@/lib/crm/scoring";
import { estimateValue } from "@/lib/crm/valuation";

// Internal endpoint: performs the actual Supabase insert into `leads`.
// Exists because the Cloudflare Worker deployment of this app
// (manager.jeitinho.fr) does not have a SUPABASE_SERVICE_ROLE_KEY for this
// project, while this app's own Lovable-hosted deployment
// (jeitinho-heartbeat.lovable.app) does. src/routes/api/public/leads.ts
// (the external-facing endpoint jeitinho.fr calls) validates the external
// secret + payload locally, then forwards to this endpoint on
// jeitinho-heartbeat.lovable.app to do the actual Supabase write. Protected
// by a separate internal secret.
export const Route = createFileRoute("/api/internal/process-lead")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.INTERNAL_PROCESS_SECRET;
        if (!secret) {
          console.error("[process-lead] INTERNAL_PROCESS_SECRET is not configured");
          return Response.json({ ok: false, error: "Disabled" }, { status: 503 });
        }
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
        if (!token || token !== secret) {
          return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        }

        let lead: any;
        try {
          lead = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const raw = (lead.raw_payload ?? {}) as Record<string, unknown>;
          const pick = (k: string) => {
            const v = lead[k] ?? raw[k];
            return typeof v === "string" && v.trim() ? v.trim() : null;
          };
          const receivedAt = new Date().toISOString();
          const enrich = {
            source: lead.source,
            campaign: pick("campaign") ?? pick("utm_campaign"),
            utm_source: pick("utm_source"),
            utm_medium: pick("utm_medium"),
            utm_campaign: pick("utm_campaign"),
            utm_content: pick("utm_content"),
            utm_term: pick("utm_term"),
            request_type: pick("request_type"),
          };
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
            campaign: enrich.campaign,
            request_type: enrich.request_type,
          };
          const scored = scoreLead(scoreInput);
          const nextActionAt = new Date(
            Date.now() + firstActionDelayHours(scored.priority) * 3_600_000,
          ).toISOString();

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
              campaign: enrich.campaign,
              utm_source: enrich.utm_source,
              utm_medium: enrich.utm_medium,
              utm_campaign: enrich.utm_campaign,
              utm_content: enrich.utm_content,
              utm_term: enrich.utm_term,
              request_type: enrich.request_type,
              score: scored.score,
              priority: scored.priority,
              score_breakdown: scored.breakdown as never,
              estimated_value: estimateValue({
                ...scoreInput,
                highSeason: scored.breakdown.labels.some((l) => l.startsWith("Haute saison")),
              }),
              next_action: "Premier contact WhatsApp",
              next_action_at: nextActionAt,
            })
            .select("id")
            .single();

          if (error) {
            console.error("[process-lead] insert failed:", error);
            return Response.json({ ok: false, error: "Insert failed" }, { status: 500 });
          }
          return Response.json({ ok: true, id: data.id }, { status: 201 });
        } catch (err) {
          console.error("[process-lead] threw:", err);
          return Response.json({ ok: false, error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});

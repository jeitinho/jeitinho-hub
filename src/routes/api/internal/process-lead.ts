import { createFileRoute } from "@tanstack/react-router";
import { scoreLead, firstActionDelayHours } from "@/lib/crm/scoring";
import { estimateValue } from "@/lib/crm/valuation";

// Internal endpoint: performs the actual Supabase insert into `leads`.
// It keeps the historical { formType, data } contract used by the public
// jeitinho.fr forms, while also accepting the newer flat lead payload used by
// /api/public/leads. The CRM itself remains on the Lovable Supabase backend.
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

        let body: any;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
        }

        // Historical form contract: { formType, data }.
        // Normalize it to the current CRM lead shape instead of changing the
        // caller or moving the CRM back to another database.
        let lead = body;
        if (body?.formType && body?.data) {
          const data = body.data ?? {};
          const formType = String(body.formType);
          const parsePartySize = (value: unknown): number | null => {
            const match = String(value ?? "").match(/\d+/);
            return match ? Number(match[0]) : null;
          };

          if (formType === "reservations") {
            lead = {
              source: "jeitinho.fr/reservation",
              name: `${data.prenom ?? ""} ${data.nom ?? ""}`.trim(),
              email: data.email ?? null,
              phone: data.telephone ?? null,
              party_size: typeof data.nb_voyageurs === "number" ? data.nb_voyageurs : parsePartySize(data.nb_voyageurs),
              travel_start: data.date_souhaitee ?? null,
              activities: [data.experience, data.categorie].filter(Boolean),
              message: data.message ?? null,
              raw_payload: data,
              request_type: "reservation",
            };
          } else if (formType === "devis_nordeste") {
            lead = {
              source: "jeitinho.fr/nordeste",
              name: `${data.prenom ?? ""} ${data.nom ?? ""}`.trim(),
              email: data.email ?? null,
              phone: data.telephone ?? null,
              party_size: parsePartySize(data.nb_voyageurs),
              travel_start: data.date_depart ?? null,
              activities: data.activites ?? [],
              message: data.message ?? null,
              raw_payload: data,
              request_type: "devis_nordeste",
            };
          } else if (formType === "trouver_jeitinho") {
            lead = {
              source: "jeitinho.fr/trouver-jeitinho",
              name: data.prenom ?? "",
              email: data.email ?? null,
              phone: data.telephone ?? null,
              party_size: parsePartySize(data.nb_voyageurs),
              travel_start: null,
              activities: data.interets ?? [],
              message: data.extras?.voyageIdeal ?? null,
              raw_payload: data,
              request_type: "trouver_jeitinho",
            };
          } else if (formType === "bookings") {
            lead = {
              source: "jeitinho.fr/mon-voyage",
              external_ref: data.reference ?? null,
              name: `${data.prenom ?? ""} ${data.nom ?? ""}`.trim(),
              email: data.email ?? null,
              phone: data.telephone ?? null,
              party_size: parsePartySize(data.nb_travelers),
              travel_start: null,
              activities: (data.items ?? []).map((item: any) => item.title).filter(Boolean),
              message: null,
              raw_payload: data,
              request_type: "booking",
            };
          } else {
            return Response.json({ ok: false, error: "Unknown formType" }, { status: 400 });
          }
        }

        if (!lead || typeof lead !== "object") {
          return Response.json({ ok: false, error: "Invalid lead payload" }, { status: 400 });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const raw = (lead.raw_payload ?? {}) as Record<string, unknown>;
          const pick = (k: string) => {
            const v = lead[k] ?? raw[k];
            return typeof v === "string" && v.trim() ? v.trim() : null;
          };
          const source = typeof lead.source === "string" ? lead.source.trim() : "";
          const externalRef = typeof lead.external_ref === "string" ? lead.external_ref.trim() : "";

          if (!source || !lead.name) {
            return Response.json({ ok: false, error: "Missing lead source/name" }, { status: 400 });
          }

          // Idempotency for callers that provide a stable external reference
          // (currently bookings). The unique partial index in Supabase is the
          // final race-safe guard; this lookup makes the common retry path cheap.
          if (source && externalRef) {
            const { data: existing, error: lookupError } = await supabaseAdmin
              .from("leads")
              .select("id")
              .eq("source", source)
              .eq("external_ref", externalRef)
              .maybeSingle();
            if (lookupError) {
              console.error("[process-lead] idempotency lookup failed:", lookupError);
              return Response.json({ ok: false, error: "Idempotency lookup failed" }, { status: 500 });
            }
            if (existing?.id) {
              return Response.json({ ok: true, id: existing.id, deduplicated: true }, { status: 200 });
            }
          }

          const receivedAt = new Date().toISOString();
          const enrich = {
            source,
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
            source: enrich.source,
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
              source: enrich.source,
              external_ref: externalRef || null,
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
            if (error.code === "23505" && source && externalRef) {
              const { data: existing, error: lookupError } = await supabaseAdmin
                .from("leads")
                .select("id")
                .eq("source", source)
                .eq("external_ref", externalRef)
                .maybeSingle();
              if (!lookupError && existing?.id) {
                return Response.json({ ok: true, id: existing.id, deduplicated: true }, { status: 200 });
              }
            }
            console.error("[process-lead] insert failed:", error);
            return Response.json({ ok: false, error: "Insert failed" }, { status: 500 });
          }
          return Response.json({ ok: true, id: data.id, deduplicated: false }, { status: 201 });
        } catch (err) {
          console.error("[process-lead] threw:", err);
          return Response.json({ ok: false, error: "Internal error" }, { status: 500 });
        }
      },
    },
  },
});
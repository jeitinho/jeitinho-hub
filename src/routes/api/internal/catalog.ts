import { createFileRoute } from "@tanstack/react-router";

// Internal endpoint used by the Hub to access the Lovable-owned data domains.
// The Lovable deployment has SUPABASE_SERVICE_ROLE_KEY and is the source of
// truth for CRM leads/prospects/clients. The Hub never receives that key.
const ALLOWED_TABLES = new Set(["experiences", "services", "ticket_offers", "leads", "prospects", "clients"]);
const ALLOWED_ORDER_COLUMNS: Record<string, Set<string>> = {
  experiences: new Set(["title", "created_at", "updated_at"]),
  services: new Set(["group_slug", "title", "created_at", "updated_at"]),
  ticket_offers: new Set(["event_date", "title", "created_at", "updated_at"]),
  leads: new Set(["score", "received_at", "created_at", "updated_at"]),
  prospects: new Set(["created_at", "updated_at"]),
  clients: new Set(["created_at", "updated_at"]),
};

const CRM_LEAD_SELECT =
  "id,name,email,phone,source,campaign,request_type,status,party_size,travel_start,travel_end,activities,message,received_at,prospect_id,score,priority,score_breakdown,estimated_value,pipeline_stage,next_action,next_action_at,last_contact_at";
const CRM_PROSPECT_SELECT =
  "id,status,name,email,phone,party_size,travel_start,travel_end,client_id,created_at,activities,message,source,score,priority,estimated_value,pipeline_stage,next_action,next_action_at,last_contact_at";
const CRM_CLIENT_SELECT =
  "id,full_name,email,phone,stage,status,last_contact_at,updated_at,created_at,source,notes,tags";

function getToken(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  return authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
}

async function readTable(table: string, order: string, ascending: boolean) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const select =
    table === "leads" ? CRM_LEAD_SELECT :
    table === "prospects" ? CRM_PROSPECT_SELECT :
    table === "clients" ? CRM_CLIENT_SELECT : "*";

  let query = supabaseAdmin.from(table as never).select(select);
  if (order) query = query.order(order, { ascending });

  const { data, error } = await query;
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

async function updateLead(body: Record<string, unknown>) {
  const id = typeof body.id === "string" ? body.id : "";
  if (!id) throw new Error("Lead id is required");

  const allowed = new Set([
    "status",
    "processed_at",
    "score",
    "priority",
    "score_breakdown",
    "estimated_value",
    "pipeline_stage",
    "last_contact_at",
    "next_action",
    "next_action_at",
  ]);
  const patch = Object.fromEntries(Object.entries(body.patch ?? {}).filter(([key]) => allowed.has(key)));
  if (!Object.keys(patch).length) throw new Error("No allowed lead fields provided");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.from("leads").update(patch).eq("id", id).select(CRM_LEAD_SELECT).single();
  if (error) throw error;
  return data;
}

async function qualifyLead(body: Record<string, unknown>) {
  const leadId = typeof body.leadId === "string" ? body.leadId : "";
  if (!leadId) throw new Error("Lead id is required");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: lead, error: leadError } = await supabaseAdmin
    .from("leads")
    .select("id,name,email,phone,party_size,travel_start,travel_end,activities,message,source,prospect_id,status")
    .eq("id", leadId)
    .single();
  if (leadError) throw leadError;
  if (lead.prospect_id) return { prospect_id: lead.prospect_id, deduplicated: true };

  const { data: prospect, error: prospectError } = await supabaseAdmin
    .from("prospects")
    .insert({
      name: lead.name ?? "Lead sans nom",
      email: lead.email,
      phone: lead.phone,
      party_size: lead.party_size,
      travel_start: lead.travel_start,
      travel_end: lead.travel_end,
      activities: lead.activities ?? [],
      message: lead.message,
      source: lead.source,
      status: "new",
      pipeline_stage: "nouveau",
    })
    .select("id")
    .single();
  if (prospectError) throw prospectError;

  const { error: updateError } = await supabaseAdmin
    .from("leads")
    .update({ status: "qualified", prospect_id: prospect.id, processed_at: new Date().toISOString() })
    .eq("id", lead.id);

  if (updateError) {
    await supabaseAdmin.from("prospects").delete().eq("id", prospect.id);
    throw updateError;
  }

  return { prospect_id: prospect.id, deduplicated: false };
}

async function convertProspect(body: Record<string, unknown>) {
  const prospectId = typeof body.prospectId === "string" ? body.prospectId : "";
  if (!prospectId) throw new Error("Prospect id is required");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: prospect, error: prospectError } = await supabaseAdmin
    .from("prospects")
    .select("id,name,email,phone,client_id,status")
    .eq("id", prospectId)
    .single();
  if (prospectError) throw prospectError;
  if (prospect.client_id) return { client_id: prospect.client_id, deduplicated: true };

  let clientId: string | null = null;

  if (prospect.email?.trim()) {
    const { data } = await supabaseAdmin
      .from("clients")
      .select("id")
      .ilike("email", prospect.email.trim())
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    clientId = data?.id ?? null;
  }

  if (!clientId && prospect.phone?.trim()) {
    const normalized = prospect.phone.replace(/[^0-9]+/g, "");
    const { data: clients } = await supabaseAdmin.from("clients").select("id,phone,created_at").order("created_at", { ascending: true });
    clientId = clients?.find((c) => (c.phone ?? "").replace(/[^0-9]+/g, "") === normalized)?.id ?? null;
  }

  if (!clientId) {
    const { data: created, error: createError } = await supabaseAdmin
      .from("clients")
      .insert({ full_name: prospect.name, email: prospect.email, phone: prospect.phone, source: "prospect", status: "client" })
      .select("id")
      .single();
    if (createError) throw createError;
    clientId = created.id;
  }

  const { error: updateError } = await supabaseAdmin
    .from("prospects")
    .update({ client_id: clientId, status: "won", updated_at: new Date().toISOString() })
    .eq("id", prospect.id);
  if (updateError) throw updateError;

  return { client_id: clientId, deduplicated: false };
}

export const Route = createFileRoute("/api/internal/catalog")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.INTERNAL_PROCESS_SECRET;
        if (!secret) return Response.json({ ok: false, error: "Disabled" }, { status: 503 });
        if (getToken(request) !== secret) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

        const incoming = new URL(request.url);
        const table = incoming.searchParams.get("table") ?? "";
        const order = incoming.searchParams.get("order") ?? "";
        const ascending = incoming.searchParams.get("ascending") !== "false";

        if (!ALLOWED_TABLES.has(table)) return Response.json({ ok: false, error: "Invalid table" }, { status: 400 });
        if (order && !ALLOWED_ORDER_COLUMNS[table]?.has(order)) {
          return Response.json({ ok: false, error: "Invalid order column" }, { status: 400 });
        }

        try {
          const data = await readTable(table, order, ascending);
          return Response.json({ ok: true, table, data });
        } catch (err) {
          console.error("[internal/catalog] Supabase read failed", err);
          return Response.json({ ok: false, error: "Read failed" }, { status: 502 });
        }
      },
      POST: async ({ request }) => {
        const secret = process.env.INTERNAL_PROCESS_SECRET;
        if (!secret) return Response.json({ ok: false, error: "Disabled" }, { status: 503 });
        if (getToken(request) !== secret) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });

        let body: Record<string, unknown>;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Invalid JSON body" }, { status: 400 });
        }

        const action = typeof body.action === "string" ? body.action : "";
        try {
          if (action === "update_lead") return Response.json({ ok: true, data: await updateLead(body) });
          if (action === "qualify_lead") return Response.json({ ok: true, data: await qualifyLead(body) });
          if (action === "convert_prospect") return Response.json({ ok: true, data: await convertProspect(body) });
          return Response.json({ ok: false, error: "Invalid CRM action" }, { status: 400 });
        } catch (err) {
          console.error("[internal/catalog] CRM action failed", err);
          return Response.json({ ok: false, error: err instanceof Error ? err.message : "CRM action failed" }, { status: 502 });
        }
      },
    },
  },
});

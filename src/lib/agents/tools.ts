import type { SupabaseClient } from "@supabase/supabase-js";

export type AgentToolContext = {
  supabase: SupabaseClient<any>;
  agentId: string;
  runId: string;
};

type ToolResult = Record<string, unknown>;

async function rows(supabase: SupabaseClient<any>, table: string, limit = 100): Promise<any[]> {
  const { data, error } = await supabase.from(table).select("*").limit(limit);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

function numberOf(row: any, keys: string[]) {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return 0;
}

function textOf(row: any, keys: string[]) {
  for (const key of keys) {
    if (row?.[key] !== null && row?.[key] !== undefined && row?.[key] !== "") return String(row[key]);
  }
  return "";
}

export const AGENT_TOOL_DEFINITIONS = [
  { name: "crm.get_leads", description: "Lire les leads/prospects actuels et leurs informations commerciales.", parameters: { type: "object", properties: { limit: { type: "integer" } } } },
  { name: "crm.get_clients", description: "Lire les clients et leur étape commerciale.", parameters: { type: "object", properties: { limit: { type: "integer" } } } },
  { name: "sales.get_open_quotes", description: "Lire les devis non terminés avec leurs montants et statuts.", parameters: { type: "object", properties: { limit: { type: "integer" } } } },
  { name: "catalogue.get_experiences", description: "Lire le catalogue central des expériences, tarifs et coûts disponibles.", parameters: { type: "object", properties: { limit: { type: "integer" } } } },
  { name: "catalogue.get_services", description: "Lire le catalogue des services et leurs données économiques.", parameters: { type: "object", properties: { limit: { type: "integer" } } } },
  { name: "revenue.get_sales", description: "Analyser les devis, voyages et ventes disponibles afin d'estimer le revenu.", parameters: { type: "object", properties: {} } },
  { name: "revenue.get_costs", description: "Analyser les coûts connus dans les expériences, services et devis.", parameters: { type: "object", properties: {} } },
  { name: "revenue.get_product_performance", description: "Classer expériences/services par prix, coût et marge lorsque les données existent.", parameters: { type: "object", properties: {} } },
  { name: "revenue.calculate_roi", description: "Calculer des ratios simples de revenu, marge et conversion à partir des données du Hub.", parameters: { type: "object", properties: {} } },
  { name: "content.get_pipeline", description: "Lire le pipeline de contenus et leurs statuts.", parameters: { type: "object", properties: { limit: { type: "integer" } } } },
  { name: "partners.get_performance", description: "Lire les partenaires et comparer leurs données économiques disponibles.", parameters: { type: "object", properties: { limit: { type: "integer" } } } },
  { name: "trips.get_upcoming", description: "Lire les voyages à venir et leurs statuts.", parameters: { type: "object", properties: { limit: { type: "integer" } } } },
  { name: "trips.get_missing_operations", description: "Détecter les voyages à venir dont les informations opérationnelles sont incomplètes.", parameters: { type: "object", properties: {} } },
  { name: "finance.get_outstanding", description: "Identifier les devis/clients susceptibles d'avoir un encaissement en attente.", parameters: { type: "object", properties: {} } },
  { name: "research.create_opportunity", description: "Créer une opportunité de recherche/veille à partir d'une idée fournie. Création légère et traçable.", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, source: { type: "string" } }, required: ["title", "description"] } },
  { name: "content.create_brief", description: "Créer un brouillon de brief dans le pipeline de contenu. Nécessite approbation.", parameters: { type: "object", properties: { title: { type: "string" }, brief: { type: "string" }, type: { type: "string" } }, required: ["title", "brief"] } },
  { name: "sales.prepare_followup", description: "Préparer une relance commerciale sans l'envoyer. Nécessite approbation pour être enregistrée comme action.", parameters: { type: "object", properties: { lead: { type: "string" }, context: { type: "string" } }, required: ["lead", "context"] } },
  { name: "quotes.create_draft", description: "Préparer un brouillon de devis à partir d'une proposition. Aucune communication client n'est envoyée.", parameters: { type: "object", properties: { client: { type: "string" }, items: { type: "array" }, notes: { type: "string" } }, required: ["client", "items"] } },
] as const;

export const TOOL_REQUIRES_APPROVAL = new Set(["research.create_opportunity", "content.create_brief", "sales.prepare_followup", "quotes.create_draft"]);

export async function executeAgentTool(name: string, args: Record<string, any>, ctx: AgentToolContext): Promise<ToolResult> {
  const { supabase } = ctx;
  switch (name) {
    case "crm.get_leads":
      return { leads: await rows(supabase, "leads", Math.min(args.limit ?? 50, 100)), prospects: await rows(supabase, "prospects", Math.min(args.limit ?? 50, 100)) };
    case "crm.get_clients":
      return { clients: await rows(supabase, "clients", Math.min(args.limit ?? 100, 100)) };
    case "sales.get_open_quotes": {
      const all = await rows(supabase, "quotes", Math.min(args.limit ?? 100, 100));
      return { quotes: all.filter((q) => !["accepted", "paid", "refused", "cancelled"].includes(textOf(q, ["status"]).toLowerCase())) };
    }
    case "catalogue.get_experiences":
      return { experiences: await rows(supabase, "experiences", Math.min(args.limit ?? 100, 100)) };
    case "catalogue.get_services":
      return { services: await rows(supabase, "services", Math.min(args.limit ?? 100, 100)) };
    case "content.get_pipeline":
      return { contents: await rows(supabase, "contents", Math.min(args.limit ?? 100, 100)) };
    case "partners.get_performance":
      return { partners: await rows(supabase, "partners", Math.min(args.limit ?? 100, 100)) };
    case "trips.get_upcoming": {
      const all = await rows(supabase, "trips", Math.min(args.limit ?? 100, 100));
      const now = Date.now();
      return { trips: all.filter((t) => { const d = Date.parse(textOf(t, ["start_date", "starts_at", "date"])); return !Number.isFinite(d) || d >= now; }) };
    }
    case "revenue.get_sales": {
      const quotes = await rows(supabase, "quotes", 100);
      const trips = await rows(supabase, "trips", 100);
      const totalQuoted = quotes.reduce((s, q) => s + numberOf(q, ["total_ttc", "total", "total_amount", "amount"]), 0);
      const accepted = quotes.filter((q) => ["accepted", "paid"].includes(textOf(q, ["status"]).toLowerCase()));
      return { quoteCount: quotes.length, acceptedQuoteCount: accepted.length, totalQuoted, acceptedValue: accepted.reduce((s, q) => s + numberOf(q, ["total_ttc", "total", "total_amount", "amount"]), 0), tripCount: trips.length };
    }
    case "revenue.get_costs": {
      const experiences = await rows(supabase, "experiences", 100);
      const services = await rows(supabase, "services", 100);
      return { experienceCosts: experiences.reduce((s, x) => s + numberOf(x, ["cost", "cost_price", "supplier_cost", "provider_cost"]), 0), serviceCosts: services.reduce((s, x) => s + numberOf(x, ["cost", "cost_price", "supplier_cost", "provider_cost"]), 0) };
    }
    case "revenue.get_product_performance": {
      const [experiences, services] = await Promise.all([rows(supabase, "experiences", 100), rows(supabase, "services", 100)]);
      const products = [...experiences.map((x) => ({ type: "experience", name: textOf(x, ["title", "name"]), price: numberOf(x, ["price", "sale_price", "public_price"]), cost: numberOf(x, ["cost", "cost_price", "supplier_cost"])})), ...services.map((x) => ({ type: "service", name: textOf(x, ["title", "name"]), price: numberOf(x, ["price", "sale_price", "public_price"]), cost: numberOf(x, ["cost", "cost_price", "supplier_cost"])}))].map((p) => ({ ...p, margin: p.price - p.cost, marginRate: p.price > 0 ? (p.price - p.cost) / p.price : null }));
      return { products: products.sort((a, b) => b.margin - a.margin) };
    }
    case "revenue.calculate_roi": {
      const sales = await executeAgentTool("revenue.get_sales", {}, ctx);
      const acceptedValue = Number(sales.acceptedValue ?? 0);
      const quoted = Number(sales.totalQuoted ?? 0);
      return { ...sales, quoteToAcceptedRate: quoted > 0 ? acceptedValue / quoted : null, note: "ROI marketing complet nécessite les données de dépenses/acquisition actuellement connectées." };
    }
    case "trips.get_missing_operations": {
      const trips = await rows(supabase, "trips", 100);
      const missing = trips.filter((t) => !textOf(t, ["status"]) || !textOf(t, ["start_date", "starts_at", "date"]));
      return { missingOperations: missing };
    }
    case "finance.get_outstanding": {
      const quotes = await rows(supabase, "quotes", 100);
      return { outstanding: quotes.filter((q) => ["sent", "pending", "draft"].includes(textOf(q, ["status"]).toLowerCase())).map((q) => ({ id: q.id, status: q.status, amount: numberOf(q, ["total_ttc", "total", "total_amount", "amount"]), clientId: q.client_id })) };
    }
    case "research.create_opportunity":
      return { requiresApproval: true, proposed: { title: args.title, description: args.description, source: args.source ?? null }, message: "Opportunité préparée; validation humaine requise avant écriture." };
    case "content.create_brief":
      return { requiresApproval: true, proposed: { title: args.title, brief: args.brief, type: args.type ?? "blog" }, message: "Brief préparé; validation humaine requise avant écriture." };
    case "sales.prepare_followup":
      return { requiresApproval: true, proposed: { lead: args.lead, context: args.context }, message: "Relance préparée; aucun message n'a été envoyé." };
    case "quotes.create_draft":
      return { requiresApproval: true, proposed: { client: args.client, items: args.items, notes: args.notes ?? null }, message: "Devis préparé; aucune création/communication externe sans validation." };
    default:
      throw new Error(`Unknown agent tool: ${name}`);
  }
}

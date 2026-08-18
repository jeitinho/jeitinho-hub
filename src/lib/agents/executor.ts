import { AGENTS } from "./registry";
import { AGENT_TOOL_DEFINITIONS, executeAgentTool, TOOL_REQUIRES_APPROVAL } from "./tools";
import type { SupabaseClient } from "@supabase/supabase-js";

const MODEL = process.env.OPENROUTER_MODEL || "openrouter/free";
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

function toolSchema(def: (typeof AGENT_TOOL_DEFINITIONS)[number]) {
  return { type: "function", function: { name: def.name, description: def.description, parameters: def.parameters } };
}

function systemPrompt(agent: (typeof AGENTS)[number]) {
  return `Tu es ${agent.name}, agent métier du JEITINHO Hub.\nMission: ${agent.description}\nAutonomie: ${agent.autonomy}.\nTu dois travailler uniquement avec les outils fournis. Ne prétends jamais avoir exécuté une action externe si l'outil ne l'a pas fait. Les données du Hub sont la source de vérité. Pour toute action qui demande approbation, prépare la proposition mais n'envoie rien et n'écris rien. Réponds en français, de manière concise, orientée décision et chiffres.\nOutils autorisés: ${agent.tools.join(", ")}.`;
}

function canUseTool(agent: (typeof AGENTS)[number], name: string) {
  return agent.tools.includes(name);
}

export async function runAgent(params: { agentId: string; task: string; userId: string; supabase: SupabaseClient<any> }) {
  const agent = AGENTS.find((a) => a.id === params.agentId);
  if (!agent) throw new Error(`Agent inconnu: ${params.agentId}`);
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY est manquante. Crée une clé sur OpenRouter et ajoute-la comme secret serveur.");

  const { data: run, error: runError } = await params.supabase.from("agent_runs").insert({ agent_id: agent.id, task: params.task, autonomy: agent.autonomy, status: "running", input_summary: params.task, approval_required: false }).select("*").single();
  if (runError) throw new Error(`Impossible de créer agent_run: ${runError.message}`);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": process.env.OPENROUTER_SITE_URL || "https://jeitinho.fr",
    "X-Title": process.env.OPENROUTER_APP_NAME || "JEITINHO Hub",
  };
  const messages: any[] = [{ role: "system", content: systemPrompt(agent) }, { role: "user", content: params.task }];
  const tools = AGENT_TOOL_DEFINITIONS.filter((t) => canUseTool(agent, t.name)).map(toolSchema);
  let finalText = "";
  let confidence: number | undefined;
  let approvalRequired = false;

  try {
    for (let turn = 0; turn < 8; turn++) {
      const response = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers,
        body: JSON.stringify({ model: MODEL, messages, tools: tools.length ? tools : undefined, tool_choice: "auto", temperature: 0.2 }),
      });
      if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${await response.text()}`);
      const data = await response.json();
      const message = data?.choices?.[0]?.message;
      if (!message) throw new Error("OpenRouter n'a retourné aucun message.");
      messages.push(message);
      if (typeof message.content === "string") finalText += message.content;
      const calls = message.tool_calls ?? [];
      if (!calls.length) break;

      for (const call of calls) {
        const name = String(call.function?.name);
        let args: Record<string, any> = {};
        try { args = JSON.parse(call.function?.arguments || "{}"); } catch { throw new Error(`Arguments invalides pour ${name}`); }
        const requiresApproval = TOOL_REQUIRES_APPROVAL.has(name);
        if (requiresApproval) approvalRequired = true;
        const actionStatus = requiresApproval ? "proposed" : "executed";
        const { data: action } = await params.supabase.from("agent_actions").insert({ agent_run_id: run.id, agent_id: agent.id, tool: name, status: actionStatus, risk: requiresApproval ? "medium" : "low", approval_required: requiresApproval, input: args }).select("id").single();
        let result: any;
        try {
          result = await executeAgentTool(name, args, { supabase: params.supabase, agentId: agent.id, runId: run.id });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          if (action?.id) await params.supabase.from("agent_actions").update({ status: "failed", error: message }).eq("id", action.id);
          result = { error: message };
        }
        if (action?.id) await params.supabase.from("agent_actions").update({ output: result, executed_at: requiresApproval ? null : new Date().toISOString() }).eq("id", action.id);
        messages.push({ role: "tool", tool_call_id: call.id, content: JSON.stringify(result) });
      }
    }

    const status = approvalRequired ? "needs_approval" : "completed";
    await params.supabase.from("agent_runs").update({ status, output_summary: finalText.slice(0, 10000), confidence, approval_required: approvalRequired, completed_at: new Date().toISOString() }).eq("id", run.id);
    return { runId: run.id, agentId: agent.id, status, output: finalText || "Aucun résultat textuel retourné.", approvalRequired };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await params.supabase.from("agent_runs").update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", run.id);
    throw error;
  }
}

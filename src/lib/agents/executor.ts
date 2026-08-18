import { AGENTS, type AgentAutonomy } from "./registry";
import { AGENT_TOOL_DEFINITIONS, executeAgentTool, TOOL_REQUIRES_APPROVAL } from "./tools";
import type { SupabaseClient } from "@supabase/supabase-js";

const MODEL = process.env.OPENAI_AGENT_MODEL || "gpt-5.6-luna";
const OPENAI_URL = "https://api.openai.com/v1/responses";

function toolSchema(def: (typeof AGENT_TOOL_DEFINITIONS)[number]) {
  return { type: "function", name: def.name, description: def.description, parameters: def.parameters, strict: false };
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY est manquante. Ajoute-la comme secret côté serveur.");

  const { data: run, error: runError } = await params.supabase.from("agent_runs").insert({ agent_id: agent.id, task: params.task, autonomy: agent.autonomy, status: "running", input_summary: params.task, approval_required: false }).select("*").single();
  if (runError) throw new Error(`Impossible de créer agent_run: ${runError.message}`);

  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` };
  let input: any[] = [{ role: "user", content: params.task }];
  const tools = AGENT_TOOL_DEFINITIONS.filter((t) => canUseTool(agent, t.name)).map(toolSchema);
  let finalText = "";
  let confidence: number | undefined;
  let approvalRequired = false;

  try {
    for (let turn = 0; turn < 8; turn++) {
      const response = await fetch(OPENAI_URL, { method: "POST", headers, body: JSON.stringify({ model: MODEL, instructions: systemPrompt(agent), input, tools, tool_choice: "auto" }) });
      if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
      const data = await response.json();
      input = [...input, ...(data.output ?? [])];
      const calls = (data.output ?? []).filter((item: any) => item.type === "function_call");
      const messages = (data.output ?? []).filter((item: any) => item.type === "message");
      for (const message of messages) {
        for (const content of message.content ?? []) if (content.type === "output_text") finalText += content.text;
      }
      if (!calls.length) {
        confidence = typeof data?.output?.confidence === "number" ? data.output.confidence : undefined;
        break;
      }
      for (const call of calls) {
        const name = call.name as string;
        let args: Record<string, any> = {};
        try { args = JSON.parse(call.arguments || "{}"); } catch { throw new Error(`Arguments invalides pour ${name}`); }
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
        input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
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

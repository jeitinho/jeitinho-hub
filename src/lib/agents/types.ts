import type { AgentAutonomy } from "./registry";

export type AgentRunStatus = "queued" | "running" | "needs_approval" | "completed" | "failed" | "cancelled";

export type AgentRun = {
  id: string;
  agentId: string;
  task: string;
  autonomy: AgentAutonomy;
  status: AgentRunStatus;
  inputSummary?: string;
  outputSummary?: string;
  confidence?: number;
  approvalRequired: boolean;
  approvedBy?: string;
  targetType?: string;
  targetId?: string;
  createdAt: string;
  completedAt?: string;
};

export type AgentToolPermission = {
  tool: string;
  minAutonomy: AgentAutonomy;
  requiresApproval: boolean;
  risk: "low" | "medium" | "high";
};

export const DEFAULT_TOOL_PERMISSIONS: AgentToolPermission[] = [
  { tool: "crm.get_leads", minAutonomy: "N0", requiresApproval: false, risk: "low" },
  { tool: "crm.get_clients", minAutonomy: "N0", requiresApproval: false, risk: "low" },
  { tool: "sales.get_open_quotes", minAutonomy: "N0", requiresApproval: false, risk: "low" },
  { tool: "sales.prepare_followup", minAutonomy: "N2", requiresApproval: true, risk: "medium" },
  { tool: "quotes.create_draft", minAutonomy: "N2", requiresApproval: true, risk: "medium" },
  { tool: "catalogue.get_experiences", minAutonomy: "N0", requiresApproval: false, risk: "low" },
  { tool: "catalogue.get_services", minAutonomy: "N0", requiresApproval: false, risk: "low" },
  { tool: "revenue.get_sales", minAutonomy: "N0", requiresApproval: false, risk: "low" },
  { tool: "revenue.get_costs", minAutonomy: "N0", requiresApproval: false, risk: "low" },
  { tool: "revenue.get_product_performance", minAutonomy: "N0", requiresApproval: false, risk: "low" },
  { tool: "revenue.calculate_roi", minAutonomy: "N1", requiresApproval: false, risk: "low" },
  { tool: "content.get_pipeline", minAutonomy: "N0", requiresApproval: false, risk: "low" },
  { tool: "content.create_brief", minAutonomy: "N2", requiresApproval: true, risk: "medium" },
  { tool: "research.create_opportunity", minAutonomy: "N1", requiresApproval: false, risk: "low" },
  { tool: "partners.get_performance", minAutonomy: "N0", requiresApproval: false, risk: "low" },
  { tool: "trips.get_upcoming", minAutonomy: "N0", requiresApproval: false, risk: "low" },
  { tool: "trips.get_missing_operations", minAutonomy: "N1", requiresApproval: false, risk: "low" },
  { tool: "finance.get_outstanding", minAutonomy: "N0", requiresApproval: false, risk: "low" },
];

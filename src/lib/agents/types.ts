export type AgentId = "crm_qualification" | "quote_preparation" | "trip_preparation" | "catalog_recommendation" | "operations_control";
export type AgentRunStatus = "queued" | "running" | "awaiting_approval" | "completed" | "failed" | "cancelled";
export type AgentActionKind = "read" | "draft" | "write" | "financial_write";

export type AgentTool = {
  id: string;
  description: string;
  kind: AgentActionKind;
  requiresApproval: boolean;
};

export type AgentDefinition = {
  id: AgentId;
  name: string;
  description: string;
  tools: AgentTool[];
  enabled: boolean;
};

export type AgentRun = {
  id: string;
  agentId: AgentId;
  status: AgentRunStatus;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: string;
  requiresApproval: boolean;
  approvedBy?: string;
  createdAt: string;
  updatedAt: string;
};

export const AGENTS: AgentDefinition[] = [
  { id: "crm_qualification", name: "Qualification CRM", description: "Analyse un lead/prospect et prépare la prochaine action commerciale.", tools: [{ id: "crm.read", description: "Lire les données CRM autorisées", kind: "read", requiresApproval: false }, { id: "crm.draft", description: "Préparer une recommandation ou relance", kind: "draft", requiresApproval: false }], enabled: false },
  { id: "quote_preparation", name: "Préparation devis", description: "Prépare un brouillon de devis à partir d'un prospect et du catalogue.", tools: [{ id: "catalog.read", description: "Lire expériences, services et billetterie", kind: "read", requiresApproval: false }, { id: "quote.draft", description: "Créer/modifier un brouillon de devis", kind: "write", requiresApproval: true }], enabled: false },
  { id: "trip_preparation", name: "Préparation voyage", description: "Transforme un devis accepté en plan opérationnel et identifie les éléments manquants.", tools: [{ id: "trip.read", description: "Lire le voyage et ses prestations", kind: "read", requiresApproval: false }, { id: "trip.draft", description: "Préparer des activités et informations opérationnelles", kind: "write", requiresApproval: true }], enabled: false },
  { id: "catalog_recommendation", name: "Recommandation catalogue", description: "Recommande des expériences, services et billets selon le profil du voyage.", tools: [{ id: "catalog.read", description: "Lire le catalogue", kind: "read", requiresApproval: false }], enabled: false },
  { id: "operations_control", name: "Contrôle opérationnel", description: "Détecte les prestations non planifiées, fournisseurs manquants ou incohérences de marge.", tools: [{ id: "operations.read", description: "Lire voyages, activités et partenaires", kind: "read", requiresApproval: false }, { id: "operations.write", description: "Proposer des corrections opérationnelles", kind: "write", requiresApproval: true }, { id: "finance.write", description: "Modifier une donnée financière", kind: "financial_write", requiresApproval: true }], enabled: false },
];

export function getAgent(id: AgentId) { return AGENTS.find((agent) => agent.id === id); }

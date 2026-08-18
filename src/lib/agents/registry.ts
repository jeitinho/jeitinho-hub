export type AgentAutonomy = "N0" | "N1" | "N2" | "N3";
export type AgentStatus = "active" | "planned" | "paused";

export type AgentDefinition = {
  id: string;
  name: string;
  shortName: string;
  description: string;
  domain: "revenue" | "sales" | "concierge" | "content" | "partner" | "executive" | "acquisition" | "retention" | "operations" | "finance" | "product";
  autonomy: AgentAutonomy;
  status: AgentStatus;
  tools: string[];
  outputs: string[];
};

export const AGENTS: AgentDefinition[] = [
  {
    id: "revenue",
    name: "Revenue Agent",
    shortName: "Revenue",
    description: "Mesure le revenu, les marges, le panier moyen, le ROI et les opportunités de monétisation.",
    domain: "revenue",
    autonomy: "N2",
    status: "active",
    tools: ["revenue.get_sales", "revenue.get_costs", "revenue.get_product_performance", "revenue.calculate_roi"],
    outputs: ["brief revenu", "alertes marge", "recommandations ROI", "classement produits"],
  },
  {
    id: "sales",
    name: "Sales Agent",
    shortName: "Sales",
    description: "Priorise les leads, les devis et les relances pour convertir davantage.",
    domain: "sales",
    autonomy: "N2",
    status: "active",
    tools: ["crm.get_leads", "sales.get_open_quotes", "sales.prepare_followup", "quotes.create_draft"],
    outputs: ["liste de relances", "messages préparés", "priorités commerciales", "brouillons de devis"],
  },
  {
    id: "concierge",
    name: "Concierge Agent",
    shortName: "Concierge",
    description: "Transforme un besoin client en proposition combinant expériences, services et voyage.",
    domain: "concierge",
    autonomy: "N2",
    status: "active",
    tools: ["catalogue.get_experiences", "catalogue.get_services", "trips.get_upcoming", "quotes.create_draft"],
    outputs: ["programme", "pack", "upsell", "proposition client"],
  },
  {
    id: "content-research",
    name: "Content Research Agent",
    shortName: "Research",
    description: "Détecte sujets, tendances, événements, opportunités SEO, concurrents et angles éditoriaux.",
    domain: "content",
    autonomy: "N1",
    status: "active",
    tools: ["research.create_opportunity", "content.get_pipeline"],
    outputs: ["opportunités", "briefs de recherche", "alertes veille", "idées éditoriales"],
  },
  {
    id: "content",
    name: "Content Agent",
    shortName: "Content",
    description: "Transforme les idées validées en contenus multi-canaux et plans de recyclage.",
    domain: "content",
    autonomy: "N2",
    status: "active",
    tools: ["content.get_pipeline", "content.create_brief"],
    outputs: ["brief", "article", "carrousel", "reel", "story", "newsletter", "plan de recyclage"],
  },
  {
    id: "partner",
    name: "Partner Agent",
    shortName: "Partner",
    description: "Évalue les partenaires par prix, marge, fiabilité, capacité et performance.",
    domain: "partner",
    autonomy: "N1",
    status: "active",
    tools: ["partners.get_performance", "revenue.get_product_performance"],
    outputs: ["score fournisseur", "alertes partenaire", "opportunités", "comparatifs"],
  },
  {
    id: "acquisition",
    name: "Acquisition Agent",
    shortName: "Acquisition",
    description: "Analyse les sources, campagnes, parcours d'acquisition et conversions.",
    domain: "acquisition",
    autonomy: "N1",
    status: "active",
    tools: ["revenue.get_sales", "crm.get_leads", "revenue.calculate_roi"],
    outputs: ["ROI canal", "attribution", "alertes acquisition", "priorités trafic"],
  },
  {
    id: "retention",
    name: "Retention Agent",
    shortName: "Retention",
    description: "Identifie les opportunités de réachat, recommandation, fidélisation et post-trip.",
    domain: "retention",
    autonomy: "N2",
    status: "active",
    tools: ["crm.get_clients", "trips.get_upcoming", "sales.prepare_followup"],
    outputs: ["relances post-trip", "opportunités de réachat", "demandes de referral"],
  },
  {
    id: "operations",
    name: "Operations Agent",
    shortName: "Operations",
    description: "Surveille les voyages, les services assignés, les étapes manquantes et les exceptions.",
    domain: "operations",
    autonomy: "N2",
    status: "active",
    tools: ["trips.get_upcoming", "trips.get_missing_operations", "partners.get_performance"],
    outputs: ["liste d'actions", "alertes opérationnelles", "contrôles avant départ"],
  },
  {
    id: "finance",
    name: "Finance Agent",
    shortName: "Finance",
    description: "Suit encaissements, coûts, commissions, soldes et écarts financiers.",
    domain: "finance",
    autonomy: "N1",
    status: "active",
    tools: ["finance.get_outstanding", "revenue.get_sales", "revenue.get_costs"],
    outputs: ["cash report", "impayés", "écarts", "marge nette estimée"],
  },
  {
    id: "product",
    name: "Product & Offer Agent",
    shortName: "Product",
    description: "Optimise le catalogue, les prix, packs, upsells et nouveaux produits selon la performance.",
    domain: "product",
    autonomy: "N1",
    status: "active",
    tools: ["catalogue.get_experiences", "catalogue.get_services", "revenue.get_product_performance"],
    outputs: ["packs", "upsells", "tests prix", "recommandations catalogue"],
  },
  {
    id: "ceo",
    name: "CEO Agent",
    shortName: "CEO",
    description: "Synthétise l'ensemble de JEITINHO en priorités, risques, opportunités et décisions.",
    domain: "executive",
    autonomy: "N1",
    status: "active",
    tools: ["revenue.calculate_roi", "crm.get_leads", "sales.get_open_quotes", "trips.get_missing_operations", "content.get_pipeline"],
    outputs: ["brief quotidien", "3 priorités", "risques", "opportunités", "décisions recommandées"],
  },
];

export function getAgent(agentId: string) {
  return AGENTS.find((agent) => agent.id === agentId);
}

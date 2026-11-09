import type { AppRole } from "@/hooks/use-auth";
import { canAccessModule } from "@/hooks/use-auth";
import { NAV_LABELS } from "@/lib/nav-labels";

/**
 * Actions de la palette ⌘K (modèle Linear / Attio) : créer ou ouvrir un écran en
 * deux touches. Chaque action est rattachée à un module d'accès : on ne propose
 * jamais une page que le rôle ne peut pas ouvrir.
 */
export type CommandAction = {
  id: string;
  label: string;
  /** Mots supplémentaires pour la recherche (FR + PT). */
  keywords?: string;
  module: string;
  to: string;
  kind: "create" | "open";
};

const CREATE: CommandAction[] = [
  { id: "new-quote", label: "Nouveau devis", keywords: "orcamento creer devis", module: "devis", to: "/devis/new", kind: "create" },
  { id: "new-trip", label: "Nouveau voyage", keywords: "viagem sejour creer voyage", module: "voyages", to: "/voyages/new", kind: "create" },
  { id: "new-lead", label: "Nouvelle demande", keywords: "lead prospect pedido contato", module: "crm", to: "/crm/leads/new", kind: "create" },
  { id: "new-client", label: "Nouveau client", keywords: "cliente fiche", module: "clients", to: "/clients/new", kind: "create" },
  { id: "new-experience", label: "Nouvelle expérience", keywords: "passeio tour activite", module: "experiences", to: "/experiences/new", kind: "create" },
  { id: "new-service", label: "Nouveau service", keywords: "servico prestation", module: "services", to: "/services/new", kind: "create" },
  { id: "new-article", label: "Nouvel article de blog", keywords: "post artigo blog", module: "blog", to: "/blog/new", kind: "create" },
];

/** Écrans qu'on ouvre souvent : ordre = ordre d'affichage quand rien n'est tapé. */
const OPEN_ORDER = [
  "dashboard",
  "manifest",
  "crm",
  "devis",
  "voyages",
  "a-valider",
  "associes",
  "calendrier",
  "clients",
  "distribution",
  "partenaires",
  "experiences",
  "services",
  "finances",
  "manuel",
  "blog",
  "contenus",
  "evenements",
  "parametres",
];

const OPEN_KEYWORDS: Record<string, string> = {
  dashboard: "accueil hoje aujourd hui inicio",
  manifest: "sorties manifeste passeios do dia checkin presence",
  crm: "pipeline leads pedidos demandes",
  devis: "orcamentos factures faturas paiements encaissements",
  voyages: "viagens trips sejours",
  "a-valider": "messages envoyer whatsapp mensagens",
  associes: "socios partage registre caisse lucro",
  distribution: "gyg getyourguide reservas",
  finances: "financas argent",
};

export function allActions(): CommandAction[] {
  const open = OPEN_ORDER.filter((m) => NAV_LABELS[m]).map<CommandAction>((m) => ({
    id: `open-${m}`,
    label: NAV_LABELS[m],
    keywords: OPEN_KEYWORDS[m],
    module: m,
    to: `/${m}`,
    kind: "open",
  }));
  return [...CREATE, ...open];
}

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Filtre et classe les actions. Chaque mot tapé doit commencer un mot du libellé
 * ou des mots-clés (« nou dev » → « Nouveau devis »). Libellé avant mots-clés,
 * créations avant ouvertures à score égal. Sans saisie : les créations puis
 * les 6 premiers écrans.
 */
export function filterActions(
  term: string,
  roles: AppRole[],
  actions: CommandAction[] = allActions(),
): CommandAction[] {
  const allowed = actions.filter((a) => canAccessModule(a.module, roles));
  const q = normalize(term);
  if (!q) {
    const creates = allowed.filter((a) => a.kind === "create");
    const opens = allowed.filter((a) => a.kind === "open").slice(0, 6);
    return [...creates, ...opens];
  }
  const parts = q.split(" ");
  const scored: { a: CommandAction; score: number }[] = [];
  for (const a of allowed) {
    const labelWords = normalize(a.label).split(" ");
    const keyWords = normalize(a.keywords ?? "").split(" ").filter(Boolean);
    let score = 0;
    let ok = true;
    for (const p of parts) {
      if (labelWords.some((w) => w.startsWith(p))) score += 2;
      else if (keyWords.some((w) => w.startsWith(p))) score += 1;
      else {
        ok = false;
        break;
      }
    }
    if (ok) scored.push({ a, score: score + (a.kind === "create" ? 0.5 : 0) });
  }
  return scored.sort((x, y) => y.score - x.score).map((s) => s.a);
}

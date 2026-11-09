/**
 * Langue de l'interface du hub : français (par défaut) ou portugais (Luan, Patricia, guides).
 * Choix mémorisé dans le navigateur ; changer de langue recharge la page.
 */
export type HubLang = "fr" | "pt";

const KEY = "hub-lang";

export function getLang(): HubLang {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) === "pt" ? "pt" : "fr";
  } catch {
    return "fr";
  }
}

export function setLang(lang: HubLang) {
  try {
    window.localStorage.setItem(KEY, lang);
  } catch {
    /* stockage indisponible : on garde le français */
  }
  window.location.reload();
}

const PT: Record<string, string> = {
  // Navigation
  Conciergerie: "Concierge",
  Média: "Mídia",
  Événements: "Eventos",
  Réseau: "Rede",
  Pilotage: "Gestão",
  "Aujourd'hui": "Hoje",
  "À envoyer": "A enviar",
  Calendrier: "Calendário",
  Demandes: "Pedidos",
  Clients: "Clientes",
  "Devis & factures": "Orçamentos & faturas",
  Voyages: "Viagens",
  Expériences: "Experiências",
  Services: "Serviços",
  "Billets (catalogue)": "Ingressos (catálogo)",
  "Planning éditorial": "Planejamento editorial",
  Manuel: "Manual",
  Médiathèque: "Mídia",
  "Demandes équipe": "Pedidos da equipe",
  Partenaires: "Parceiros",
  Associés: "Sócios",
  Paramètres: "Configurações",
  "Sorties du jour": "Saídas do dia",
  // Manifeste
  "Toutes les sorties du jour, réservations plateformes et voyages sur mesure, avec pointage des participants.":
    "Todas as saídas do dia, reservas das plataformas e viagens sob medida, com check-in dos participantes.",
  Hier: "Ontem",
  Demain: "Amanhã",
  sorties: "saídas",
  personnes: "pessoas",
  "sans guide": "sem guia",
  pointées: "feitas",
  "Mes sorties": "Minhas saídas",
  Toutes: "Todas",
  "Aucune sortie ce jour-là.": "Nenhuma saída neste dia.",
  Guide: "Guia",
  Présent: "Presente",
  Absent: "No-show",
  Fait: "Feito",
  Annulée: "Cancelada",
  "Point de rendez-vous": "Ponto de encontro",
  Appeler: "Ligar",
  "pers.": "pess.",
  "Langue de l'interface": "Idioma da interface",
};

/** Traduit une chaîne française de l'interface ; renvoie le texte français si aucune traduction. */
export function t(fr: string): string {
  return getLang() === "pt" ? (PT[fr] ?? fr) : fr;
}

import type { ProfileKind } from "@/hooks/use-auth";

/*
 * Un seul nom par écran. Cette table est la référence pour le menu (app-sidebar),
 * la barre d'onglets du téléphone (mobile-nav) et le titre en haut de page (route.tsx).
 * Clé = premier segment de l'URL (= module d'accès).
 */
export const NAV_LABELS: Record<string, string> = {
  dashboard: "Aujourd'hui",
  "a-valider": "À envoyer",
  calendrier: "Calendrier",
  crm: "Demandes",
  clients: "Clients",
  devis: "Devis & factures",
  voyages: "Voyages",
  distribution: "GetYourGuide",
  experiences: "Expériences",
  services: "Services",
  billetterie: "Billets (catalogue)",
  contenus: "Planning éditorial",
  blog: "Blog",
  whatsapp: "Groupe WhatsApp",
  manuel: "Manuel",
  mediatheque: "Médiathèque",
  evenements: "Soirées",
  audience: "Audience",
  partenaires: "Partenaires",
  finances: "Finances",
  agents: "Agents",
  analytics: "Analytics",
  parametres: "Paramètres",
};

/**
 * Nom affiché selon le profil : seuls l'accueil et le planning changent de nom
 * pour les profils non gestionnaires (média : « Mon plan », terrain : « Mes sorties »).
 */
export function navLabel(
  module: string,
  opts: { canManage?: boolean; kind?: ProfileKind } = {},
): string {
  if (opts.canManage === false) {
    if (module === "dashboard") {
      if (opts.kind === "media") return "Mon plan";
      if (opts.kind === "terrain") return "Mes sorties";
      return "Accueil";
    }
    if (module === "contenus") return "Mon planning";
  }
  return NAV_LABELS[module] ?? module;
}

/** Titre du bandeau haut à partir de l'URL. */
export function pathnameToTitle(
  pathname: string,
  opts: { canManage?: boolean; kind?: ProfileKind } = {},
): string {
  const seg = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  return navLabel(seg, opts);
}

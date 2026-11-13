/**
 * Langue de l'interface du hub : français (langue source), portugais et anglais.
 * Choix mémorisé dans le navigateur ; changer de langue recharge la page.
 *
 * Deux mécanismes :
 *  - t("texte français") pour le code qui veut traduire explicitement ;
 *  - startDomTranslation() : traduit à la volée les textes affichés (et les
 *    attributs placeholder / title / aria-label) à partir des dictionnaires
 *    générés (i18n-dict.pt.ts / i18n-dict.en.ts). Les données saisies (noms,
 *    messages, champs) ne sont jamais touchées : seuls les libellés connus
 *    du dictionnaire sont remplacés, à l'identique.
 */
import { PT_DICT } from "./i18n-dict.pt";
import { EN_DICT } from "./i18n-dict.en";

export type HubLang = "fr" | "pt" | "en";
export const HUB_LANGS: { value: HubLang; label: string; short: string }[] = [
  { value: "fr", label: "Français", short: "FR" },
  { value: "pt", label: "Português", short: "PT" },
  { value: "en", label: "English", short: "EN" },
];

const KEY = "hub-lang";

export function getLang(): HubLang {
  try {
    if (typeof window === "undefined") return "fr";
    const v = window.localStorage.getItem(KEY);
    return v === "pt" || v === "en" ? v : "fr";
  } catch {
    return "fr";
  }
}

/** Vrai si l'utilisateur a déjà choisi une langue sur cet appareil. */
export function hasStoredLang(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(KEY) !== null;
  } catch {
    return false;
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

const PT_MANUAL: Record<string, string> = {
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


const DICTS: Record<Exclude<HubLang, "fr">, Record<string, string>> = {
  pt: { ...PT_DICT, ...PT_MANUAL },
  en: EN_DICT,
};

function normalizeKey(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Traduit une chaîne française de l'interface ; renvoie le texte français si aucune traduction. */
export function t(fr: string): string {
  const lang = getLang();
  if (lang === "fr") return fr;
  const d = DICTS[lang];
  return d[fr] ?? d[normalizeKey(fr)] ?? fr;
}

/** Locale pour les dates et nombres. */
export function hubLocale(): string {
  const l = getLang();
  return l === "pt" ? "pt-BR" : l === "en" ? "en-GB" : "fr-FR";
}

const ATTRS = ["placeholder", "title", "aria-label"] as const;
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE", "NOSCRIPT"]);

function skipped(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP.has(e.tagName)) return true;
    if (e.getAttribute("translate") === "no" || e.hasAttribute("data-no-translate")) return true;
    if ((e as HTMLElement).isContentEditable) return true;
  }
  return false;
}

/**
 * Traduit le DOM au fil des rendus. Sans effet en français.
 * Renvoie une fonction d'arrêt.
 */
export function startDomTranslation(root: HTMLElement = document.body): () => void {
  const lang = getLang();
  document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;
  if (lang === "fr") return () => {};
  const dict = DICTS[lang];
  const map = new Map<string, string>();
  for (const [k, v] of Object.entries(dict)) map.set(normalizeKey(k), v);

  const translateText = (n: Text) => {
    const raw = n.nodeValue;
    if (!raw || raw.length > 400) return;
    const key = normalizeKey(raw);
    if (!key) return;
    const tr = map.get(key);
    if (!tr || tr === key) return;
    if (skipped(n.parentElement)) return;
    const lead = raw.match(/^\s*/)?.[0] ?? "";
    const trail = raw.match(/\s*$/)?.[0] ?? "";
    n.nodeValue = lead + tr + trail;
  };
  const translateAttrs = (el: Element) => {
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (!v) continue;
      const tr = map.get(normalizeKey(v));
      if (tr && tr !== v) el.setAttribute(a, tr);
    }
  };
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) return translateText(node as Text);
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    translateAttrs(el);
    if (SKIP.has(el.tagName)) return;
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
    let cur = tw.nextNode();
    while (cur) {
      if (cur.nodeType === Node.TEXT_NODE) translateText(cur as Text);
      else translateAttrs(cur as Element);
      cur = tw.nextNode();
    }
  };

  walk(root);
  const titleEl = document.querySelector("title");
  const obs = new MutationObserver((muts) => {
    for (const m of muts) {
      if (m.type === "characterData") translateText(m.target as Text);
      else if (m.type === "attributes") translateAttrs(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  });
  obs.observe(root, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });
  // Titre de l'onglet : « Devis — JEITINHO »
  const titleObs = new MutationObserver(() => {
    const [page, ...rest] = document.title.split(" — ");
    const tr = map.get(normalizeKey(page));
    if (tr && tr !== page) document.title = [tr, ...rest].join(" — ");
  });
  if (titleEl) titleObs.observe(titleEl, { childList: true, characterData: true, subtree: true });
  return () => {
    obs.disconnect();
    titleObs.disconnect();
  };
}

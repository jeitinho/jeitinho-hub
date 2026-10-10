import { supabase } from "@/integrations/supabase/client";

/*
 * Module Partenaires : pipeline (colonne partners.status), fiches, candidatures
 * envoyées depuis blog.jeitinho.fr/partenaires (partners.application) et liens
 * (expériences, tâches crm, ventes et codes promo AFRO LOVE).
 */

// Tables récentes : typage souple, les types générés restent la référence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

/* ---------- Référentiels ---------- */

export const PARTNER_STATUSES = [
  "nouveau",
  "a_contacter",
  "contacte",
  "premier_rdv",
  "visite",
  "validation",
  "partenaire",
  "premium",
  "club_jeitinho",
  "refuse",
] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

export const STATUS_LABEL: Record<PartnerStatus, string> = {
  nouveau: "Nouveau",
  a_contacter: "À contacter",
  contacte: "Contacté",
  premier_rdv: "1er rendez-vous",
  visite: "Visite",
  validation: "Validation",
  partenaire: "Partenaire",
  premium: "Premium",
  club_jeitinho: "Club Jeitinho",
  refuse: "Refusé",
};

export const PARTNER_KINDS = [
  "prestataire",
  "relais_evenement",
  "revendeur",
  "rp",
  "organisateur",
  "media_influenceur",
  "lieu",
  "autre",
] as const;
export type PartnerKind = (typeof PARTNER_KINDS)[number];

export const KIND_LABEL: Record<PartnerKind, string> = {
  prestataire: "Prestataire",
  relais_evenement: "Relais AFRO LOVE",
  revendeur: "Revendeur",
  rp: "RP",
  organisateur: "Organisateur",
  media_influenceur: "Média / influenceur",
  lieu: "Lieu",
  autre: "Autre",
};

export const SOURCE_LABEL: Record<string, string> = {
  blog: "Candidature blog",
  agent: "Agent",
  manuel: "Manuel",
};

/** Colonnes du pipeline : regroupement des statuts. */
export const PIPELINE_COLUMNS: { key: string; label: string; statuses: PartnerStatus[] }[] = [
  { key: "nouveau", label: "Nouveau", statuses: ["nouveau"] },
  { key: "a_contacter", label: "À contacter", statuses: ["a_contacter"] },
  {
    key: "discussion",
    label: "En discussion",
    statuses: ["contacte", "premier_rdv", "visite", "validation"],
  },
  {
    key: "partenaires",
    label: "Partenaires",
    statuses: ["partenaire", "premium", "club_jeitinho"],
  },
  { key: "refuse", label: "Refusé", statuses: ["refuse"] },
];

export const ACTIVE_STATUSES: PartnerStatus[] = ["partenaire", "premium", "club_jeitinho"];

export const PARTNER_TASK_KINDS = [
  "candidature_partenaire",
  "partenaire_afrolove",
  "relance_revendeur",
] as const;

/* ---------- Types ---------- */

export type PartnerApplication = Record<string, unknown>;

export type Partner = {
  id: string;
  name: string;
  status: PartnerStatus;
  kind: PartnerKind;
  source: string;
  category: string | null;
  location: string | null;
  address: string | null;
  google_maps_url: string | null;
  contact_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  website: string | null;
  notes: string | null;
  commission_rate: number | null;
  terms: string | null;
  next_action: string | null;
  next_action_at: string | null;
  last_contact_at: string | null;
  application: PartnerApplication | null;
  submitted_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type PartnerPatch = Partial<Omit<Partner, "id" | "created_at" | "updated_at">>;

export type LinkedExperience = {
  id: string;
  title: string;
  partner_id: string;
  is_published: boolean;
};

export type LinkedTask = {
  id: string;
  kind: string;
  status: string;
  title: string;
  due_at: string;
  created_at: string;
  /** Colonne absente aujourd'hui (voir SQL proposé) : lue si elle existe. */
  partner_id?: string | null;
};

type EventRef = { id: string; name: string; starts_at: string | null } | null;

export type LinkedSale = {
  id: string;
  event_id: string;
  partner_id: string | null;
  partner_name: string;
  tickets: number;
  vip_revenue: number;
  paid: boolean;
  events: EventRef;
};

export type LinkedPromoCode = {
  id: string;
  event_id: string;
  partner_id: string | null;
  code: string;
  discount_pct: number;
  platform: string;
  uses: number;
  revenue: number;
  vip_revenue: number;
  paid: boolean;
  events: EventRef;
};

export type PartnerLinks = {
  experiences: LinkedExperience[];
  tasks: LinkedTask[];
  sales: LinkedSale[];
  codes: LinkedPromoCode[];
};

export type Place = { id: string; name: string; neighborhood: string | null; zone: string | null };

/* ---------- Lectures ---------- */

export async function fetchPartnerList(): Promise<Partner[]> {
  return check(await db.from("partners").select("*").order("updated_at", { ascending: false }));
}

export async function fetchPartnerLinks(): Promise<PartnerLinks> {
  const [experiences, tasks, sales, codes] = await Promise.all([
    db
      .from("experiences")
      .select("id,title,partner_id,is_published")
      .not("partner_id", "is", null)
      .order("title"),
    db
      .from("crm_tasks")
      .select("*")
      .in("kind", PARTNER_TASK_KINDS as unknown as string[])
      .order("due_at", { ascending: false }),
    db.from("event_partner_sales").select("*, events(id,name,starts_at)"),
    db.from("event_promo_codes").select("*, events(id,name,starts_at)"),
  ]);
  return {
    experiences: check<LinkedExperience[]>(experiences),
    tasks: check<LinkedTask[]>(tasks),
    sales: check<LinkedSale[]>(sales),
    codes: check<LinkedPromoCode[]>(codes),
  };
}

export async function fetchNeighborhoods(): Promise<string[]> {
  const rows = check<Place[]>(
    await db.from("places").select("id,name,neighborhood,zone").order("neighborhood"),
  );
  return Array.from(
    new Set(rows.map((r) => r.neighborhood).filter((n): n is string => Boolean(n))),
  ).sort((a, b) => a.localeCompare(b, "fr"));
}

/* ---------- Écritures ---------- */

export async function updatePartner(id: string, patch: PartnerPatch) {
  check(await db.from("partners").update(patch).eq("id", id));
}

export async function createPartner(row: {
  name: string;
  kind: PartnerKind;
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  location?: string | null;
}): Promise<Partner> {
  const res = await db
    .from("partners")
    .insert({ ...row, status: "a_contacter", source: "manuel", is_active: true })
    .select("*")
    .single();
  return check<Partner>(res);
}

/** Changement de statut : is_active suit le statut (actif si partenaire, inactif si refusé). */
export function statusPatch(status: PartnerStatus): PartnerPatch {
  if (ACTIVE_STATUSES.includes(status)) return { status, is_active: true };
  if (status === "refuse") return { status, is_active: false };
  return { status };
}

/** « Contacté aujourd'hui » : last_contact_at = maintenant, statut au moins « contacté ». */
export function contactedTodayPatch(p: Partner): PartnerPatch {
  const order = PARTNER_STATUSES.indexOf(p.status);
  const contacte = PARTNER_STATUSES.indexOf("contacte");
  const patch: PartnerPatch = { last_contact_at: new Date().toISOString() };
  if (p.status !== "refuse" && order < contacte) patch.status = "contacte";
  return patch;
}

/* ---------- Règles métier ---------- */

export function isNewApplication(p: Partner) {
  return p.status === "nouveau" && p.source === "blog";
}

export function isOverdue(p: Partner) {
  return (
    !!p.next_action_at && p.status !== "refuse" && new Date(p.next_action_at).getTime() < Date.now()
  );
}

/** Candidatures blog non traitées d'abord, puis actions en retard, puis prochaine action. */
export function pipelineOrder(a: Partner, b: Partner) {
  const na = isNewApplication(a) ? 0 : 1;
  const nb = isNewApplication(b) ? 0 : 1;
  if (na !== nb) return na - nb;
  if (na === 0)
    return (b.submitted_at ?? b.created_at).localeCompare(a.submitted_at ?? a.created_at);
  const oa = isOverdue(a) ? 0 : 1;
  const ob = isOverdue(b) ? 0 : 1;
  if (oa !== ob) return oa - ob;
  if (a.next_action_at && b.next_action_at) return a.next_action_at.localeCompare(b.next_action_at);
  if (a.next_action_at) return -1;
  if (b.next_action_at) return 1;
  return b.updated_at.localeCompare(a.updated_at);
}

/** Tâches crm liées : par partner_id si la colonne existe, sinon par nom dans le titre. */
export function tasksFor(p: Partner, tasks: LinkedTask[]) {
  const name = normalize(p.name);
  return tasks.filter(
    (t) => t.partner_id === p.id || (!t.partner_id && name && normalize(t.title).includes(name)),
  );
}

export function salesFor(p: Partner, sales: LinkedSale[]) {
  const name = normalize(p.name);
  return sales.filter(
    (s) => s.partner_id === p.id || (!s.partner_id && normalize(s.partner_name) === name),
  );
}

export function normalize(s: string | null | undefined) {
  return (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/* ---------- Liens externes 1 clic ---------- */

export function whatsappUrl(p: Pick<Partner, "whatsapp" | "phone">) {
  const raw = p.whatsapp || p.phone;
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Numéro brésilien saisi sans indicatif (DDD + numéro)
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("55"))
    digits = `55${digits}`;
  return `https://wa.me/${digits}`;
}

export function instagramUrl(handle: string | null) {
  if (!handle) return null;
  const h = handle.trim();
  if (/^https?:\/\//i.test(h)) return h;
  return `https://www.instagram.com/${h.replace(/^@/, "").replace(/^(www\.)?instagram\.com\//i, "").replace(/\/+$/, "")}/`;
}

export function mapsUrl(p: Pick<Partner, "google_maps_url" | "address" | "name" | "location">) {
  if (p.google_maps_url) return p.google_maps_url;
  const q = p.address || [p.name, p.location, "Rio de Janeiro"].filter(Boolean).join(", ");
  return q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : null;
}

/* ---------- Dates (America/Sao_Paulo, UTC-3 sans heure d'été depuis 2019) ---------- */

export function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 3 * 3_600_000);
  return d.toISOString().slice(0, 16);
}

export function fromLocalInput(value: string) {
  return value ? new Date(`${value}:00-03:00`).toISOString() : null;
}

/** Dans n jours à 10 h, heure de Rio. */
export function inDaysAt10(n: number) {
  const local = new Date(Date.now() - 3 * 3_600_000 + n * 86_400_000).toISOString().slice(0, 10);
  return new Date(`${local}T10:00:00-03:00`).toISOString();
}

export function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  });
}

/* ---------- Candidature blog (application jsonb) ---------- */

export const APPLICATION_CATEGORY_LABEL: Record<string, string> = {
  restaurante: "Restaurant",
  bar: "Bar",
  barraca: "Barraca de plage",
  hotel: "Hôtel",
  pousada: "Pousada",
  cafe: "Café",
  confeitaria: "Pâtisserie",
  guia: "Guide",
  agencia: "Agence",
  transporte: "Transport",
  passeio: "Excursion",
  artesao: "Artisan",
  loja: "Boutique",
  bem_estar: "Bien-être",
  vida_noturna: "Vie nocturne",
  eventos: "Événementiel",
  outro: "Autre",
};

/** Sections et libellés du formulaire blog.jeitinho.fr/partenaires (version FR). */
export const APPLICATION_SECTIONS: { title: string; fields: [string, string][] }[] = [
  {
    title: "Informations générales",
    fields: [
      ["establishmentName", "Établissement"],
      ["contactName", "Responsable"],
      ["contactRole", "Fonction"],
      ["phone", "Téléphone"],
      ["whatsapp", "WhatsApp"],
      ["email", "E-mail"],
      ["website", "Site internet"],
      ["instagram", "Instagram"],
      ["facebook", "Facebook"],
      ["tiktok", "TikTok"],
      ["category", "Catégorie"],
    ],
  },
  {
    title: "Adresse",
    fields: [
      ["address", "Adresse"],
      ["neighborhood", "Quartier"],
      ["googleMapsUrl", "Google Maps"],
      ["gpsCoordinates", "Coordonnées GPS"],
    ],
  },
  {
    title: "Présentation",
    fields: [
      ["presentation", "Présentation"],
      ["differentiation", "Ce qui les différencie"],
      ["since", "Existe depuis"],
      ["languagesSpoken", "Langues parlées"],
    ],
  },
  {
    title: "Horaires",
    fields: [
      ["openingDays", "Jours d'ouverture"],
      ["openingHours", "Horaires"],
      ["annualClosure", "Fermeture annuelle"],
    ],
  },
  {
    title: "Capacité",
    fields: [
      ["seats", "Places"],
      ["tables", "Tables"],
      ["rooms", "Chambres"],
      ["maxGroupSize", "Groupe max."],
      ["hasTerrace", "Terrasse"],
      ["hasAirConditioning", "Climatisation"],
    ],
  },
  {
    title: "Attentes et offre",
    fields: [
      ["seeking", "Recherche"],
      ["offering", "Peut offrir"],
    ],
  },
  { title: "Médias", fields: [["mediaFileNames", "Fichiers envoyés"]] },
  { title: "Message", fields: [["message", "Message"]] },
  {
    title: "Consentements",
    fields: [
      ["consentUseInfo", "Utilisation des informations"],
      ["consentContact", "Accepte d'être contacté"],
      ["consentTerms", "Conditions générales"],
    ],
  },
];

/** Clés non affichées comme champs (métadonnées de la candidature). */
export const APPLICATION_META_KEYS = ["status", "lang", "submittedAt"];

/** Champs de la fiche que la candidature peut compléter (seulement s'ils sont vides). */
export function patchFromApplication(p: Partner): PartnerPatch {
  const a = p.application ?? {};
  const str = (k: string) => {
    const v = a[k];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };
  const map: [keyof PartnerPatch, string | null][] = [
    ["contact_name", str("contactName")],
    ["phone", str("phone")],
    ["whatsapp", str("whatsapp")],
    ["email", str("email")],
    ["website", str("website")],
    ["instagram", str("instagram")],
    ["address", str("address")],
    ["location", str("neighborhood")],
    ["google_maps_url", str("googleMapsUrl")],
    ["category", str("category")],
  ];
  const patch: PartnerPatch = {};
  for (const [field, value] of map) {
    if (value && !p[field as keyof Partner]) (patch as Record<string, unknown>)[field] = value;
  }
  return patch;
}

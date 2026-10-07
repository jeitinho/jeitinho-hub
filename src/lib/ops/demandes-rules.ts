/*
 * Pipeline « Demandes → Devis » : règles métier pures (aucun accès réseau, aucun import).
 *
 * Une « demande » = un prospect (avec ses leads rattachés fusionnés) OU un lead orphelin
 * (sans prospect). Ce fichier calcule l'étape, la température (chaud / tiède / froid),
 * le tri, les compteurs et les liens de contact. Les accès Supabase sont dans demandes.ts.
 *
 * Tests : node --experimental-strip-types --test src/lib/ops/demandes-rules.test.ts
 */

export const TZ = "America/Sao_Paulo";
const DAY = 86_400_000;
const HOUR = 3_600_000;

/* ---------- Données brutes (sous-ensemble des colonnes lues) ---------- */

export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "lost" | "spam";
export type ProspectStatus = "new" | "contacted" | "quoted" | "negotiating" | "won" | "lost";

export type DemandeLead = {
  id: string;
  source: string;
  status: LeadStatus;
  name: string | null;
  email: string | null;
  phone: string | null;
  travel_start: string | null;
  travel_end: string | null;
  party_size: number | null;
  activities: string[] | null;
  message: string | null;
  prospect_id: string | null;
  received_at: string;
  processed_at: string | null;
  updated_at: string | null;
  last_contact_at: string | null;
  request_type: string | null;
  campaign: string | null;
};

export type DemandeProspect = {
  id: string;
  status: ProspectStatus;
  source: string;
  name: string;
  email: string | null;
  phone: string | null;
  travel_start: string | null;
  travel_end: string | null;
  party_size: number | null;
  activities: string[] | null;
  message: string | null;
  notes: string | null;
  client_id: string | null;
  created_at: string;
  updated_at: string | null;
  last_contact_at: string | null;
};

export type DemandeQuote = {
  id: string;
  number: string | null;
  reference: string;
  title: string;
  status: string;
  total_amount: number | string | null;
  currency: string;
  client_id: string | null;
  prospect_id: string | null;
  sent_at: string | null;
  accepted_at: string | null;
  paid_at: string | null;
  created_at: string;
};

export type DemandeTask = {
  id: string;
  kind: string;
  status: string;
  title: string;
  lead_id: string | null;
  prospect_id: string | null;
  quote_id: string | null;
  due_at: string;
  handled_at: string | null;
  created_at: string;
};

/* ---------- Étapes ---------- */

export type DemandeStage = "nouvelle" | "contactee" | "devis" | "negociation" | "gagnee" | "perdue";

export const STAGES: { key: DemandeStage; label: string }[] = [
  { key: "nouvelle", label: "Nouvelle" },
  { key: "contactee", label: "Contactée" },
  { key: "devis", label: "Devis envoyé" },
  { key: "negociation", label: "Négociation" },
  { key: "gagnee", label: "Gagnée" },
  { key: "perdue", label: "Perdue" },
];

export const STAGE_LABEL = Object.fromEntries(STAGES.map((s) => [s.key, s.label])) as Record<
  DemandeStage,
  string
>;

export const OPEN_STAGES: DemandeStage[] = ["nouvelle", "contactee", "devis", "negociation"];

/** Rang d'avancement (Perdue est hors échelle : c'est une sortie, pas une étape). */
const STAGE_RANK: Record<DemandeStage, number> = {
  nouvelle: 0,
  contactee: 1,
  devis: 2,
  negociation: 3,
  gagnee: 4,
  perdue: -1,
};

export const PROSPECT_STATUS_BY_STAGE: Record<DemandeStage, ProspectStatus> = {
  nouvelle: "new",
  contactee: "contacted",
  devis: "quoted",
  negociation: "negotiating",
  gagnee: "won",
  perdue: "lost",
};

const STAGE_BY_PROSPECT_STATUS: Record<ProspectStatus, DemandeStage> = {
  new: "nouvelle",
  contacted: "contactee",
  quoted: "devis",
  negotiating: "negociation",
  won: "gagnee",
  lost: "perdue",
};

const STAGE_BY_LEAD_STATUS: Record<LeadStatus, DemandeStage> = {
  new: "nouvelle",
  contacted: "contactee",
  qualified: "contactee",
  converted: "gagnee",
  lost: "perdue",
  spam: "perdue",
};

/** Statut de lead écrit quand un lead orphelin change d'étape (devis / négociation : qualifier d'abord). */
export const LEAD_STATUS_BY_STAGE: Partial<Record<DemandeStage, LeadStatus>> = {
  nouvelle: "new",
  contactee: "contacted",
  gagnee: "converted",
  perdue: "lost",
};

function maxStage(a: DemandeStage, b: DemandeStage) {
  return STAGE_RANK[b] > STAGE_RANK[a] ? b : a;
}

export type StageResult = {
  stage: DemandeStage;
  /** Étape minimale imposée par les faits (devis envoyé, devis accepté, contact déjà tracé). */
  floor: DemandeStage;
  floorReason: string | null;
};

/**
 * Étape d'une demande.
 * - Prospect : statut du prospect, relevé par les faits (on garde la plus avancée) :
 *   devis accepté/payé ou lead converti → Gagnée ; devis 'sent' → Devis envoyé ;
 *   lead contacté/qualifié, contact tracé, tâche envoyée ou devis déjà envoyé (refusé/expiré) → Contactée.
 *   Prospect 'lost' → Perdue, quoi qu'il arrive.
 * - Lead orphelin : son statut seul (new → Nouvelle, contacted/qualified → Contactée,
 *   converted → Gagnée, lost/spam → Perdue).
 */
export function deriveStage(input: {
  prospect: Pick<DemandeProspect, "status" | "last_contact_at"> | null;
  leads: Pick<DemandeLead, "status" | "last_contact_at">[];
  quotes: Pick<DemandeQuote, "status" | "sent_at">[];
  tasks?: Pick<DemandeTask, "status">[];
}): StageResult {
  const { prospect, leads, quotes, tasks = [] } = input;

  if (!prospect) {
    const lead = leads[0];
    return {
      stage: lead ? STAGE_BY_LEAD_STATUS[lead.status] : "nouvelle",
      floor: "nouvelle",
      floorReason: null,
    };
  }

  let floor: DemandeStage = "nouvelle";
  let floorReason: string | null = null;
  if (quotes.some((q) => q.status === "accepted" || q.status === "paid")) {
    floor = "gagnee";
    floorReason = "Un devis est accepté";
  } else if (leads.some((l) => l.status === "converted")) {
    floor = "gagnee";
    floorReason = "Un lead est converti";
  } else if (quotes.some((q) => q.status === "sent")) {
    floor = "devis";
    floorReason = "Un devis envoyé attend une réponse";
  } else if (
    leads.some((l) => l.status === "contacted" || l.status === "qualified" || l.last_contact_at) ||
    prospect.last_contact_at ||
    tasks.some((t) => t.status === "envoye") ||
    quotes.some((q) => q.sent_at)
  ) {
    floor = "contactee";
    floorReason = "Un contact est déjà tracé";
  }

  if (prospect.status === "lost") return { stage: "perdue", floor, floorReason };
  return { stage: maxStage(STAGE_BY_PROSPECT_STATUS[prospect.status], floor), floor, floorReason };
}

/* ---------- Dates (jour calendaire à São Paulo) ---------- */

/** Jour calendaire AAAA-MM-JJ dans le fuseau de Rio. */
export function dayKey(date: Date, tz = TZ): string {
  return date.toLocaleDateString("en-CA", { timeZone: tz });
}

function dayNumber(isoDay: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDay);
  if (!m) return Number.NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / DAY;
}

/** Nombre de jours entre aujourd'hui (Rio) et une date AAAA-MM-JJ (négatif si passée). */
export function daysFromToday(isoDay: string, now: Date = new Date()): number {
  return dayNumber(isoDay) - dayNumber(dayKey(now));
}

function time(iso: string | null | undefined): number {
  if (!iso) return Number.NaN;
  return new Date(iso).getTime();
}

function latestIso(values: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  let bestT = Number.NEGATIVE_INFINITY;
  for (const v of values) {
    const t = time(v);
    if (!Number.isNaN(t) && t > bestT) {
      bestT = t;
      best = v as string;
    }
  }
  return best;
}

function earliestIso(values: (string | null | undefined)[]): string | null {
  let best: string | null = null;
  let bestT = Number.POSITIVE_INFINITY;
  for (const v of values) {
    const t = time(v);
    if (!Number.isNaN(t) && t < bestT) {
      bestT = t;
      best = v as string;
    }
  }
  return best;
}

/* ---------- Température chaud / tiède / froid ---------- */

export type Temperature = "chaud" | "tiede" | "froid";

export const TEMPERATURE_LABEL: Record<Temperature, string> = {
  chaud: "Chaud",
  tiede: "Tiède",
  froid: "Froid",
};

export const HOT_TRAVEL_WINDOW_DAYS = 90;
export const HOT_QUOTE_WINDOW_DAYS = 7;
export const COLD_INACTIVITY_DAYS = 21;

export type TemperatureInput = {
  stage: DemandeStage;
  travelStart: string | null;
  travelEnd: string | null;
  partySize: number | null;
  quotes: Pick<DemandeQuote, "status" | "sent_at">[];
  /** Dernière activité : création de la demande ou dernier contact (voir lastActivityOf). */
  lastActivityAt: string | null;
};

/**
 * Température d'une demande, évaluée dans cet ordre :
 * 1. étape Perdue → FROID ;
 * 2. CHAUD si (dates de voyage connues, départ dans les 90 jours ou voyage en cours,
 *    ET nombre de personnes connu) OU un devis 'sent' envoyé il y a moins de 7 jours ;
 * 3. FROID si aucune activité (création ou dernier contact) depuis plus de 21 jours ;
 * 4. sinon TIÈDE.
 * Un voyage proche reste CHAUD même sans activité récente : c'est justement l'urgence.
 * `reasons` explique le classement (affiché au survol du badge et dans le panneau).
 */
export function scoreDemande(
  input: TemperatureInput,
  now: Date = new Date(),
): { temperature: Temperature; reasons: string[] } {
  if (input.stage === "perdue") return { temperature: "froid", reasons: ["Demande perdue"] };

  const reasons: string[] = [];
  const party = input.partySize != null && input.partySize > 0 ? input.partySize : null;
  let travelSoon = false;
  if (input.travelStart) {
    const delta = daysFromToday(input.travelStart, now);
    const endDelta = input.travelEnd ? daysFromToday(input.travelEnd, now) : delta;
    if (!Number.isNaN(delta)) {
      if (delta >= 0 && delta <= HOT_TRAVEL_WINDOW_DAYS) {
        travelSoon = true;
        reasons.push(delta === 0 ? "Arrivée aujourd'hui" : `Voyage dans ${delta} j`);
      } else if (delta < 0 && endDelta >= 0) {
        travelSoon = true;
        reasons.push("Voyage en cours");
      } else if (delta < 0) {
        reasons.push("Dates de voyage passées");
      } else {
        reasons.push(`Voyage dans ${delta} j`);
      }
    }
  } else {
    reasons.push("Dates inconnues");
  }
  reasons.push(party ? `${party} pers.` : "Nombre de personnes inconnu");

  const nowT = now.getTime();
  const recentQuote = input.quotes
    .filter((q) => q.status === "sent" && q.sent_at)
    .map((q) => nowT - time(q.sent_at))
    .filter((age) => age >= 0 && age < HOT_QUOTE_WINDOW_DAYS * DAY)
    .sort((a, b) => a - b)[0];

  if (recentQuote != null) {
    const days = Math.floor(recentQuote / DAY);
    return {
      temperature: "chaud",
      reasons: [
        days === 0 ? "Devis envoyé aujourd'hui" : `Devis envoyé il y a ${days} j`,
        ...reasons,
      ],
    };
  }
  if (travelSoon && party) return { temperature: "chaud", reasons };

  const last = time(input.lastActivityAt);
  if (!Number.isNaN(last)) {
    const idle = Math.floor((nowT - last) / DAY);
    if (nowT - last > COLD_INACTIVITY_DAYS * DAY) {
      return { temperature: "froid", reasons: [`Aucune activité depuis ${idle} j`, ...reasons] };
    }
  }
  return { temperature: "tiede", reasons };
}

/* ---------- Construction des demandes ---------- */

export type Demande = {
  /** "p:<prospect id>" ou "l:<lead id>" */
  key: string;
  kind: "prospect" | "lead";
  id: string;
  prospect: DemandeProspect | null;
  /** Lead orphelin (kind = "lead"). */
  lead: DemandeLead | null;
  /** Leads fusionnés, du plus ancien au plus récent. */
  leads: DemandeLead[];
  /** Devis liés, du plus récent au plus ancien. */
  quotes: DemandeQuote[];
  tasks: DemandeTask[];
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  sources: string[];
  travelStart: string | null;
  travelEnd: string | null;
  partySize: number | null;
  activities: string[];
  /** Message d'origine (le plus ancien non vide). */
  message: string | null;
  createdAt: string;
  lastActivityAt: string;
  clientId: string | null;
  stage: DemandeStage;
  floor: DemandeStage;
  floorReason: string | null;
  temperature: Temperature;
  temperatureReasons: string[];
  tasksToValidate: number;
  /** Devis 'sent' le plus récent (en attente de réponse). */
  pendingQuote: DemandeQuote | null;
  wonAt: string | null;
};

function firstValue<T>(values: (T | null | undefined)[]): T | null {
  for (const v of values) if (v != null && v !== "") return v;
  return null;
}

function uniqueText(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const t = v?.trim();
    if (!t) continue;
    const k = normalizeText(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Dernière activité = création ou dernier contact (lead reçu, contact tracé, devis envoyé, tâche envoyée). */
export function lastActivityOf(input: {
  prospect: Pick<DemandeProspect, "created_at" | "last_contact_at"> | null;
  leads: Pick<DemandeLead, "received_at" | "last_contact_at">[];
  quotes: Pick<DemandeQuote, "sent_at">[];
  tasks: Pick<DemandeTask, "status" | "handled_at">[];
}): string | null {
  return latestIso([
    input.prospect?.created_at,
    input.prospect?.last_contact_at,
    ...input.leads.flatMap((l) => [l.received_at, l.last_contact_at]),
    ...input.quotes.map((q) => q.sent_at),
    ...input.tasks.filter((t) => t.status === "envoye").map((t) => t.handled_at),
  ]);
}

function wonAtOf(
  stage: DemandeStage,
  prospect: DemandeProspect | null,
  leads: DemandeLead[],
  quotes: DemandeQuote[],
): string | null {
  if (stage !== "gagnee") return null;
  const fromQuotes = earliestIso(
    quotes
      .filter((q) => q.status === "accepted" || q.status === "paid")
      .map((q) => q.accepted_at ?? q.paid_at),
  );
  if (fromQuotes) return fromQuotes;
  const fromLeads = earliestIso(
    leads.filter((l) => l.status === "converted").map((l) => l.processed_at ?? l.updated_at),
  );
  if (fromLeads) return fromLeads;
  return prospect?.updated_at ?? null;
}

export function buildDemandes(
  data: {
    prospects: DemandeProspect[];
    leads: DemandeLead[];
    quotes: DemandeQuote[];
    tasks: DemandeTask[];
  },
  now: Date = new Date(),
): Demande[] {
  const prospectIds = new Set(data.prospects.map((p) => p.id));
  const leadsByProspect = new Map<string, DemandeLead[]>();
  const orphans: DemandeLead[] = [];
  for (const l of data.leads) {
    if (l.prospect_id && prospectIds.has(l.prospect_id)) {
      const list = leadsByProspect.get(l.prospect_id) ?? [];
      list.push(l);
      leadsByProspect.set(l.prospect_id, list);
    } else {
      orphans.push(l);
    }
  }
  const quotesByProspect = new Map<string, DemandeQuote[]>();
  for (const q of data.quotes) {
    if (!q.prospect_id) continue;
    const list = quotesByProspect.get(q.prospect_id) ?? [];
    list.push(q);
    quotesByProspect.set(q.prospect_id, list);
  }

  const build = (prospect: DemandeProspect | null, rawLeads: DemandeLead[]): Demande => {
    const leads = [...rawLeads].sort((a, b) => time(a.received_at) - time(b.received_at));
    const newestFirst = [...leads].reverse();
    const quotes = prospect
      ? [...(quotesByProspect.get(prospect.id) ?? [])].sort(
          (a, b) => time(b.created_at) - time(a.created_at),
        )
      : [];
    const leadIds = new Set(leads.map((l) => l.id));
    const quoteIds = new Set(quotes.map((q) => q.id));
    const tasks = data.tasks
      .filter(
        (t) =>
          (prospect && t.prospect_id === prospect.id) ||
          (t.lead_id && leadIds.has(t.lead_id)) ||
          (t.quote_id && quoteIds.has(t.quote_id)),
      )
      .sort((a, b) => time(a.due_at) - time(b.due_at));

    const { stage, floor, floorReason } = deriveStage({ prospect, leads, quotes, tasks });
    const createdAt =
      earliestIso([prospect?.created_at, ...leads.map((l) => l.received_at)]) ?? now.toISOString();
    const lastActivityAt = lastActivityOf({ prospect, leads, quotes, tasks }) ?? createdAt;

    // Champs du prospect d'abord (mis à jour à chaque nouveau lead), sinon le lead le plus récent.
    const travelStart = firstValue([
      prospect?.travel_start,
      ...newestFirst.map((l) => l.travel_start),
    ]);
    const travelEnd = prospect?.travel_start
      ? (prospect.travel_end ?? null)
      : firstValue(newestFirst.filter((l) => l.travel_start).map((l) => l.travel_end));
    const partySize = firstValue([prospect?.party_size, ...newestFirst.map((l) => l.party_size)]);
    const pendingQuote = quotes.find((q) => q.status === "sent") ?? null;
    const { temperature, reasons } = scoreDemande(
      { stage, travelStart, travelEnd, partySize, quotes, lastActivityAt },
      now,
    );
    const lead = prospect ? null : (leads[0] ?? null);

    return {
      key: prospect ? `p:${prospect.id}` : `l:${lead?.id}`,
      kind: prospect ? "prospect" : "lead",
      id: prospect ? prospect.id : (lead?.id ?? ""),
      prospect,
      lead,
      leads,
      quotes,
      tasks,
      name:
        firstValue([prospect?.name?.trim(), ...newestFirst.map((l) => l.name?.trim())]) ??
        "Demande sans nom",
      email: firstValue([prospect?.email, ...newestFirst.map((l) => l.email)]),
      phone: firstValue([prospect?.phone, ...newestFirst.map((l) => l.phone)]),
      source: firstValue([leads[0]?.source, prospect?.source]) ?? "—",
      sources: uniqueText([...leads.map((l) => l.source), prospect?.source]),
      travelStart,
      travelEnd,
      partySize,
      activities: uniqueText([
        ...(prospect?.activities ?? []),
        ...newestFirst.flatMap((l) => l.activities ?? []),
      ]),
      message: firstValue([...leads.map((l) => l.message?.trim()), prospect?.message?.trim()]),
      createdAt,
      lastActivityAt,
      clientId: firstValue([prospect?.client_id, ...quotes.map((q) => q.client_id)]),
      stage,
      floor,
      floorReason,
      temperature,
      temperatureReasons: reasons,
      tasksToValidate: tasks.filter((t) => t.status === "a_valider").length,
      pendingQuote,
      wonAt: wonAtOf(stage, prospect, leads, quotes),
    };
  };

  return [
    ...data.prospects.map((p) => build(p, leadsByProspect.get(p.id) ?? [])),
    ...orphans.map((l) => build(null, [l])),
  ];
}

/* ---------- Tri, filtres, compteurs ---------- */

const TEMPERATURE_RANK: Record<Temperature, number> = { chaud: 0, tiede: 1, froid: 2 };

/**
 * Tri des colonnes ouvertes : chaud d'abord, puis la demande qui attend depuis le plus
 * longtemps (dernière activité la plus ancienne), puis la plus ancienne créée.
 * Colonnes Gagnée / Perdue : la plus récente d'abord.
 */
export function compareDemandes(a: Demande, b: Demande): number {
  const closed = (d: Demande) => d.stage === "gagnee" || d.stage === "perdue";
  if (closed(a) && closed(b)) {
    return time(b.wonAt ?? b.lastActivityAt) - time(a.wonAt ?? a.lastActivityAt);
  }
  return (
    TEMPERATURE_RANK[a.temperature] - TEMPERATURE_RANK[b.temperature] ||
    time(a.lastActivityAt) - time(b.lastActivityAt) ||
    time(a.createdAt) - time(b.createdAt)
  );
}

/** À traiter aujourd'hui = demande ouverte chaude, ou nouvelle depuis plus de 24 h. */
export function isToHandleToday(d: Demande, now: Date = new Date()): boolean {
  if (!OPEN_STAGES.includes(d.stage)) return false;
  if (d.temperature === "chaud") return true;
  return d.stage === "nouvelle" && now.getTime() - time(d.createdAt) > 24 * HOUR;
}

export function pipelineCounters(
  demandes: Demande[],
  quotes: Pick<DemandeQuote, "status">[],
  now: Date = new Date(),
) {
  const month = dayKey(now).slice(0, 7);
  return {
    toHandle: demandes.filter((d) => isToHandleToday(d, now)).length,
    pendingQuotes: quotes.filter((q) => q.status === "sent").length,
    wonThisMonth: demandes.filter(
      (d) => d.stage === "gagnee" && d.wonAt && dayKey(new Date(d.wonAt)).slice(0, 7) === month,
    ).length,
  };
}

/** Minuscules, sans accents ni ponctuation, espaces normalisés. */
export function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function matchesSearch(d: Demande, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  const hay = normalizeText(
    [
      d.name,
      d.email,
      d.phone,
      d.phone?.replace(/\D/g, ""),
      d.message,
      ...d.sources,
      ...d.activities,
      ...d.quotes.map((x) => `${x.number ?? ""} ${x.reference} ${x.title}`),
    ].join(" "),
  );
  return q.split(" ").every((part) => hay.includes(part));
}

/* ---------- Sources ---------- */

/** Famille de source, pour le filtre : site, e-mail, GetYourGuide, réseaux, partenaire… */
export function sourceGroup(source: string | null | undefined): string {
  const s = (source ?? "").trim();
  const n = s.toLowerCase();
  if (!n) return "Inconnue";
  if (/getyourguide|\bgyg\b/.test(n)) return "GetYourGuide";
  if (/jeitinho\.fr|^site/.test(n) && !n.includes("@")) return "Site jeitinho.fr";
  if (/contact@|e-?mail|gmail|^mail/.test(n)) return "E-mail contact@";
  if (n.includes("whatsapp")) return "WhatsApp";
  if (n.includes("insta")) return "Instagram";
  if (n.includes("partenaire") || n.includes("partner")) return "Partenaire";
  if (n === "manual" || n === "manuel" || n === "autre") return "Saisie manuelle";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Libellé court affiché sur la carte : « Site · mon-voyage », « Partenaire »… */
export function sourceLabel(source: string | null | undefined): string {
  const group = sourceGroup(source);
  const m = /jeitinho\.fr\/(.+)$/i.exec(source ?? "");
  return group === "Site jeitinho.fr" && m ? `Site · ${m[1]}` : group;
}

/* ---------- Contact 1 clic ---------- */

/** Boîte clients : contact@jeitinho.fr = compte Google yesbrazilconciergerie@gmail.com. */
export const CLIENT_MAILBOX = "yesbrazilconciergerie@gmail.com";

/**
 * Numéro au format wa.me (chiffres, indicatif pays inclus). Heuristique :
 * « +… » ou « 00… » = international ; 10 chiffres commençant par 0 = France (0X → 33X) ;
 * 10–11 chiffres sans 0 initial = Brésil (DDD + numéro → 55…), sauf 33 6/7… (France sans +).
 */
export function whatsappDigits(phone: string | null | undefined): string | null {
  const raw = (phone ?? "").trim();
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (raw.startsWith("+")) {
    // déjà international
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.length === 10 && digits.startsWith("0")) {
    digits = `33${digits.slice(1)}`;
  } else if (digits.length === 11 && /^33[67]/.test(digits)) {
    // France saisie sans « + »
  } else if ((digits.length === 10 || digits.length === 11) && !digits.startsWith("0")) {
    digits = `55${digits}`;
  }
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export function whatsappUrl(phone: string | null | undefined, text?: string): string | null {
  const digits = whatsappDigits(phone);
  if (!digits) return null;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function gmailComposeUrl(opts: {
  to: string;
  subject: string;
  body: string;
  account?: string;
}): string {
  const account = opts.account ?? CLIENT_MAILBOX;
  return (
    `https://mail.google.com/mail/?authuser=${encodeURIComponent(account)}&view=cm&fs=1` +
    `&to=${encodeURIComponent(opts.to)}&su=${encodeURIComponent(opts.subject)}` +
    `&body=${encodeURIComponent(opts.body)}`
  );
}

/* ---------- Formats ---------- */

function fmtDay(isoDay: string, withYear: boolean): string {
  const n = dayNumber(isoDay);
  if (Number.isNaN(n)) return isoDay;
  return new Date(n * DAY).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

/** « 01/12 → 04/12/2026 », « 09/02/2027 », ou null si aucune date. */
export function fmtTravelRange(start: string | null, end: string | null): string | null {
  if (!start && !end) return null;
  if (start && end && start !== end) {
    const sameYear = start.slice(0, 4) === end.slice(0, 4);
    return `${fmtDay(start, !sameYear)} → ${fmtDay(end, true)}`;
  }
  return fmtDay((start ?? end) as string, true);
}

/** « il y a 3 j », « il y a 5 h »… */
export function ageLabel(iso: string | null | undefined, now: Date = new Date()): string {
  const t = time(iso);
  if (Number.isNaN(t)) return "—";
  const ms = Math.max(0, now.getTime() - t);
  if (ms < 60_000) return "à l'instant";
  if (ms < HOUR) return `il y a ${Math.floor(ms / 60_000)} min`;
  if (ms < DAY) return `il y a ${Math.floor(ms / HOUR)} h`;
  const days = Math.floor(ms / DAY);
  if (days < 60) return `il y a ${days} j`;
  return `il y a ${Math.floor(days / 30)} mois`;
}

/** Brouillons de premier message (WhatsApp et e-mail), vouvoiement. */
export function contactDrafts(
  d: Pick<Demande, "name" | "travelStart" | "travelEnd" | "pendingQuote">,
): { whatsapp: string; subject: string; email: string } {
  const first = d.name.trim().split(/\s+/)[0] || "";
  const hello = first && first !== "Demande" ? `Bonjour ${first}` : "Bonjour";
  const range = fmtTravelRange(d.travelStart, d.travelEnd);
  const ref = d.pendingQuote ? (d.pendingQuote.number ?? d.pendingQuote.reference) : null;
  const text = d.pendingQuote
    ? `${hello}, c'est Rafael de JEITINHO. Avez-vous pu regarder la proposition que je vous ai envoyée${ref ? ` (réf. ${ref})` : ""} ? Je peux l'ajuster si besoin.`
    : `${hello}, c'est Rafael de JEITINHO. Merci pour votre demande pour Rio${range ? ` (${range})` : ""}. Je vous prépare une proposition sur mesure : avez-vous quelques minutes pour en parler ?`;
  return {
    whatsapp: text,
    subject: d.pendingQuote
      ? `Votre proposition JEITINHO${ref ? ` — ${ref}` : ""}`
      : "Votre séjour à Rio — JEITINHO",
    email: `${text}\n\nRafael\nJEITINHO — contact@jeitinho.fr`,
  };
}

/* ---------- Menu « Passer à… » ---------- */

export type StageTarget = DemandeStage | "spam";

export type StageOption = {
  target: StageTarget;
  label: string;
  current: boolean;
  disabled: boolean;
  hint: string | null;
};

export function stageOptions(
  d: Pick<Demande, "kind" | "stage" | "floor" | "floorReason" | "lead">,
): StageOption[] {
  if (d.kind === "lead") {
    const status = d.lead?.status;
    const options: StageOption[] = STAGES.map((s) => {
      const qualifyFirst = s.key === "devis" || s.key === "negociation";
      const current = s.key === "perdue" ? status === "lost" : !qualifyFirst && d.stage === s.key;
      return {
        target: s.key,
        label: s.label,
        current,
        disabled: current || qualifyFirst,
        hint: qualifyFirst ? "Qualifier d'abord la demande" : null,
      };
    });
    options.push({
      target: "spam",
      label: "Spam",
      current: status === "spam",
      disabled: status === "spam",
      hint: null,
    });
    return options;
  }
  return STAGES.map((s) => {
    const current = d.stage === s.key;
    const belowFloor = s.key !== "perdue" && STAGE_RANK[s.key] < STAGE_RANK[d.floor];
    return {
      target: s.key,
      label: s.label,
      current,
      disabled: current || belowFloor,
      hint: belowFloor ? d.floorReason : null,
    };
  });
}

export type StagePatch = {
  table: "prospects" | "leads";
  id: string;
  patch: Record<string, string | null>;
  /** Valeurs d'avant, pour « Annuler ». */
  previous: Record<string, string | null>;
};

/** Mise à jour à écrire pour faire passer une demande à une étape (null si impossible). */
export function stagePatch(
  d: Pick<Demande, "kind" | "stage" | "prospect" | "lead">,
  target: StageTarget,
  nowIso: string,
): StagePatch | null {
  if (d.kind === "prospect" && d.prospect) {
    if (target === "spam") return null;
    const patch: Record<string, string | null> = { status: PROSPECT_STATUS_BY_STAGE[target] };
    if (target === "contactee" && d.stage === "nouvelle") patch.last_contact_at = nowIso;
    return {
      table: "prospects",
      id: d.prospect.id,
      patch,
      previous: { status: d.prospect.status, last_contact_at: d.prospect.last_contact_at },
    };
  }
  if (d.kind === "lead" && d.lead) {
    const status = target === "spam" ? "spam" : LEAD_STATUS_BY_STAGE[target];
    if (!status) return null;
    const patch: Record<string, string | null> = { status, processed_at: nowIso };
    if (target === "contactee") patch.last_contact_at = nowIso;
    return {
      table: "leads",
      id: d.lead.id,
      patch,
      previous: {
        status: d.lead.status,
        processed_at: d.lead.processed_at,
        last_contact_at: d.lead.last_contact_at,
      },
    };
  }
  return null;
}

/* ---------- Préremplissage du devis : activités → lignes du catalogue ---------- */

/**
 * Associe les activités demandées aux entrées du catalogue (insensible aux accents,
 * à la casse et à la ponctuation) : titre identique d'abord, sinon le plus long titre
 * contenu mot pour mot dans l'activité (« Vérifier disponibilités — Sambodrome — Défilés
 * des écoles » → « Sambodrome — Défilés des écoles »). Les catégories vagues (« Plages »,
 * « Vie nocturne ») ne correspondent à rien et sont ignorées. Sans doublon, dans l'ordre.
 */
export function matchCatalogActivities<T extends { label: string; value?: string }>(
  activities: string[],
  options: T[],
): T[] {
  const indexed = options.map((o) => ({ option: o, norm: normalizeText(o.label) }));
  const picked: T[] = [];
  const seen = new Set<string>();
  for (const activity of activities) {
    const a = normalizeText(activity);
    if (!a) continue;
    let match = indexed.find((o) => o.norm === a);
    if (!match) {
      match = indexed
        .filter((o) => o.norm.length >= 4 && ` ${a} `.includes(` ${o.norm} `))
        .sort((x, y) => y.norm.length - x.norm.length)[0];
    }
    if (!match) continue;
    const id = match.option.value ?? match.norm;
    if (seen.has(id)) continue;
    seen.add(id);
    picked.push(match.option);
  }
  return picked;
}

/* ---------- Libellés ---------- */

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  new: "Nouveau",
  contacted: "Contacté",
  qualified: "Qualifié",
  converted: "Converti",
  lost: "Perdu",
  spam: "Spam",
};

export const QUOTE_STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  refused: "Refusé",
  paid: "Payé",
  ready: "Prêt",
  expired: "Expiré",
};

export const TASK_STATUS_LABEL: Record<string, string> = {
  a_valider: "À valider",
  valide: "Validée",
  envoye: "Envoyée",
  annule: "Annulée",
};

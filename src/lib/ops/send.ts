import { supabase } from "@/integrations/supabase/client";
import { markTaskSent, type CrmTask } from "@/lib/crm/crm";
import { setTaskStatus, type ValidationTask } from "@/lib/ops/ops";

/*
 * « Envoi en 1 clic » (module À valider) : destinataire résolu, découpage du
 * brouillon (notes internes, objet, versions par langue) et liens d'envoi
 * WhatsApp / Gmail / Instagram. Les fonctions pures sont testables sans base.
 */

// Vue récente : typage souple, les types générés restent la référence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

/* ---------- Comptes Gmail ---------- */

/** Comptes Google utilisés pour le lien de rédaction (paramètre authuser). */
export const GMAIL_ACCOUNTS = {
  /** Boîte contact@jeitinho.fr : clients, leads, réservations. */
  contact: "yesbrazilconciergerie@gmail.com",
  /** Boîte perso : partenaires, relais, revendeurs. */
  perso: "rafaellordao@gmail.com",
} as const;
export type GmailBox = keyof typeof GMAIL_ACCOUNTS;

export const GMAIL_BOX_LABELS: Record<GmailBox, string> = {
  contact: "contact@jeitinho.fr",
  perso: "boîte perso",
};

/** Boîte d'envoi par type de tâche. Les kinds `reservation_*` absents d'ici vont sur contact. */
export const GMAIL_BOX_BY_KIND: Record<string, GmailBox> = {
  reponse_lead: "contact",
  nouveau_lead: "contact",
  relance_devis: "contact",
  relance_paiement: "contact",
  bienvenue_voyage: "contact",
  demande_avis: "contact",
  ota_reservation: "contact",
  reservation_en_attente: "contact",
  reservation_payee: "contact",
  upsell_manuel: "contact",
  partenaire_afrolove: "perso",
  relance_revendeur: "perso",
  candidature_partenaire: "perso",
};

export function gmailBoxFor(kind: string, recipientType?: string | null): GmailBox {
  const box = GMAIL_BOX_BY_KIND[kind];
  if (box) return box;
  if (kind.startsWith("reservation_")) return "contact";
  return recipientType === "partner" ? "perso" : "contact";
}

/* ---------- Numéros de téléphone ---------- */

export type Phone = {
  /** Chiffres au format international, sans « + » (prêt pour wa.me). */
  digits: string;
  /** Indicatif pays (« 55 », « 33 »…). */
  countryCode: string;
  /** Affichage lisible : « +55 21 99999-8888 », « +33 6 12 34 56 78 ». */
  display: string;
};

/** Indicatifs considérés comme francophones pour le choix de la langue par défaut. */
export const FRANCOPHONE_CODES = [
  "33",
  "32",
  "41",
  "352",
  "377",
  "262",
  "269",
  "508",
  "590",
  "594",
  "596",
  "681",
  "687",
  "689",
];

const CC_ONE_DIGIT = ["1", "7"];
const CC_TWO_DIGITS = new Set(
  "20 27 30 31 32 33 34 36 39 40 41 43 44 45 46 47 48 49 51 52 53 54 55 56 57 58 60 61 62 63 64 65 66 81 82 84 86 90 91 92 93 94 95 98".split(
    " ",
  ),
);
// Pays où un « 0 » national est parfois laissé après l'indicatif (+33 0 6…).
const TRUNK_ZERO_CODES = ["55", "33", "32", "41", "44", "49"];

function countryCodeOf(digits: string): string {
  if (CC_ONE_DIGIT.includes(digits[0])) return digits.slice(0, 1);
  if (CC_TWO_DIGITS.has(digits.slice(0, 2))) return digits.slice(0, 2);
  return digits.slice(0, 3);
}

function groupDigits(rest: string): string {
  const parts: string[] = [];
  for (let i = 0; i < rest.length; i += 3) parts.push(rest.slice(i, i + 3));
  if (parts.length > 1 && parts[parts.length - 1].length === 1) {
    parts[parts.length - 2] += parts.pop();
  }
  return parts.join(" ");
}

function formatPhone(digits: string, cc: string): string {
  const rest = digits.slice(cc.length);
  if (cc === "55" && (rest.length === 10 || rest.length === 11)) {
    const ddd = rest.slice(0, 2);
    const num = rest.slice(2);
    const cut = num.length - 4;
    return `+55 ${ddd} ${num.slice(0, cut)}-${num.slice(cut)}`;
  }
  if (cc === "33" && rest.length === 9) {
    return `+33 ${rest[0]} ${rest.slice(1).replace(/(\d{2})(?=\d)/g, "$1 ")}`;
  }
  return `+${cc} ${groupDigits(rest)}`;
}

/**
 * Normalise un numéro saisi à la main :
 * - « + » ou « 00 » initial → indicatif conservé ;
 * - 10–11 chiffres sans 0 initial → Brésil (55 + DDD + numéro) ;
 * - 10 chiffres commençant par 0 → France (33 + numéro sans le 0) ;
 * - 11–12 chiffres commençant par 0 → Brésil avec 0 interurbain (055 / 021…) ;
 * - 12–15 chiffres sans 0 initial → déjà au format international.
 * Renvoie null si le numéro est inexploitable.
 */
export function normalizePhone(raw: string | null | undefined): Phone | null {
  const src = (raw ?? "").trim().replace(/\(0\)/g, "");
  let digits = src.replace(/\D/g, "");
  if (!digits) return null;
  let intl = false;
  if (src.startsWith("+")) intl = true;
  else if (digits.startsWith("00")) {
    intl = true;
    digits = digits.slice(2);
  }
  if (intl) {
    const cc = countryCodeOf(digits);
    if (TRUNK_ZERO_CODES.includes(cc) && digits[cc.length] === "0") {
      digits = cc + digits.slice(cc.length + 1);
    }
  } else if (/^[1-9]\d{9,10}$/.test(digits)) digits = `55${digits}`;
  else if (/^0[1-9]\d{8}$/.test(digits)) digits = `33${digits.slice(1)}`;
  else if (/^0[1-9]\d{9,10}$/.test(digits)) digits = `55${digits.slice(1)}`;
  else if (!/^[1-9]\d{11,14}$/.test(digits)) return null;

  if (digits.length < 8 || digits.length > 15 || digits.startsWith("0")) return null;
  const countryCode = countryCodeOf(digits);
  return { digits, countryCode, display: formatPhone(digits, countryCode) };
}

/* ---------- Autres contacts ---------- */

const IG_RESERVED = new Set([
  "p",
  "reel",
  "reels",
  "stories",
  "explore",
  "direct",
  "accounts",
  "tv",
]);

/** « @handle », « instagram.com/handle/ », « ig.me/m/handle » → « handle ». */
export function instagramHandle(raw: string | null | undefined): string | null {
  let s = (raw ?? "").trim();
  if (!s) return null;
  const url = /(?:instagram\.com|instagr\.am|ig\.me\/m)\/([^/?#\s]+)/i.exec(s);
  if (url) s = url[1];
  s = s.replace(/^@+/, "").trim();
  if (IG_RESERVED.has(s.toLowerCase())) return null;
  return /^[A-Za-z0-9._]{1,30}$/.test(s) ? s : null;
}

export function cleanEmail(raw: string | null | undefined): string | null {
  const s = (raw ?? "")
    .trim()
    .replace(/^mailto:/i, "")
    .trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? s : null;
}

/* ---------- Découpage du brouillon ---------- */

export type Lang = "pt" | "fr" | "en" | "es" | "de" | "it";

export const LANG_LABELS: Record<Lang, string> = {
  pt: "PT",
  fr: "FR",
  en: "EN",
  es: "ES",
  de: "DE",
  it: "IT",
};

const FLAG_LANG: Record<string, Lang> = {
  "🇧🇷": "pt",
  "🇵🇹": "pt",
  "🇫🇷": "fr",
  "🇬🇧": "en",
  "🇺🇸": "en",
  "🇩🇪": "de",
  "🇪🇸": "es",
  "🇮🇹": "it",
};

const CODE_LANG: Record<string, Lang> = {
  PT: "pt",
  BR: "pt",
  FR: "fr",
  EN: "en",
  ES: "es",
  DE: "de",
  IT: "it",
};

// « 🇧🇷 … » (drapeau connu, en début de ligne)
const FLAG_MARKER = /^\s*(\p{Regional_Indicator}{2})[ \t]*/u;
// « PT — … », « EN: … », « FR - … » (code en majuscules suivi d'un séparateur)
const CODE_MARKER = /^\s*(PT|BR|FR|EN|ES|DE|IT)(?:-[A-Z]{2})?[ \t]*(?:—|–|:|-(?=\s))[ \t]*/;
// Après un drapeau : « 🇧🇷 PT — … » ou « 🇧🇷 — … »
const AFTER_FLAG = /^(?:(?:PT|BR|FR|EN|ES|DE|IT)[ \t]*(?:—|–|:|-(?=\s)|$)|—|–|:)[ \t]*/;
const SUBJECT_LINE = /^\s*(?:objet|subject|assunto)\s*:\s*(.*)$/iu;
const CHECK_PREFIX = /^(?:à|a)\s+v[ée]rifier\s*:?\s*/iu;

export type DraftSection = {
  key: string;
  lang: Lang | null;
  /** Libellé de la puce (« PT », « EN »…). */
  label: string;
  /** Marqueur trouvé dans le brouillon (drapeau ou code). */
  marker: string;
  /** Objet propre à la section (« Assunto: … » en tête de section). */
  subject: string | null;
  text: string;
};

export type ParsedDraft = {
  /** Points à vérifier (blocs [entre crochets] en tête), jamais envoyés. */
  notes: string[];
  /** Ligne « Objet : / Subject: / Assunto: » en tête, retirée du corps. */
  subject: string | null;
  /** Brouillon sans notes ni objet, marqueurs de langue conservés (puce « Tout »). */
  body: string;
  sections: DraftSection[];
  /** Texte commun placé avant la première version (ajouté à chaque version). */
  header: string | null;
  /** Signature commune (dernière ligne courte après la dernière version). */
  footer: string | null;
};

function closingBracket(s: string): number {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "[") depth++;
    else if (s[i] === "]" && --depth === 0) return i;
  }
  return -1;
}

function stripLeading(src: string) {
  const notes: string[] = [];
  let subject: string | null = null;
  let subjectSeen = false;
  let rest = src;
  for (;;) {
    const trimmed = rest.replace(/^\s+/, "");
    if (trimmed.startsWith("[")) {
      const end = closingBracket(trimmed);
      const lineEnd = trimmed.indexOf("\n", end);
      const after = end < 0 ? "" : trimmed.slice(end + 1, lineEnd < 0 ? undefined : lineEnd);
      // Bloc de note = lignes entières entre crochets (« [Prénom], … » reste du texte).
      if (end > 0 && !after.trim()) {
        const note = trimmed.slice(1, end).trim().replace(CHECK_PREFIX, "").trim();
        if (note) notes.push(note);
        rest = trimmed.slice(end + 1);
        continue;
      }
    }
    const nl = trimmed.indexOf("\n");
    const firstLine = nl < 0 ? trimmed : trimmed.slice(0, nl);
    const m = subjectSeen ? null : SUBJECT_LINE.exec(firstLine);
    if (m) {
      subjectSeen = true;
      subject = m[1].trim() || null;
      rest = nl < 0 ? "" : trimmed.slice(nl + 1);
      continue;
    }
    rest = trimmed;
    break;
  }
  return { notes, subject, rest };
}

function matchMarker(line: string): { marker: string; lang: Lang | null; rest: string } | null {
  const flag = FLAG_MARKER.exec(line);
  if (flag) {
    const after = line.slice(flag[0].length);
    return {
      marker: flag[1],
      lang: FLAG_LANG[flag[1]] ?? null,
      rest: after.replace(AFTER_FLAG, ""),
    };
  }
  const code = CODE_MARKER.exec(line);
  if (code) return { marker: code[1], lang: CODE_LANG[code[1]], rest: line.slice(code[0].length) };
  return null;
}

/** Découpe un brouillon d'agent : notes [à vérifier], objet, versions par langue. */
export function parseDraft(draft: string | null | undefined): ParsedDraft {
  const { notes, subject, rest } = stripLeading((draft ?? "").replace(/\r\n?/g, "\n"));
  const body = rest.trim();

  const pre: string[] = [];
  const raw: { marker: string; lang: Lang | null; lines: string[] }[] = [];
  for (const line of body.split("\n")) {
    const mk = matchMarker(line);
    if (mk) raw.push({ marker: mk.marker, lang: mk.lang, lines: [mk.rest] });
    else (raw.length ? raw[raw.length - 1].lines : pre).push(line);
  }

  const used = new Map<string, number>();
  const sections: DraftSection[] = raw.map((s, i) => {
    let text = s.lines.join("\n").trim();
    let secSubject: string | null = null;
    const nl = text.indexOf("\n");
    const m = SUBJECT_LINE.exec(nl < 0 ? text : text.slice(0, nl));
    if (m) {
      secSubject = m[1].trim() || null;
      text = (nl < 0 ? "" : text.slice(nl + 1)).trim();
    }
    const base = s.lang ?? `s${i}`;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const label = s.lang ? LANG_LABELS[s.lang] : s.marker;
    return {
      key: n === 1 ? base : `${base}-${n}`,
      lang: s.lang,
      label: n === 1 ? label : `${label} ${s.marker}`,
      marker: s.marker,
      subject: secSubject,
      text,
    };
  });

  let header: string | null = null;
  let footer: string | null = null;
  if (sections.length) {
    header = pre.join("\n").trim() || null;
    const last = sections[sections.length - 1];
    const m = sections.length > 1 ? /\n[ \t]*\n\s*([^\n]+?)\s*$/.exec(last.text) : null;
    if (m && m[1].length <= 60 && !/[.!?:;,]$/.test(m[1])) {
      footer = m[1];
      last.text = last.text.slice(0, m.index).trimEnd();
    }
  }
  return { notes, subject, body, sections, header, footer };
}

/** Texte final et objet pour la version choisie (`"all"` = brouillon complet). */
export function composeMessage(
  parsed: ParsedDraft,
  key: string,
): { text: string; subject: string | null } {
  const section = key === "all" ? undefined : parsed.sections.find((s) => s.key === key);
  if (!section) return { text: parsed.body, subject: parsed.subject };
  const text = [parsed.header, section.text, parsed.footer].filter(Boolean).join("\n\n");
  return { text, subject: section.subject ?? parsed.subject };
}

/** PT si numéro brésilien, sinon FR si francophone, sinon EN, sinon la première version. */
export function defaultLangKey(
  parsed: ParsedDraft,
  phone: Phone | null,
  email?: string | null,
): string {
  if (!parsed.sections.length) return "all";
  const prefs: Lang[] = [];
  const cc = phone?.countryCode;
  if (cc === "55") prefs.push("pt");
  else if (cc && FRANCOPHONE_CODES.includes(cc)) prefs.push("fr");
  else if (!cc && email) {
    const tld = email.toLowerCase().split(".").pop();
    if (tld === "br") prefs.push("pt");
    else if (tld === "fr" || tld === "be") prefs.push("fr");
  }
  prefs.push("en");
  for (const lang of prefs) {
    const s = parsed.sections.find((x) => x.lang === lang);
    if (s) return s.key;
  }
  return parsed.sections[0].key;
}

/** Repères oubliés dans le texte envoyé : [prénom], {{date}}… */
export function findPlaceholders(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/\[[^\]\n]{1,60}\](?!\()|\{\{[^}\n]{1,40}\}\}/g)) out.add(m[0]);
  return [...out];
}

const TITLE_PREFIX =
  /^(?:pitch|relance(?:\s+\d+|\s+paiement)?|nouveau\s+lead|nouvelle\s+demande|réponse(?:\s+(?:au|à\s+un|lead|demande))*|candidature\s+partenaire|suivi\s+acheteur|gyg\s+[a-z0-9]+)\b\s*(?:[—–:-]\s*)?/iu;

/** Objet dérivé du titre de la tâche, sans le préfixe technique (« Pitch », « Relance 1 — »…). */
export function subjectFromTitle(title: string): string {
  const s = title
    .trim()
    .replace(TITLE_PREFIX, "")
    .replace(/^[—–:-]\s*/, "")
    .trim();
  return s || "JEITINHO";
}

/* ---------- Liens d'envoi ---------- */

export function whatsappUrl(digits: string, text?: string): string {
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}

export function gmailComposeUrl(p: {
  account: string;
  to: string;
  subject: string;
  body: string;
}): string {
  const q = (k: string, v: string) => `${k}=${encodeURIComponent(v)}`;
  return `https://mail.google.com/mail/?${[
    q("authuser", p.account),
    "view=cm",
    "fs=1",
    q("to", p.to),
    q("su", p.subject),
    q("body", p.body),
  ].join("&")}`;
}

/** Profil Instagram (sur téléphone, ouvert dans l'appli par src/lib/open-links.ts). */
export function instagramDmUrl(handle: string | null): string {
  return handle ? `https://www.instagram.com/${handle}/` : "https://www.instagram.com/";
}

/* ---------- Plan d'envoi d'une tâche ---------- */

export const SEND_CHANNELS = ["whatsapp", "email", "instagram"] as const;
export type SendChannel = (typeof SEND_CHANNELS)[number];

export const CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  email: "E-mail",
  instagram: "Instagram",
  getyourguide: "GetYourGuide",
};

/** Onglet nommé : les envois WhatsApp/Instagram successifs réutilisent le même onglet. */
export const CHANNEL_TARGETS: Record<SendChannel, string> = {
  whatsapp: "jeitinho-whatsapp",
  email: "_blank",
  instagram: "jeitinho-instagram",
};

export type TaskRecipient = {
  task_id: string;
  recipient_type: "partner" | "client" | "lead" | "prospect" | null;
  recipient_name: string | null;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  client_id: string | null;
  prospect_id: string | null;
};

export type Contact = {
  name: string;
  type: TaskRecipient["recipient_type"];
  phone: Phone | null;
  /** Numéro brut quand il n'a pas pu être normalisé. */
  rawPhone: string | null;
  email: string | null;
  instagram: string | null;
  clientId: string | null;
};

export type SendOption = {
  channel: SendChannel;
  href: string;
  /** Instagram : le texte est copié avant d'ouvrir la conversation. */
  copyFirst: boolean;
  /** Coordonnée utilisée (numéro formaté, e-mail, @handle). */
  target: string;
  gmailBox: GmailBox | null;
};

export type SendPlan = {
  contact: Contact;
  parsed: ParsedDraft;
  langKey: string;
  text: string;
  /** Objet de l'e-mail (si envoi par e-mail possible). */
  subject: string;
  hasDraft: boolean;
  /** Canal prévu par l'agent (task.channel). */
  planned: string;
  /** Envoi principal : canal prévu, si son contact est connu. */
  primary: SendOption | null;
  /** Autres canaux possibles avec les contacts connus. */
  alternatives: SendOption[];
  /** Pourquoi il n'y a pas d'envoi direct : contact manquant ou canal non géré. */
  missing: "contact" | "channel" | null;
  placeholders: string[];
};

export type ChannelBucket = SendChannel | "sans_contact" | "autre";

export function contactFor(task: ValidationTask, r: TaskRecipient | undefined): Contact {
  const rawPhone = r?.phone?.trim() || null;
  const phone = normalizePhone(rawPhone);
  const fallbackName =
    task.title
      .split(/\s+[—–]\s+/)
      .slice(1)
      .join(" — ") || task.title;
  return {
    name: r?.recipient_name?.trim() || fallbackName,
    type: r?.recipient_type ?? null,
    phone,
    rawPhone: phone ? null : rawPhone,
    email: cleanEmail(r?.email),
    instagram: instagramHandle(r?.instagram),
    clientId: task.client_id ?? r?.client_id ?? null,
  };
}

export function planSend(
  task: ValidationTask,
  recipient: TaskRecipient | undefined,
  opts: { lang?: string } = {},
): SendPlan {
  const contact = contactFor(task, recipient);
  const parsed = parseDraft(task.message_draft);
  const auto = defaultLangKey(parsed, contact.phone, contact.email);
  const langKey =
    opts.lang && (opts.lang === "all" || parsed.sections.some((s) => s.key === opts.lang))
      ? opts.lang
      : auto;
  const composed = composeMessage(parsed, langKey);
  const text = composed.text;
  const subject = composed.subject || subjectFromTitle(task.title);
  const box = gmailBoxFor(task.kind, contact.type);

  const options: SendOption[] = [];
  if (contact.phone)
    options.push({
      channel: "whatsapp",
      href: whatsappUrl(contact.phone.digits, text),
      copyFirst: false,
      target: contact.phone.display,
      gmailBox: null,
    });
  if (contact.email)
    options.push({
      channel: "email",
      href: gmailComposeUrl({
        account: GMAIL_ACCOUNTS[box],
        to: contact.email,
        subject,
        body: text,
      }),
      copyFirst: false,
      target: contact.email,
      gmailBox: box,
    });
  if (contact.instagram)
    options.push({
      channel: "instagram",
      href: instagramDmUrl(contact.instagram),
      copyFirst: true,
      target: `@${contact.instagram}`,
      gmailBox: null,
    });

  const known = (SEND_CHANNELS as readonly string[]).includes(task.channel);
  const primary = options.find((o) => o.channel === task.channel) ?? null;
  return {
    contact,
    parsed,
    langKey,
    text,
    subject,
    hasDraft: text.trim().length > 0,
    planned: task.channel,
    primary,
    alternatives: options.filter((o) => o !== primary),
    missing: primary ? null : known ? "contact" : "channel",
    placeholders: findPlaceholders(text),
  };
}

export function bucketOf(plan: SendPlan): ChannelBucket {
  if (plan.primary) return plan.primary.channel;
  return plan.missing === "channel" ? "autre" : "sans_contact";
}

/** Pourquoi l'envoi direct n'est pas possible (texte affiché sous la carte). */
export function missingReason(plan: SendPlan): string {
  if (plan.missing === "channel")
    return `Canal ${CHANNEL_LABELS[plan.planned] ?? plan.planned} : copier le message et l'envoyer depuis la plateforme.`;
  if (plan.planned === "whatsapp")
    return plan.contact.rawPhone
      ? `Numéro « ${plan.contact.rawPhone} » non reconnu (indicatif manquant ?).`
      : "Pas de numéro WhatsApp sur la fiche.";
  if (plan.planned === "email") return "Pas d'e-mail sur la fiche.";
  if (plan.planned === "instagram") return "Pas de compte Instagram sur la fiche.";
  return "Contact manquant.";
}

/* ---------- Données ---------- */

export async function fetchTaskRecipients(taskIds: string[]): Promise<TaskRecipient[]> {
  if (!taskIds.length) return [];
  return check(
    await db
      .from("v_task_recipients")
      .select("task_id,recipient_type,recipient_name,phone,email,instagram,client_id,prospect_id")
      .in("task_id", taskIds),
  );
}

export type Undo = () => Promise<void>;

async function restoreTask(id: string, status: string) {
  check(
    await db
      .from("crm_tasks")
      .update({ status: status === "valide" ? "valide" : "a_valider", handled_at: null })
      .eq("id", id),
  );
}

/**
 * Passe la tâche en « envoyé ». Le trigger SQL crm_tasks_sent_sync met à jour
 * partenaire / client / lead. Renvoie la fonction d'annulation.
 */
export async function markSent(task: ValidationTask): Promise<Undo> {
  if (task.kind !== "relance_devis") {
    await setTaskStatus(task.id, "envoye");
    return () => restoreTask(task.id, task.status);
  }
  // markTaskSent fait avancer la relance du devis : on garde de quoi revenir en arrière.
  let quote: {
    followup_stage: number | null;
    last_contact_at: string | null;
    next_action: string | null;
  } | null = null;
  if (task.quote_id && task.stage) {
    const res = await db
      .from("quotes")
      .select("followup_stage,last_contact_at,next_action")
      .eq("id", task.quote_id)
      .maybeSingle();
    if (!res.error) quote = res.data;
  }
  await markTaskSent(task as unknown as CrmTask);
  return async () => {
    await restoreTask(task.id, task.status);
    if (quote && task.quote_id)
      check(await db.from("quotes").update(quote).eq("id", task.quote_id));
  };
}

export async function discardTask(task: ValidationTask): Promise<Undo> {
  await setTaskStatus(task.id, "annule");
  return () => restoreTask(task.id, task.status);
}

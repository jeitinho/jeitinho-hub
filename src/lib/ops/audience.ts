import { supabase } from "@/integrations/supabase/client";

/*
 * Module Audience : base contacts événementiels (audience_contacts).
 * Tout est filtré, compté et paginé côté serveur (la base dépassera 6 000 lignes).
 * Lecture/écriture via RLS (can_manage).
 */

// Table récente : typage souple, les types générés restent la référence.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return (res.data ?? ([] as unknown)) as T;
}

function checkCount(res: { count: number | null; error: { message: string } | null }): number {
  if (res.error) throw new Error(res.error.message);
  return res.count ?? 0;
}

export type AudienceContact = {
  id: string;
  external_ref: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  zone: string | null;
  age: number | null;
  gender: string | null;
  newsletter_optin: boolean;
  notifications_optin: boolean;
  added_at: string | null;
  last_purchase_at: string | null;
  tickets_count: number | null;
  events_count: number | null;
  total_spent: number | null;
  origin: string | null;
  recency: string | null;
  engagement: string | null;
  score: number | null;
  segment: string;
  tags: string[];
  created_at: string;
};

const COLUMNS =
  "id,external_ref,first_name,last_name,email,phone,country,city,zone,age,gender,newsletter_optin,notifications_optin,added_at,last_purchase_at,tickets_count,events_count,total_spent,origin,recency,engagement,score,segment,tags,created_at";

export const ENGAGEMENTS = [
  "PRIORITAIRE_REACTIVATION",
  "REACTIVATION",
  "ENRICHISSEMENT",
  "NURTURE",
] as const;

export const ENGAGEMENT_LABELS: Record<string, string> = {
  PRIORITAIRE_REACTIVATION: "Réactivation prioritaire",
  REACTIVATION: "Réactivation",
  ENRICHISSEMENT: "Enrichissement",
  NURTURE: "Nurture",
};

export const GENDER_LABELS: Record<string, string> = {
  female: "Femme",
  male: "Homme",
  other: "Autre",
};

export const ORIGIN_LABELS: Record<string, string> = {
  BASE_CLIENTS: "Base clients",
  MIXTE: "Mixte",
};

export const PAGE_SIZE = 50;
export const EXPORT_MAX = 10_000;
// Limite de lignes par requête PostgREST (max_rows Supabase par défaut).
const FETCH_CHUNK = 1000;

export type BuyerFilter = "all" | "recent" | "ever" | "never";
export type OptinFilter = "all" | "newsletter" | "no_newsletter" | "notifications";

export type AudienceFilters = {
  q: string;
  engagement: string; // "all" | valeur
  zone: string; // "all" | "__none" | valeur
  origin: string; // "all" | valeur
  optin: OptinFilter;
  buyer: BuyerFilter;
};

export const EMPTY_FILTERS: AudienceFilters = {
  q: "",
  engagement: "all",
  zone: "all",
  origin: "all",
  optin: "all",
  buyer: "all",
};

/** Début de la fenêtre « acheteurs récents » (24 mois glissants). */
export function recentBuyerSince(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 24);
  return d.toISOString();
}

// Les caractères , ( ) * % casseraient la syntaxe or=() de PostgREST.
function cleanToken(t: string) {
  return t.replace(/[,()*%\\"]/g, "").trim();
}

/** Applique recherche + filtres sur un builder PostgREST. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, f: AudienceFilters) {
  let q = query;
  const tokens = f.q.split(/\s+/).map(cleanToken).filter(Boolean);
  for (const t of tokens) {
    // Valeurs entre guillemets : les « . » et « : » d'un e-mail restent littéraux.
    const ors = [`first_name.ilike."*${t}*"`, `last_name.ilike."*${t}*"`, `email.ilike."*${t}*"`];
    const digits = t.replace(/\D/g, "");
    if (digits.length >= 3) {
      ors.push(`phone.ilike."*${digits}*"`);
      // 06… saisi à la française → +336… en base
      if (digits.startsWith("0")) ors.push(`phone.ilike."*${digits.slice(1)}*"`);
    }
    q = q.or(ors.join(","));
  }
  if (f.engagement !== "all") q = q.eq("engagement", f.engagement);
  if (f.zone === "__none") q = q.is("zone", null);
  else if (f.zone !== "all") q = q.eq("zone", f.zone);
  if (f.origin !== "all") q = q.eq("origin", f.origin);
  if (f.optin === "newsletter") q = q.eq("newsletter_optin", true);
  if (f.optin === "no_newsletter") q = q.eq("newsletter_optin", false);
  if (f.optin === "notifications") q = q.eq("notifications_optin", true);
  if (f.buyer === "recent") q = q.gte("last_purchase_at", recentBuyerSince());
  if (f.buyer === "ever") q = q.not("last_purchase_at", "is", null);
  if (f.buyer === "never") q = q.is("last_purchase_at", null);
  return q;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ordered(query: any) {
  return query
    .order("last_purchase_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: true });
}

export async function fetchAudiencePage(
  f: AudienceFilters,
  page: number,
): Promise<{ rows: AudienceContact[]; total: number }> {
  const from = page * PAGE_SIZE;
  const res = await ordered(
    applyFilters(db.from("audience_contacts").select(COLUMNS, { count: "exact" }), f),
  ).range(from, from + PAGE_SIZE - 1);
  return { rows: check<AudienceContact[]>(res), total: res.count ?? 0 };
}

async function countWhere(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  build: (q: any) => any = (q) => q,
): Promise<number> {
  return checkCount(
    await build(db.from("audience_contacts").select("id", { count: "exact", head: true })),
  );
}

export type AudienceStats = {
  total: number;
  newsletter: number;
  withEmail: number;
  withPhone: number;
  recentBuyers: number;
  engagement: { key: string; count: number }[];
  gender: { key: string; count: number }[];
};

export async function fetchAudienceStats(): Promise<AudienceStats> {
  const since = recentBuyerSince();
  const genders = ["female", "male", "other"];
  const [total, newsletter, withEmail, withPhone, recentBuyers, ...rest] = await Promise.all([
    countWhere(),
    countWhere((q) => q.eq("newsletter_optin", true)),
    countWhere((q) => q.not("email", "is", null).neq("email", "")),
    countWhere((q) => q.not("phone", "is", null).neq("phone", "")),
    countWhere((q) => q.gte("last_purchase_at", since)),
    ...ENGAGEMENTS.map((e) => countWhere((q) => q.eq("engagement", e))),
    ...genders.map((g) => countWhere((q) => q.eq("gender", g))),
  ]);
  const engCounts = rest.slice(0, ENGAGEMENTS.length);
  const genCounts = rest.slice(ENGAGEMENTS.length);
  const engagement: Dimension = ENGAGEMENTS.map((key, i) => ({ key, count: engCounts[i] }));
  const engOther = total - engCounts.reduce((s, n) => s + n, 0);
  if (engOther > 0) engagement.push({ key: "__none", count: engOther });
  const gender: Dimension = genders.map((key, i) => ({ key, count: genCounts[i] }));
  const genOther = total - genCounts.reduce((s, n) => s + n, 0);
  if (genOther > 0) gender.push({ key: "__none", count: genOther });
  return { total, newsletter, withEmail, withPhone, recentBuyers, engagement, gender };
}

export type Dimension = { key: string; count: number }[];

/**
 * Répartition par zone + liste des origines. PostgREST n'agrège pas (GROUP BY) :
 * on lit uniquement les colonnes zone/origin par blocs de 1 000 lignes.
 * Voir le SQL proposé (fonction audience_breakdown) pour passer à une seule requête.
 */
export async function fetchAudienceDimensions(): Promise<{ zones: Dimension; origins: Dimension }> {
  const zones = new Map<string, number>();
  const origins = new Map<string, number>();
  for (let from = 0; ; from += FETCH_CHUNK) {
    const rows = check<{ zone: string | null; origin: string | null }[]>(
      await db
        .from("audience_contacts")
        .select("zone,origin")
        .order("id")
        .range(from, from + FETCH_CHUNK - 1),
    );
    for (const r of rows) {
      const z = r.zone ?? "__none";
      zones.set(z, (zones.get(z) ?? 0) + 1);
      if (r.origin) origins.set(r.origin, (origins.get(r.origin) ?? 0) + 1);
    }
    if (rows.length < FETCH_CHUNK) break;
  }
  const sort = (m: Map<string, number>) =>
    [...m.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count);
  return { zones: sort(zones), origins: sort(origins) };
}

export async function updateAudienceTags(id: string, tags: string[]) {
  check(await db.from("audience_contacts").update({ tags }).eq("id", id));
}

/** Charge la sélection filtrée par pages de 1 000 (max EXPORT_MAX). */
export async function fetchAudienceForExport(
  f: AudienceFilters,
  onProgress?: (loaded: number) => void,
): Promise<AudienceContact[]> {
  const out: AudienceContact[] = [];
  while (out.length < EXPORT_MAX) {
    const from = out.length;
    const to = Math.min(from + FETCH_CHUNK, EXPORT_MAX) - 1;
    const rows = check<AudienceContact[]>(
      await ordered(applyFilters(db.from("audience_contacts").select(COLUMNS), f)).range(from, to),
    );
    out.push(...rows);
    onProgress?.(out.length);
    if (rows.length < to - from + 1) break;
  }
  return out;
}

const CSV_COLUMNS: (keyof AudienceContact)[] = [
  "external_ref",
  "first_name",
  "last_name",
  "email",
  "phone",
  "country",
  "city",
  "zone",
  "age",
  "gender",
  "newsletter_optin",
  "notifications_optin",
  "added_at",
  "last_purchase_at",
  "tickets_count",
  "events_count",
  "total_spent",
  "origin",
  "recency",
  "engagement",
  "score",
  "segment",
  "tags",
];

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = Array.isArray(v) ? v.join("|") : typeof v === "boolean" ? (v ? "1" : "0") : String(v);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** CSV séparateur « ; » + BOM UTF-8 (ouverture directe dans Excel FR). */
export function toCsv(rows: AudienceContact[]): string {
  const lines = [CSV_COLUMNS.join(";")];
  for (const r of rows) lines.push(CSV_COLUMNS.map((c) => csvCell(r[c])).join(";"));
  return "﻿" + lines.join("\r\n");
}

export function downloadText(content: string, filename: string, mime = "text/csv;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function contactName(c: Pick<AudienceContact, "first_name" | "last_name" | "email">) {
  const n = [c.first_name, c.last_name].filter(Boolean).join(" ").trim();
  return n || c.email || "Sans nom";
}

export function waLink(phone: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 8 ? `https://wa.me/${digits}` : null;
}

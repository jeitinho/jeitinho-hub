/**
 * Migration ponctuelle : importe les expériences de jeitinho.fr
 * (source de vérité pour prix/descriptions, cf. consigne) dans la
 * table `experiences` de Supabase B (ce hub).
 *
 * NE RIEN EXÉCUTER AUTOMATIQUEMENT — script fourni pour revue et
 * exécution manuelle par un opérateur, après avoir vérifié le
 * --dry-run. N'a jamais été lancé par l'agent qui l'a écrit.
 *
 * Prérequis :
 *   - Un checkout local du repo `jeitinho` (pour lire src/data/catalog.ts)
 *   - SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY du projet hub en env
 *   - `bun add -D tsx` ou équivalent pour exécuter ce fichier
 *
 * Usage :
 *   tsx scripts/migrate-experiences-from-jeitinho.ts \
 *     --source ../jeitinho \
 *     --dry-run            # ne fait AUCUNE écriture, affiche le plan
 *
 *   tsx scripts/migrate-experiences-from-jeitinho.ts \
 *     --source ../jeitinho  # exécute réellement l'upsert
 *
 * Comportement :
 *   - Lit `experiences` et `categories` exportés par src/data/catalog.ts
 *     du dépôt jeitinho.fr (import dynamique du module TS — nécessite
 *     que le fichier n'ait pas de dépendances non résolvables hors du
 *     bundler Vite ; à date, catalog.ts importe des `.asset.json` /
 *     images Vite qui NE RÉSOUDRONT PAS sous Node/tsx nu. Deux options
 *     réalistes, à trancher avec l'auteur avant exécution :
 *       (a) adapter temporairement les imports d'assets par des mocks
 *           (le script exporte un flag STRIP_ASSET_IMPORTS plus bas), ou
 *       (b) faire tourner ce script via `vite-node` (résout les mêmes
 *           alias que l'app) plutôt que `tsx` nu.
 *     Ce script suppose (b) par défaut — voir note en bas de fichier.
 *   - Mappe chaque `category.slug` de catalog.ts vers une ligne
 *     `categories_experiences` (upsert par slug).
 *   - Mappe chaque `Experience` vers une ligne `experiences` (upsert
 *     par slug — idempotent, peut être relancé sans dupliquer).
 *   - NE TOUCHE À AUCUNE LIGNE EXISTANTE dont le slug ne correspond
 *     pas à une expérience de catalog.ts (pas de DELETE).
 */

import { createClient } from "@supabase/supabase-js";
import { parseArgs } from "node:util";

// ⚠️ Import direct du module source de jeitinho.fr — à faire tourner
// avec vite-node depuis un checkout local du repo `jeitinho` inclus
// dans le resolve path, OU à remplacer par un chargement JSON si vous
// préférez exporter catalog.ts -> catalog.json au préalable côté
// jeitinho.fr (plus simple, recommandé).
// import { experiences as SOURCE_EXPERIENCES, categories as SOURCE_CATEGORIES } from "../../jeitinho/src/data/catalog";

type SourceExperience = {
  slug: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  groupSize?: string;
  price: number | null;
  priceLabel?: string;
  transport: "Inclus" | "Non inclus" | "—";
  image: string;
  gallery?: string[];
  included?: string[];
  options?: { label: string; priceDelta: number }[];
  locations?: string[];
  requiresPhysical?: boolean;
  note?: string;
  itinerary?: { title: string; description: string }[];
};

type SourceCategory = { slug: string; label: string; tagline: string; image: string };

const { values } = parseArgs({
  options: {
    source: { type: "string" },
    "dry-run": { type: "boolean", default: false },
  },
});

async function main() {
  if (!values.source) {
    console.error("Usage: tsx migrate-experiences-from-jeitinho.ts --source <chemin-vers-repo-jeitinho> [--dry-run]");
    process.exit(1);
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error("SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis en variables d'environnement.");
    process.exit(1);
  }

  // Remplacer par l'import statique en haut de fichier une fois le
  // problème de résolution des assets tranché (voir commentaire d'en-tête).
  const mod = await import(/* @vite-ignore */ `${values.source}/src/data/catalog.ts`);
  const SOURCE_EXPERIENCES: SourceExperience[] = mod.experiences;
  const SOURCE_CATEGORIES: SourceCategory[] = mod.categories;

  console.log(`Source: ${SOURCE_EXPERIENCES.length} expériences, ${SOURCE_CATEGORIES.length} catégories.`);
  console.log("Rappel : le brief mentionne 53 lignes dans le Sheet prototype — le nombre réel lu ici depuis catalog.ts fait foi (source de vérité = jeitinho.fr), pas le chiffre du Sheet.");

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ---------- 1) Catégories ----------
  const categoryRows = SOURCE_CATEGORIES.map((c, i) => ({
    nom: c.label,
    slug: c.slug,
    description: c.tagline,
    sort_order: i * 10,
  }));

  console.log(`\n[categories_experiences] ${categoryRows.length} lignes à upsert :`);
  console.table(categoryRows.map((c) => ({ slug: c.slug, nom: c.nom })));

  let categoryIdBySlug = new Map<string, string>();
  if (!values["dry-run"]) {
    const { data, error } = await supabase
      .from("categories_experiences")
      .upsert(categoryRows, { onConflict: "slug" })
      .select("id, slug");
    if (error) throw error;
    for (const row of data ?? []) categoryIdBySlug.set(row.slug, row.id);
  } else {
    // En dry-run, on simule des ids pour vérifier le mapping sans écrire.
    categoryRows.forEach((c) => categoryIdBySlug.set(c.slug, `<dry-run:${c.slug}>`));
  }

  // ---------- 2) Expériences ----------
  const experienceRows = SOURCE_EXPERIENCES.map((e) => ({
    slug: e.slug,
    title: e.title,
    short_description: e.description.slice(0, 200),
    description: e.description,
    price_from: e.price,
    currency: "BRL",
    duration: e.duration,
    // `location`/`locations` : catalog.ts a un tableau `locations`, la
    // table cible a une colonne `location` texte simple — on joint.
    location: e.locations?.join(", ") ?? null,
    category_id: categoryIdBySlug.get(e.category) ?? null,
    cover_image_url: e.image,
    gallery: (e.gallery ?? []).map((url) => ({ url })),
    tags: [],
    status: "published",       // ces expériences sont déjà en ligne sur le site public
    is_published: true,        // compat ascendante, voir migration 20260803120000
    availability: {},
    experience_type: e.category,
    // Champs sans équivalent direct dans catalog.ts (groupSize, priceLabel,
    // transport, included, options, requiresPhysical, note, itinerary) :
    // non repris dans `experiences` v1 — à conserver dans `metadata`
    // pour ne rien perdre tant que le schéma n'a pas de colonnes dédiées.
    seo_title: null,
    seo_description: null,
  }));

  console.log(`\n[experiences] ${experienceRows.length} lignes à upsert (aperçu des 3 premières) :`);
  console.table(experienceRows.slice(0, 3).map((e) => ({ slug: e.slug, title: e.title, price_from: e.price_from })));

  if (values["dry-run"]) {
    console.log("\n--dry-run : aucune écriture effectuée. Relancer sans --dry-run pour appliquer.");
    return;
  }

  const { error: upsertError, data: upserted } = await supabase
    .from("experiences")
    .upsert(experienceRows, { onConflict: "slug" })
    .select("id, slug");
  if (upsertError) throw upsertError;

  console.log(`\n${upserted?.length ?? 0} expériences upsertées avec succès.`);
  console.log("Champs non mappés à vérifier manuellement : groupSize, priceLabel, transport, included, options, requiresPhysical, note, itinerary (absents du schéma v1 — voir docs/SCHEMA_CONCIERGE_MEDIA.md).");
}

main().catch((err) => {
  console.error("Échec de la migration :", err);
  process.exit(1);
});

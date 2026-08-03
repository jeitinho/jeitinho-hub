-- =====================================================================
-- CONCIERGE — Catalogue (expériences, packs, services, catégories) +
-- extension de `partners` en registre partenaires unifié (concierge + média)
--
-- Design notes (voir docs/SCHEMA_CONCIERGE_MEDIA.md pour le détail) :
--  - `experiences` existe déjà ("source unique" depuis la migration
--    20260712062002) : on l'ALTER, on ne la recrée pas.
--  - `partners` existe déjà : plutôt que de créer une table `partners_media`
--    séparée (quasi-identique), on ajoute une colonne `domains text[]`
--    pour qu'un même partenaire (ex: un hôtel) puisse être à la fois
--    partenaire concierge ET partenaire média, sans doublon de fiche.
--  - Les prix restent en NUMERIC (jamais de texte libre) pour permettre
--    calculs/devis automatiques en aval.
-- =====================================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.catalog_status AS ENUM ('draft','published','archived','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partner_status AS ENUM ('prospect','active','inactive','suspended');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.partnership_type AS ENUM ('commission','revenue_share','echange','gratuit','contrat_fixe');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- CATEGORIES_EXPERIENCES ----------
-- Taxonomie commerciale dédiée (distincte de `content_categories`, qui
-- reste la taxonomie éditoriale du blog). Séparée intentionnellement :
-- RLS public différente (tout le monde peut lire les catégories
-- commerciales) et cycle de vie différent (pilotée par le catalogue,
-- pas par la rédaction).
CREATE TABLE public.categories_experiences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories_experiences TO authenticated;
GRANT ALL ON public.categories_experiences TO service_role;
ALTER TABLE public.categories_experiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories_experiences_read_auth" ON public.categories_experiences
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_experiences_write_editors" ON public.categories_experiences
  FOR ALL TO authenticated
  USING (public.can_edit_content(auth.uid())) WITH CHECK (public.can_edit_content(auth.uid()));
CREATE TRIGGER categories_experiences_updated_at BEFORE UPDATE ON public.categories_experiences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- EXPERIENCES (ALTER — table existante) ----------
ALTER TABLE public.experiences
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories_experiences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.catalog_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS price_to numeric(10,2),
  -- Disponibilité "légère" (fenêtres, blackout dates, préavis minimum).
  -- Un vrai calendrier de créneaux/capacité (Travel OS) est un chantier
  -- séparé, volontairement hors scope ici — voir risques.
  ADD COLUMN IF NOT EXISTS availability jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Backfill one-shot : status dérivé de l'ancien flag is_published.
-- `is_published` est conservé pour compatibilité avec le code actuel du
-- hub ; à déprécier une fois l'app basculée sur `status`.
UPDATE public.experiences
SET status = 'published'
WHERE is_published = true AND status = 'draft';

CREATE INDEX IF NOT EXISTS experiences_category_idx ON public.experiences (category_id);
CREATE INDEX IF NOT EXISTS experiences_status_idx ON public.experiences (status);

COMMENT ON COLUMN public.experiences.is_published IS
  'Déprécié au profit de `status`. Conservé pour compat ascendante — à retirer une fois le code du hub migré.';

-- ---------- PACKS (nouvelle table) ----------
CREATE TABLE public.packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  prix_personne numeric(10,2),
  currency text NOT NULL DEFAULT 'EUR',
  cible text,                                        -- ex: "couples", "familles", "groupes d'amis"
  duree text,
  -- Programme jour/jour + composantes incluses. JSONB plutôt qu'une
  -- table de jointure séparée : reste simple à migrer depuis packs.ts
  -- (déjà une structure similaire) et à afficher côté site public.
  composantes jsonb NOT NULL DEFAULT '[]'::jsonb,
  cover_image_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  seo_title text,
  seo_description text,
  statut public.catalog_status NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX packs_statut_idx ON public.packs (statut);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packs TO authenticated;
GRANT ALL ON public.packs TO service_role;
ALTER TABLE public.packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packs_read_auth" ON public.packs FOR SELECT TO authenticated USING (true);
CREATE POLICY "packs_write_editors" ON public.packs FOR ALL TO authenticated
  USING (public.can_edit_content(auth.uid())) WITH CHECK (public.can_edit_content(auth.uid()));
CREATE TRIGGER packs_updated_at BEFORE UPDATE ON public.packs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- SERVICES (nouvelle table) ----------
-- NOTE : absente de la liste Phase 2 du brief, mais explicitement
-- mentionnée dans le CONTEXTE ("jeitinho.fr doit lire experiences,
-- services, packs"). Ajoutée par symétrie avec `experiences`/`packs` —
-- à confirmer avant déploiement, voir docs/SCHEMA_CONCIERGE_MEDIA.md.
CREATE TABLE public.services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text NOT NULL UNIQUE,
  groupe text,                                        -- ex: "Transferts", "Sécurité", "Billetterie"
  description text,
  prix numeric(10,2),
  prix_label text,                                    -- ex: "à partir de", affichage libre
  is_bookable boolean NOT NULL DEFAULT true,
  statut public.catalog_status NOT NULL DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX services_statut_idx ON public.services (statut);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "services_read_auth" ON public.services FOR SELECT TO authenticated USING (true);
CREATE POLICY "services_write_editors" ON public.services FOR ALL TO authenticated
  USING (public.can_edit_content(auth.uid())) WITH CHECK (public.can_edit_content(auth.uid()));
CREATE TRIGGER services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- PARTNERS (ALTER — unification concierge + média) ----------
ALTER TABLE public.partners
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS instagram text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS neighborhood text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS negotiated_benefits text,
  ADD COLUMN IF NOT EXISTS partnership_type public.partnership_type,
  ADD COLUMN IF NOT EXISTS commission_pct numeric(5,2),
  ADD COLUMN IF NOT EXISTS status public.partner_status NOT NULL DEFAULT 'active',
  -- 'concierge' | 'media' (un partenaire peut être dans les deux)
  ADD COLUMN IF NOT EXISTS domains text[] NOT NULL DEFAULT ARRAY['concierge']::text[];

UPDATE public.partners
SET status = CASE WHEN is_active THEN 'active'::public.partner_status ELSE 'inactive'::public.partner_status END;

CREATE INDEX IF NOT EXISTS partners_domains_idx ON public.partners USING GIN (domains);
CREATE INDEX IF NOT EXISTS partners_status_idx ON public.partners (status);

COMMENT ON COLUMN public.partners.domains IS
  'Valeurs attendues : ''concierge'', ''media''. Remplace la notion de table `partners_media` séparée — un même partenaire (hôtel, restaurant) peut servir aux deux domaines.';
COMMENT ON COLUMN public.partners.is_active IS
  'Déprécié au profit de `status`. Conservé pour compat ascendante.';

-- Les rédacteurs/auteurs (pas seulement les managers) doivent pouvoir
-- consulter les fiches partenaires pour écrire des articles "carnet
-- d'adresses" — politique additive, ne retire rien à l'existant.
CREATE POLICY "partners_read_editors" ON public.partners FOR SELECT TO authenticated
  USING (public.can_edit_content(auth.uid()));

-- ---------- LOCALISATIONS (nouvelle table, partagée) ----------
CREATE TABLE public.localisations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  quartier text,
  zone text,
  lat numeric(9,6),
  lng numeric(9,6),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.localisations TO authenticated;
GRANT ALL ON public.localisations TO service_role;
ALTER TABLE public.localisations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "localisations_read_auth" ON public.localisations FOR SELECT TO authenticated USING (true);
CREATE POLICY "localisations_write_editors" ON public.localisations FOR ALL TO authenticated
  USING (public.can_edit_content(auth.uid())) WITH CHECK (public.can_edit_content(auth.uid()));

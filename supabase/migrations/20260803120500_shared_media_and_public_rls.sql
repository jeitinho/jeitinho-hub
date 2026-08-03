-- =====================================================================
-- PARTAGÉ — Extension de `media` (= "media_library" du Sheet) +
-- politiques RLS de lecture publique (anon) pour experiences/packs/
-- categories_experiences/contents publiés/collections/media/localisations
--
-- IMPORTANT : en Postgres/Supabase, une policy RLS ne suffit pas seule —
-- il faut aussi le GRANT SELECT au rôle `anon` en plus de la policy.
-- Sans ce GRANT, `anon` reçoit une erreur de permission avant même que
-- RLS soit évalué.
-- =====================================================================

-- ---------- MEDIA (ALTER) — porte le concept "media_library" ----------
DO $$ BEGIN
  CREATE TYPE public.media_status AS ENUM ('pending_review','approved','archived','restricted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.media
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projets_editoriaux(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status public.media_status NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS rights_notes text;   -- droits d'usage au-delà du simple `copyright` (holder)

CREATE INDEX IF NOT EXISTS media_project_idx ON public.media (project_id);

COMMENT ON TABLE public.media IS
  'Porte le concept "media_library" du Sheet (type=kind, projet_id=project_id, auteur=photographer/uploaded_by, date=created_at, lien_storage=storage_path/url, statut=status, droits=copyright+rights_notes).';

-- ---------- LECTURE PUBLIQUE (rôle anon) ----------
-- Expériences publiées
GRANT SELECT ON public.experiences TO anon;
CREATE POLICY "experiences_read_public" ON public.experiences FOR SELECT TO anon
  USING (status = 'published');

-- Packs publiés
GRANT SELECT ON public.packs TO anon;
CREATE POLICY "packs_read_public" ON public.packs FOR SELECT TO anon
  USING (statut = 'published');

-- Services publiés
GRANT SELECT ON public.services TO anon;
CREATE POLICY "services_read_public" ON public.services FOR SELECT TO anon
  USING (statut = 'published');

-- Catégories commerciales (non sensibles, toutes lisibles)
GRANT SELECT ON public.categories_experiences TO anon;
CREATE POLICY "categories_experiences_read_public" ON public.categories_experiences FOR SELECT TO anon
  USING (true);

-- Localisations (données de référence, non sensibles)
GRANT SELECT ON public.localisations TO anon;
CREATE POLICY "localisations_read_public" ON public.localisations FOR SELECT TO anon
  USING (true);

-- Articles publiés (uniquement les types réellement publics : pas les
-- brouillons instagram/newsletter/landing internes)
GRANT SELECT ON public.contents TO anon;
CREATE POLICY "contents_read_public" ON public.contents FOR SELECT TO anon
  USING (status = 'published' AND type IN ('blog', 'guide'));

-- Catégories de blog exposées publiquement (scope contient 'blog'
-- uniquement — ne pas exposer les scopes internes type seo_hub/landing)
GRANT SELECT ON public.content_categories TO anon;
CREATE POLICY "content_categories_read_public" ON public.content_categories FOR SELECT TO anon
  USING ('blog' = ANY(scope));

-- Collections éditoriales (non sensibles)
GRANT SELECT ON public.collections_editoriales TO anon;
CREATE POLICY "collections_editoriales_read_public" ON public.collections_editoriales FOR SELECT TO anon
  USING (true);

-- Auteurs (bio publique déjà pensée pour ça)
GRANT SELECT ON public.authors TO anon;
CREATE POLICY "authors_read_public" ON public.authors FOR SELECT TO anon
  USING (is_active = true);

-- Médias : pas de donnée sensible (noms de fichier, tags, crédit photo)
-- mais expose la liste complète des assets à quiconque a la clé anon.
-- Alternative plus stricte en commentaire si jugé nécessaire.
GRANT SELECT ON public.media TO anon;
CREATE POLICY "media_read_public" ON public.media FOR SELECT TO anon
  USING (status = 'approved');
-- Alternative plus restrictive (uniquement médias liés à un contenu
-- publié) :
--   USING (status = 'approved' AND EXISTS (
--     SELECT 1 FROM public.content_media cm JOIN public.contents c ON c.id = cm.content_id
--     WHERE cm.media_id = media.id AND c.status = 'published'
--   ));

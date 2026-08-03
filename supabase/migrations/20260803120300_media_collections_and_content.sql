-- =====================================================================
-- MÉDIA — Collections éditoriales + rattachement à `contents`
--
-- Design notes :
--  - Le "articles" du Sheet Newsroom OS correspond déjà à `contents`
--    (type='blog'/'guide'), qui est nettement plus riche (workflow à
--    statuts, révisions, commentaires, SEO, médias liés). On NE crée
--    PAS de table `articles` séparée — on complète `contents` avec la
--    seule chose qui manque : le rattachement à une collection.
--  - IMPORTANT : `content_categories` a été seedée (migration
--    20260802164539) avec 4 noms ("Les Quartiers", "Rio Secret", "Rio
--    Expliqué", "Une journée à...") qui sont en réalité des noms de
--    COLLECTIONS, pas les 18 vraies catégories du blog
--    (quartiers, activites, excursions, plages, randonnees, culture,
--    vie-nocturne, carnaval, football, evenements, gastronomie,
--    itineraires, hebergements, budget, transports, securite,
--    conseils-pratiques, vie-pratique-locale — cf. audit du repo
--    rio-uncovered). Cette migration :
--      1) crée `collections_editoriales` et y seed les 9 vraies
--         collections ;
--      2) seed les 18 vraies catégories dans `content_categories` ;
--      3) NE SUPPRIME PAS les 4 lignes mal nommées existantes (risque
--         de casser des `contents.category_id` déjà posés) — à
--         nettoyer manuellement après vérification, voir risques.
-- =====================================================================

-- ---------- COLLECTIONS_EDITORIALES ----------
CREATE TABLE public.collections_editoriales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nom text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.collections_editoriales TO authenticated;
GRANT ALL ON public.collections_editoriales TO service_role;
ALTER TABLE public.collections_editoriales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "collections_editoriales_read_auth" ON public.collections_editoriales
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "collections_editoriales_write_editors" ON public.collections_editoriales
  FOR ALL TO authenticated
  USING (public.can_edit_content(auth.uid())) WITH CHECK (public.can_edit_content(auth.uid()));
CREATE TRIGGER collections_editoriales_updated_at BEFORE UPDATE ON public.collections_editoriales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.collections_editoriales (nom, slug, sort_order) VALUES
  ('Les Quartiers', 'les-quartiers', 10),
  ('Rio Expliqué', 'rio-explique', 20),
  ('Une journée à...', 'une-journee-a', 30),
  ('Le carnet d''adresses', 'le-carnet-d-adresses', 40),
  ('Rio se raconte', 'rio-se-raconte', 50),
  ('Le Rio secret', 'le-rio-secret', 60),
  ('Les grandes histoires de Rio', 'les-grandes-histoires-de-rio', 70),
  ('Le carnet photo', 'le-carnet-photo', 80),
  ('L''article de la semaine', 'l-article-de-la-semaine', 90)
ON CONFLICT (slug) DO NOTHING;

-- ---------- CONTENTS (ALTER) ----------
ALTER TABLE public.contents
  ADD COLUMN IF NOT EXISTS collection_id uuid REFERENCES public.collections_editoriales(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS contents_collection_idx ON public.contents (collection_id);

COMMENT ON TABLE public.contents IS
  'Table "articles" du domaine média (type=blog/guide/...). Ne pas dupliquer avec une table `articles` distincte — collection_id ajouté ici pour porter les 9 collections éditoriales.';

-- ---------- CONTENT_CATEGORIES — seed des 18 vraies catégories du blog ----------
-- scope=['blog'] : cohérent avec les valeurs déjà utilisées par la colonne.
INSERT INTO public.content_categories (name, slug, scope) VALUES
  ('Quartiers', 'quartiers', ARRAY['blog']),
  ('Activités', 'activites', ARRAY['blog']),
  ('Excursions', 'excursions', ARRAY['blog']),
  ('Plages', 'plages', ARRAY['blog']),
  ('Randonnées', 'randonnees', ARRAY['blog']),
  ('Culture', 'culture', ARRAY['blog']),
  ('Vie nocturne', 'vie-nocturne', ARRAY['blog']),
  ('Carnaval', 'carnaval', ARRAY['blog']),
  ('Football', 'football', ARRAY['blog']),
  ('Évènements', 'evenements', ARRAY['blog']),
  ('Gastronomie', 'gastronomie', ARRAY['blog']),
  ('Itinéraires', 'itineraires', ARRAY['blog']),
  ('Hébergements', 'hebergements', ARRAY['blog']),
  ('Budget', 'budget', ARRAY['blog']),
  ('Transports', 'transports', ARRAY['blog']),
  ('Sécurité', 'securite', ARRAY['blog']),
  ('Conseils pratiques', 'conseils-pratiques', ARRAY['blog']),
  ('Vie pratique locale', 'vie-pratique-locale', ARRAY['blog'])
ON CONFLICT (slug) DO NOTHING;

-- ---------- PROFILES (ALTER) ----------
-- La table `users` demandée par le Sheet Newsroom OS existe déjà
-- fonctionnellement : `profiles` + `user_roles` + `roles` (système
-- d'auth complet, statut de compte, rôles multiples) est plus robuste
-- qu'une table plate `users` séparée. Seule colonne manquante : phone.
-- `nom`→full_name, `role`/`fonction`→user_roles/roles.label,
-- `slug`→déjà porté par `authors.slug` pour les profils publics.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text;

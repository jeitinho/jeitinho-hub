-- 1. Corrige les policies auteur : created_by (auth.users), pas author_id (authors)
DROP POLICY IF EXISTS contents_author_read ON public.contents;
CREATE POLICY contents_author_read ON public.contents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'auteur'::public.app_role) AND created_by = auth.uid());

DROP POLICY IF EXISTS contents_author_update ON public.contents;
CREATE POLICY contents_author_update ON public.contents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'auteur'::public.app_role) AND created_by = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'auteur'::public.app_role) AND created_by = auth.uid());

-- 2. Permet à un 'auteur' seul de créer son propre contenu
DROP POLICY IF EXISTS contents_insert_writers ON public.contents;
CREATE POLICY contents_insert_writers ON public.contents FOR INSERT TO authenticated
  WITH CHECK (
    public.can_edit_content(auth.uid())
    OR (public.has_role(auth.uid(), 'auteur'::public.app_role) AND created_by = auth.uid())
  );

-- 3. Permet de supprimer SON PROPRE brouillon (corrige le fail silencieux du bouton Supprimer)
DROP POLICY IF EXISTS contents_delete_own_draft ON public.contents;
CREATE POLICY contents_delete_own_draft ON public.contents FOR DELETE TO authenticated
  USING (created_by = auth.uid() AND status = 'draft');

-- 4. Seed des catégories de base (alignées sur les collections déjà utilisées sur blog.jeitinho.fr)
INSERT INTO public.content_categories (name, slug)
VALUES
  ('Les Quartiers', 'les-quartiers'),
  ('Rio Secret', 'rio-secret'),
  ('Rio Expliqué', 'rio-explique'),
  ('Une journée à...', 'une-journee-a')
ON CONFLICT (slug) DO NOTHING;

-- 5. Crée le profil auteur de Rafael pour permettre un test de bout en bout immédiat
INSERT INTO public.authors (name, slug, user_id)
SELECT 'Rafael', 'rafael', id FROM auth.users WHERE email = 'rafael@jeitinho.fr'
ON CONFLICT (slug) DO NOTHING;

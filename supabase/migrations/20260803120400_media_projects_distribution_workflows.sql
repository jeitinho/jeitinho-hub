-- =====================================================================
-- MÉDIA — Projets éditoriaux, tâches, distribution, workflows
--
-- Design notes :
--  - `distribution` (canal/format/statut/lien_publie) recoupe presque
--    entièrement la table `publications` déjà existante (content_id,
--    channel_id, status, external_ref, external_url, payload,
--    scheduled_at/published_at, published_by). Plutôt que de dupliquer
--    tout le système de canaux, on ALTER `publications` pour accepter
--    un rattachement à un `projets_editoriaux` (utile pour distribuer
--    un reportage photo/Instagram qui ne passe pas forcément par un
--    `contents`), en rendant content_id nullable.
--  - `projets_editoriaux` et `taches_editoriales` sont nouveaux et
--    créés tels que demandés.
-- =====================================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('idea','planned','in_progress','in_review','done','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- PROJETS_EDITORIAUX ----------
CREATE TABLE public.projets_editoriaux (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date,
  type text,                                  -- ex: 'article', 'shooting', 'video', 'story'
  collection_id uuid REFERENCES public.collections_editoriales(id) ON DELETE SET NULL,
  titre text NOT NULL,
  responsable_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  priorite public.task_priority NOT NULL DEFAULT 'normal',
  statut public.project_status NOT NULL DEFAULT 'idea',
  deadline date,
  lieu text,
  content_id uuid REFERENCES public.contents(id) ON DELETE SET NULL,   -- lien vers l'article final une fois rédigé
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX projets_editoriaux_statut_idx ON public.projets_editoriaux (statut, deadline);
CREATE INDEX projets_editoriaux_responsable_idx ON public.projets_editoriaux (responsable_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.projets_editoriaux TO authenticated;
GRANT ALL ON public.projets_editoriaux TO service_role;
ALTER TABLE public.projets_editoriaux ENABLE ROW LEVEL SECURITY;
CREATE POLICY "projets_editoriaux_read_editors" ON public.projets_editoriaux FOR SELECT TO authenticated
  USING (public.can_edit_content(auth.uid()));
CREATE POLICY "projets_editoriaux_write_editors" ON public.projets_editoriaux FOR ALL TO authenticated
  USING (public.can_edit_content(auth.uid())) WITH CHECK (public.can_edit_content(auth.uid()));
CREATE TRIGGER projets_editoriaux_updated_at BEFORE UPDATE ON public.projets_editoriaux
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- TACHES_EDITORIALES ----------
-- `projet_id` est rendu NULLABLE (contrairement au libellé littéral du
-- Sheet) : une règle de workflows_media peut aussi se déclencher
-- directement sur `contents` (ex: passage à 'to_review'), sans qu'un
-- projet éditorial existe. `source_table`/`source_id` ajoutés pour que
-- le dispatcher générique fonctionne quelle que soit la table source.
CREATE TABLE public.taches_editoriales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id uuid REFERENCES public.projets_editoriaux(id) ON DELETE SET NULL,
  workflow_id uuid,   -- FK ajoutée plus bas une fois workflows_media créée
  source_table text,
  source_id uuid,
  titre text NOT NULL,
  type_tache text,
  responsable_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deadline date,
  statut public.task_status NOT NULL DEFAULT 'todo',
  priorite public.task_priority NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX taches_editoriales_projet_idx ON public.taches_editoriales (projet_id);
CREATE INDEX taches_editoriales_responsable_idx ON public.taches_editoriales (responsable_id, statut);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taches_editoriales TO authenticated;
GRANT ALL ON public.taches_editoriales TO service_role;
ALTER TABLE public.taches_editoriales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taches_editoriales_read_managers_or_assignee" ON public.taches_editoriales FOR SELECT TO authenticated
  USING (public.can_edit_content(auth.uid()) OR responsable_id = auth.uid());
CREATE POLICY "taches_editoriales_write_editors" ON public.taches_editoriales FOR ALL TO authenticated
  USING (public.can_edit_content(auth.uid())) WITH CHECK (public.can_edit_content(auth.uid()));
CREATE POLICY "taches_editoriales_update_own" ON public.taches_editoriales FOR UPDATE TO authenticated
  USING (responsable_id = auth.uid()) WITH CHECK (responsable_id = auth.uid());
CREATE TRIGGER taches_editoriales_updated_at BEFORE UPDATE ON public.taches_editoriales
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- WORKFLOWS_MEDIA ----------
CREATE TABLE public.workflows_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,                        -- ex: 'projets_editoriaux', 'contents'
  colonne_declencheur text NOT NULL,
  valeur_declenchante text NOT NULL,
  ordre integer NOT NULL DEFAULT 0,
  tache_a_generer text NOT NULL,
  colonne_date_reference text,                 -- colonne de la ligne source à utiliser comme point de départ (ex: 'deadline'); défaut = aujourd'hui
  decalage_jours integer NOT NULL DEFAULT 0,
  priorite public.task_priority NOT NULL DEFAULT 'normal',
  responsable_defaut uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workflows_media_source_idx ON public.workflows_media (source, actif);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows_media TO authenticated;
GRANT ALL ON public.workflows_media TO service_role;
ALTER TABLE public.workflows_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflows_media_read_editors" ON public.workflows_media FOR SELECT TO authenticated
  USING (public.can_edit_content(auth.uid()));
CREATE POLICY "workflows_media_write_managers" ON public.workflows_media FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE TRIGGER workflows_media_updated_at BEFORE UPDATE ON public.workflows_media
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.taches_editoriales
  ADD CONSTRAINT taches_editoriales_workflow_fk
  FOREIGN KEY (workflow_id) REFERENCES public.workflows_media(id) ON DELETE SET NULL;

-- ---------- DISPATCHER GÉNÉRIQUE MÉDIA ----------
CREATE OR REPLACE FUNCTION public.dispatch_media_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule RECORD;
  new_value text;
  old_value text;
  ref_date date;
BEGIN
  FOR rule IN
    SELECT * FROM public.workflows_media
    WHERE source = TG_TABLE_NAME AND actif = true
    ORDER BY ordre
  LOOP
    new_value := (to_jsonb(NEW) ->> rule.colonne_declencheur);
    IF TG_OP = 'UPDATE' THEN
      old_value := (to_jsonb(OLD) ->> rule.colonne_declencheur);
    ELSE
      old_value := NULL;
    END IF;

    IF new_value IS NOT DISTINCT FROM rule.valeur_declenchante
       AND old_value IS DISTINCT FROM rule.valeur_declenchante THEN
      ref_date := NULL;
      IF rule.colonne_date_reference IS NOT NULL THEN
        ref_date := NULLIF(to_jsonb(NEW) ->> rule.colonne_date_reference, '')::date;
      END IF;

      INSERT INTO public.taches_editoriales
        (projet_id, workflow_id, source_table, source_id, titre, type_tache, responsable_id, deadline, priorite)
      VALUES
        (CASE WHEN TG_TABLE_NAME = 'projets_editoriaux' THEN NEW.id ELSE NULL END,
         rule.id, TG_TABLE_NAME, NEW.id, rule.tache_a_generer, rule.colonne_declencheur,
         rule.responsable_defaut,
         (COALESCE(ref_date, CURRENT_DATE) + (rule.decalage_jours || ' days')::interval)::date,
         rule.priorite);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

CREATE TRIGGER projets_editoriaux_workflow_dispatch AFTER INSERT OR UPDATE ON public.projets_editoriaux
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_media_workflow();
CREATE TRIGGER contents_workflow_dispatch AFTER INSERT OR UPDATE ON public.contents
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_media_workflow();

-- ---------- PUBLICATIONS (ALTER) — porte le concept "distribution" ----------
ALTER TABLE public.publications
  ALTER COLUMN content_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projets_editoriaux(id) ON DELETE SET NULL;

ALTER TABLE public.publications
  ADD CONSTRAINT publications_content_or_project_chk
  CHECK (content_id IS NOT NULL OR project_id IS NOT NULL);

COMMENT ON TABLE public.publications IS
  'Porte le concept "distribution" du Sheet Newsroom OS (canal=channel_id, statut=status, lien_publie=external_url, date_publication=published_at, responsable=published_by). Rattachée à un contenu (content_id) et/ou un projet éditorial (project_id).';

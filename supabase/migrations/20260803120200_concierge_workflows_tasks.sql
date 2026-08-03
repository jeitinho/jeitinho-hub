-- =====================================================================
-- CONCIERGE — Workflows (règles d'automatisation) + tâches générées
--
-- Transformation des WF001-080 du Sheet en logique Supabase : chaque
-- ligne de `workflows_concierge` est une règle déclarative ("quand la
-- colonne X de la table Y passe à la valeur Z, générer une tâche").
-- Elle est exécutée par un trigger générique (dispatch_concierge_workflow)
-- attaché aux tables surveillées — voir docs/SCHEMA_CONCIERGE_MEDIA.md
-- §Phase 3.2 pour la comparaison avec Edge Function / Make.
-- =====================================================================

-- ---------- ENUMS ----------
DO $$ BEGIN
  CREATE TYPE public.task_status AS ENUM ('todo','doing','done','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.task_priority AS ENUM ('low','normal','high','urgent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------- WORKFLOWS_CONCIERGE ----------
CREATE TABLE public.workflows_concierge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_source text NOT NULL,              -- ex: 'quotes', 'bookings', 'prospects'
  colonne_declencheur text NOT NULL,       -- ex: 'status'
  valeur_declenchante text NOT NULL,       -- ex: 'accepted'
  ordre integer NOT NULL DEFAULT 0,
  tache_a_generer text NOT NULL,
  decalage_deadline_jours integer NOT NULL DEFAULT 0,   -- deadline = date du déclenchement + N jours
  priorite public.task_priority NOT NULL DEFAULT 'normal',
  responsable_defaut uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actif boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX workflows_concierge_source_idx ON public.workflows_concierge (table_source, actif);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workflows_concierge TO authenticated;
GRANT ALL ON public.workflows_concierge TO service_role;
ALTER TABLE public.workflows_concierge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "workflows_concierge_read_managers" ON public.workflows_concierge FOR SELECT TO authenticated
  USING (public.can_manage(auth.uid()));
CREATE POLICY "workflows_concierge_write_managers" ON public.workflows_concierge FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE TRIGGER workflows_concierge_updated_at BEFORE UPDATE ON public.workflows_concierge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- TACHES_CONCIERGE ----------
CREATE TABLE public.taches_concierge (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id uuid REFERENCES public.workflows_concierge(id) ON DELETE SET NULL,
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
CREATE INDEX taches_concierge_responsable_idx ON public.taches_concierge (responsable_id, statut);
CREATE INDEX taches_concierge_source_idx ON public.taches_concierge (source_table, source_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.taches_concierge TO authenticated;
GRANT ALL ON public.taches_concierge TO service_role;
ALTER TABLE public.taches_concierge ENABLE ROW LEVEL SECURITY;
CREATE POLICY "taches_concierge_read_managers_or_assignee" ON public.taches_concierge FOR SELECT TO authenticated
  USING (public.can_manage(auth.uid()) OR responsable_id = auth.uid());
CREATE POLICY "taches_concierge_write_managers" ON public.taches_concierge FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE POLICY "taches_concierge_update_own" ON public.taches_concierge FOR UPDATE TO authenticated
  USING (responsable_id = auth.uid()) WITH CHECK (responsable_id = auth.uid());
CREATE TRIGGER taches_concierge_updated_at BEFORE UPDATE ON public.taches_concierge
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- DISPATCHER GÉNÉRIQUE ----------
-- Ne se déclenche que sur une TRANSITION vers la valeur cible (pas à
-- chaque UPDATE si la colonne était déjà à cette valeur), pour éviter
-- de générer des tâches en double.
CREATE OR REPLACE FUNCTION public.dispatch_concierge_workflow()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rule RECORD;
  new_value text;
  old_value text;
BEGIN
  FOR rule IN
    SELECT * FROM public.workflows_concierge
    WHERE table_source = TG_TABLE_NAME AND actif = true
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
      INSERT INTO public.taches_concierge
        (workflow_id, source_table, source_id, titre, type_tache, responsable_id, deadline, priorite)
      VALUES
        (rule.id, TG_TABLE_NAME, NEW.id, rule.tache_a_generer, rule.colonne_declencheur,
         rule.responsable_defaut,
         (CURRENT_DATE + (rule.decalage_deadline_jours || ' days')::interval)::date,
         rule.priorite);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

-- À attacher à chaque table surveillée par au moins une règle. Ajouter/
-- retirer un trigger ici quand `workflows_concierge.table_source`
-- change de périmètre (ex: si une règle sur `bookings` est ajoutée
-- plus tard, prévoir aussi un trigger AFTER INSERT sur bookings).
CREATE TRIGGER quotes_workflow_dispatch AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_concierge_workflow();
CREATE TRIGGER bookings_workflow_dispatch AFTER INSERT OR UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_concierge_workflow();
CREATE TRIGGER prospects_workflow_dispatch AFTER INSERT OR UPDATE ON public.prospects
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_concierge_workflow();

COMMENT ON FUNCTION public.dispatch_concierge_workflow() IS
  'Générique : lit workflows_concierge pour TG_TABLE_NAME, insère dans taches_concierge sur transition de colonne. À tester avec des règles réelles avant activation en prod (voir risques).';

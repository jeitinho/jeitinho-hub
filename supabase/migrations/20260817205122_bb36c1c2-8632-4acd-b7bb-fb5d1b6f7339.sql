-- Lead Intelligence : enrichissement des leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS campaign text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text,
  ADD COLUMN IF NOT EXISTS utm_content text,
  ADD COLUMN IF NOT EXISTS utm_term text,
  ADD COLUMN IF NOT EXISTS request_type text,
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'COLD',
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS estimated_value numeric,
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'nouveau',
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS leads_priority_score_idx ON public.leads (priority, score DESC);
CREATE INDEX IF NOT EXISTS leads_next_action_at_idx ON public.leads (next_action_at);

-- Prospects : mêmes champs de pilotage commercial
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'COLD',
  ADD COLUMN IF NOT EXISTS estimated_value numeric,
  ADD COLUMN IF NOT EXISTS pipeline_stage text NOT NULL DEFAULT 'nouveau',
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz;

-- Devis : suivi commercial et relances
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS next_action_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_paused boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS followup_stage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS followup_anchor_at timestamptz;

-- Tâches CRM (relances préparées, jamais envoyées automatiquement)
CREATE TABLE IF NOT EXISTS public.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'relance_devis',
  channel text NOT NULL DEFAULT 'whatsapp',
  status text NOT NULL DEFAULT 'a_valider',
  stage integer,
  title text NOT NULL,
  message_draft text,
  due_at timestamptz NOT NULL DEFAULT now(),
  lead_id uuid REFERENCES public.leads(id) ON DELETE CASCADE,
  prospect_id uuid REFERENCES public.prospects(id) ON DELETE CASCADE,
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  handled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS crm_tasks_quote_stage_uniq
  ON public.crm_tasks (quote_id, stage) WHERE quote_id IS NOT NULL AND stage IS NOT NULL;
CREATE INDEX IF NOT EXISTS crm_tasks_status_due_idx ON public.crm_tasks (status, due_at);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_tasks TO authenticated;
GRANT ALL ON public.crm_tasks TO service_role;

ALTER TABLE public.crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_tasks_select ON public.crm_tasks;
CREATE POLICY crm_tasks_select ON public.crm_tasks FOR SELECT TO authenticated
  USING (public.can_manage(auth.uid()));
DROP POLICY IF EXISTS crm_tasks_write ON public.crm_tasks;
CREATE POLICY crm_tasks_write ON public.crm_tasks FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

DROP TRIGGER IF EXISTS crm_tasks_updated_at ON public.crm_tasks;
CREATE TRIGGER crm_tasks_updated_at BEFORE UPDATE ON public.crm_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
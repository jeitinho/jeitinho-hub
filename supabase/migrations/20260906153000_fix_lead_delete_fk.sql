-- Ensure CRM tasks never block deletion of their parent lead.
-- This is idempotent and repairs environments where the historical FK
-- was created without ON DELETE CASCADE.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_class r ON r.oid = c.confrelid
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
    WHERE t.relname = 'crm_tasks'
      AND r.relname = 'leads'
      AND a.attname = 'lead_id'
      AND c.contype = 'f'
  ) THEN
    ALTER TABLE public.crm_tasks
      DROP CONSTRAINT IF EXISTS crm_tasks_lead_id_fkey;
  END IF;

  ALTER TABLE public.crm_tasks
    ADD CONSTRAINT crm_tasks_lead_id_fkey
    FOREIGN KEY (lead_id)
    REFERENCES public.leads(id)
    ON DELETE CASCADE;
END $$;

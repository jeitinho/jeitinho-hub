-- Client deletion must not be blocked by historical foreign keys.
-- Preserve business records while removing only their relationship to the client.
DO $$
DECLARE
  fk record;
BEGIN
  FOR fk IN
    SELECT
      ns.nspname AS schema_name,
      tbl.relname AS table_name,
      con.conname AS constraint_name,
      att.attname AS column_name
    FROM pg_constraint con
    JOIN pg_class tbl ON tbl.oid = con.conrelid
    JOIN pg_namespace ns ON ns.oid = tbl.relnamespace
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid
     AND att.attnum = con.conkey[1]
    WHERE con.contype = 'f'
      AND con.confrelid = 'public.clients'::regclass
      AND array_length(con.conkey, 1) = 1
      AND att.attname = 'client_id'
      AND ns.nspname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I.%I DROP CONSTRAINT %I',
      fk.schema_name,
      fk.table_name,
      fk.constraint_name
    );

    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.clients(id) ON DELETE SET NULL',
      fk.schema_name,
      fk.table_name,
      fk.constraint_name,
      fk.column_name
    );
  END LOOP;
END $$;

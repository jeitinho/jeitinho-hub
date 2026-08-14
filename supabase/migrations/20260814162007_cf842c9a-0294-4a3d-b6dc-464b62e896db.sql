DROP VIEW IF EXISTS public.staff_directory;

CREATE TABLE public.staff_directory (
  id uuid PRIMARY KEY,
  full_name text,
  avatar_url text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.staff_directory TO authenticated;
GRANT ALL ON public.staff_directory TO service_role;
ALTER TABLE public.staff_directory ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_directory_read_auth ON public.staff_directory
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.sync_staff_directory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.staff_directory WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.is_active THEN
    INSERT INTO public.staff_directory (id, full_name, avatar_url, updated_at)
    VALUES (NEW.id, NEW.full_name, NEW.avatar_url, now())
    ON CONFLICT (id) DO UPDATE
      SET full_name = EXCLUDED.full_name,
          avatar_url = EXCLUDED.avatar_url,
          updated_at = now();
  ELSE
    DELETE FROM public.staff_directory WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_staff_directory() FROM anon, authenticated, public;

DROP TRIGGER IF EXISTS profiles_sync_staff_directory ON public.profiles;
CREATE TRIGGER profiles_sync_staff_directory
  AFTER INSERT OR UPDATE OR DELETE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_staff_directory();

INSERT INTO public.staff_directory (id, full_name, avatar_url)
SELECT id, full_name, avatar_url FROM public.profiles WHERE is_active = true
ON CONFLICT (id) DO NOTHING;
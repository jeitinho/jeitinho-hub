
-- 1) Add 'auteur' role to enum (must be in its own step; used only in later migration)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'auteur';

-- 2) Account status enum
DO $$ BEGIN
  CREATE TYPE public.account_status AS ENUM ('pending_validation','active','rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Profiles: add status column, default 'active' so existing users keep access
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.account_status NOT NULL DEFAULT 'active';

-- 4) Roles catalog (metadata + activation toggle). Uses text code decoupled from enum
CREATE TABLE IF NOT EXISTS public.roles (
  code text PRIMARY KEY,
  label text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.roles TO authenticated;
GRANT ALL ON public.roles TO service_role;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS roles_read_auth ON public.roles;
CREATE POLICY roles_read_auth ON public.roles FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS roles_update_managers ON public.roles;
CREATE POLICY roles_update_managers ON public.roles FOR UPDATE TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE TRIGGER roles_updated_at BEFORE UPDATE ON public.roles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.roles (code, label, description, sort_order) VALUES
  ('admin','Administrateur','Accès complet à tous les modules',10),
  ('manager','Manager','Accès complet opérationnel',20),
  ('redacteur_chef','Rédacteur en chef','Validation et publication éditoriale',30),
  ('redacteur','Rédacteur','Rédaction et édition de contenu',40),
  ('auteur','Auteur','Rédige ses propres contenus assignés',50),
  ('guide','Guide','Lecture des missions assignées',60),
  ('prestataire','Prestataire','Lecture des missions assignées',70)
ON CONFLICT (code) DO NOTHING;

-- 5) Helper: is_account_active
CREATE OR REPLACE FUNCTION public.is_account_active(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _user_id AND status = 'active'::public.account_status);
$$;

-- 6) Update handle_new_user: pending by default; first user bootstraps as admin+active
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE
  user_count int;
  new_status public.account_status;
BEGIN
  SELECT COUNT(*) INTO user_count FROM public.profiles;
  new_status := CASE WHEN user_count = 0 THEN 'active'::public.account_status
                     ELSE 'pending_validation'::public.account_status END;

  INSERT INTO public.profiles (id, email, full_name, avatar_url, status)
  VALUES (NEW.id, NEW.email,
          NEW.raw_user_meta_data->>'full_name',
          NEW.raw_user_meta_data->>'avatar_url',
          new_status)
  ON CONFLICT (id) DO NOTHING;

  IF user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin'::public.app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END; $$;

-- 7) Ensure trigger exists on auth.users (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8) Allow managers (not just admin) to write user_roles
DROP POLICY IF EXISTS user_roles_admin_write ON public.user_roles;
CREATE POLICY user_roles_managers_write ON public.user_roles FOR ALL TO authenticated
  USING (public.can_manage(auth.uid()))
  WITH CHECK (public.can_manage(auth.uid()));

-- Managers can also view all roles
DROP POLICY IF EXISTS user_roles_select_self_or_admin ON public.user_roles;
CREATE POLICY user_roles_select_self_or_managers ON public.user_roles FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR public.can_manage(auth.uid()));

-- 9) Allow managers to update any profile (activation flow)
DROP POLICY IF EXISTS profiles_update_self_or_admin ON public.profiles;
CREATE POLICY profiles_update_self_or_managers ON public.profiles FOR UPDATE TO authenticated
  USING ((auth.uid() = id) OR public.can_manage(auth.uid()))
  WITH CHECK ((auth.uid() = id) OR public.can_manage(auth.uid()));

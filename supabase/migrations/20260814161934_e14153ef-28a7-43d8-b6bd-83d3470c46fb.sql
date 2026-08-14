-- 1. Restrict avatar reads to owner or managers
DROP POLICY IF EXISTS avatars_read_auth ON storage.objects;
CREATE POLICY avatars_read_self_or_manager ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (public.can_manage(auth.uid()) OR (storage.foldername(name))[1] = auth.uid()::text));

-- 2. Restrict profiles reads to self or managers
DROP POLICY IF EXISTS profiles_select_all_auth ON public.profiles;
CREATE POLICY profiles_select_self_or_managers ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.can_manage(auth.uid()));

-- Safe staff directory (no emails) for mentions / attribution
CREATE OR REPLACE VIEW public.staff_directory
WITH (security_invoker = false) AS
  SELECT id, full_name, avatar_url
  FROM public.profiles
  WHERE is_active = true;
REVOKE ALL ON public.staff_directory FROM anon;
GRANT SELECT ON public.staff_directory TO authenticated;
GRANT SELECT ON public.staff_directory TO service_role;

-- 3. Prevent self role assignment (no privilege escalation via own row)
DROP POLICY IF EXISTS user_roles_managers_write ON public.user_roles;
CREATE POLICY user_roles_managers_write ON public.user_roles
  FOR ALL TO authenticated
  USING (public.can_manage(auth.uid()) AND user_id <> auth.uid())
  WITH CHECK (public.can_manage(auth.uid()) AND user_id <> auth.uid());

-- 4. Lock down SECURITY DEFINER function execution
REVOKE ALL ON FUNCTION public.can_manage(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.can_edit_content(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.can_review_content(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_account_active(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.is_admin(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.next_quote_number() FROM anon, public;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;

GRANT EXECUTE ON FUNCTION public.can_manage(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_review_content(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_account_active(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.next_quote_number() TO authenticated;
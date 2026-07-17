
-- Storage policies for avatars bucket
DROP POLICY IF EXISTS "avatars_read_auth" ON storage.objects;
CREATE POLICY "avatars_read_auth" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "avatars_insert_self_or_manager" ON storage.objects;
CREATE POLICY "avatars_insert_self_or_manager" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars' AND (
      public.can_manage(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "avatars_update_self_or_manager" ON storage.objects;
CREATE POLICY "avatars_update_self_or_manager" ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars' AND (
      public.can_manage(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "avatars_delete_self_or_manager" ON storage.objects;
CREATE POLICY "avatars_delete_self_or_manager" ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars' AND (
      public.can_manage(auth.uid())
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Author-scoped contents access
DROP POLICY IF EXISTS contents_author_read ON public.contents;
CREATE POLICY contents_author_read ON public.contents FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'auteur'::public.app_role) AND author_id = auth.uid());

DROP POLICY IF EXISTS contents_author_update ON public.contents;
CREATE POLICY contents_author_update ON public.contents FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'auteur'::public.app_role) AND author_id = auth.uid())
  WITH CHECK (public.has_role(auth.uid(), 'auteur'::public.app_role) AND author_id = auth.uid());

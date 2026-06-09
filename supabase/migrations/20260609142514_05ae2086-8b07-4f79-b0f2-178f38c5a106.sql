-- 1) Privilege escalation: restrict self-insert to role='police' only
DROP POLICY IF EXISTS "Users can insert own role" ON public.user_roles;
CREATE POLICY "Users can self-assign police role on signup"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'police'::public.app_role
    AND NOT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid())
  );

-- 2) Storage: remove overly permissive SELECT on dossier-files
DROP POLICY IF EXISTS "Authenticated users can view dossier files" ON storage.objects;

-- 3) Storage: add DELETE policy on dossier-files (owner police/admin)
CREATE POLICY "Police can delete own dossier files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'dossier-files'
    AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role))
  );

-- 4) Storage: chat-files DELETE + UPDATE
CREATE POLICY "Users can delete own chat files with dossier access"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND owner = auth.uid()
    AND public.has_dossier_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY "Users can update own chat files with dossier access"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'chat-files'
    AND owner = auth.uid()
    AND public.has_dossier_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'chat-files'
    AND owner = auth.uid()
    AND public.has_dossier_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
  );

-- 5) Realtime: enable RLS + restrict private channel subscriptions
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can subscribe to accessible dossier channels" ON realtime.messages;
CREATE POLICY "Authenticated can subscribe to accessible dossier channels"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    CASE
      WHEN realtime.topic() LIKE 'messages-%' THEN
        public.has_dossier_access(
          auth.uid(),
          NULLIF(substring(realtime.topic() from '^messages-(.+)$'), '')::uuid
        )
      WHEN realtime.topic() LIKE 'call-%' THEN
        public.has_dossier_access(
          auth.uid(),
          NULLIF(substring(realtime.topic() from '^call-([0-9a-fA-F-]+)-'), '')::uuid
        )
      ELSE false
    END
  );

-- 6) Revoke EXECUTE on SECURITY DEFINER functions from anon/public
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_dossier_access(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, public, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, public, authenticated;
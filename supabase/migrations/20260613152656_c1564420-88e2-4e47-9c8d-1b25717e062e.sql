
-- 1. Activites: require dossier access on insert
DROP POLICY IF EXISTS "Authenticated users can create activites" ON public.activites;
CREATE POLICY "Users can create activites for accessible dossiers"
ON public.activites
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.has_dossier_access(auth.uid(), dossier_id)
);

-- 2. Storage: remove permissive upload policy on dossier-files
DROP POLICY IF EXISTS "Authenticated users can upload dossier files" ON storage.objects;

-- 3. Profiles: remove blanket read policy, scope to self + dossier collaborators
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can view profiles of dossier collaborators"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE (d.created_by = profiles.user_id OR d.assigned_to = profiles.user_id)
      AND public.has_dossier_access(auth.uid(), d.id)
  )
);

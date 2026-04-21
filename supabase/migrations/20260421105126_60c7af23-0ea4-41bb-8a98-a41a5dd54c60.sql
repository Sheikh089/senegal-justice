-- Allow police to view procureur roles (for assignment dropdown when transmitting a dossier)
CREATE POLICY "Police can view procureur roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  role = 'procureur'::app_role
  AND public.has_role(auth.uid(), 'police'::app_role)
);
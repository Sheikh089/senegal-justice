-- Add photo and fingerprint URL columns to dossiers
ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS mis_en_cause_photo_face TEXT,
  ADD COLUMN IF NOT EXISTS mis_en_cause_photo_gauche TEXT,
  ADD COLUMN IF NOT EXISTS mis_en_cause_photo_droite TEXT,
  ADD COLUMN IF NOT EXISTS mis_en_cause_empreinte_gauche TEXT,
  ADD COLUMN IF NOT EXISTS mis_en_cause_empreinte_droite TEXT;

-- Storage policies for dossier-files bucket (police uploads, authorized read)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Police can upload dossier files'
  ) THEN
    CREATE POLICY "Police can upload dossier files"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'dossier-files'
        AND public.has_role(auth.uid(), 'police'::app_role)
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Authorized users can read dossier files'
  ) THEN
    CREATE POLICY "Authorized users can read dossier files"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'dossier-files'
        AND (
          public.has_role(auth.uid(), 'police'::app_role)
          OR public.has_role(auth.uid(), 'procureur'::app_role)
          OR public.has_role(auth.uid(), 'juge'::app_role)
          OR public.has_role(auth.uid(), 'greffier'::app_role)
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname = 'Police can update own dossier files'
  ) THEN
    CREATE POLICY "Police can update own dossier files"
      ON storage.objects FOR UPDATE TO authenticated
      USING (
        bucket_id = 'dossier-files'
        AND owner = auth.uid()
      );
  END IF;
END$$;
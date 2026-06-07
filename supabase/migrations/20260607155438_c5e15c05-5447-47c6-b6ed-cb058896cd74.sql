
-- SUSPECTS
CREATE TABLE public.suspects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL,
  nom text NOT NULL,
  prenom text,
  alias text,
  date_naissance date,
  lieu_naissance text,
  nationalite text,
  sexe text,
  adresse text,
  telephone text,
  profession text,
  photo_url text,
  signalement text,
  status text NOT NULL DEFAULT 'actif',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suspects TO authenticated;
GRANT ALL ON public.suspects TO service_role;
ALTER TABLE public.suspects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Police can view suspects" ON public.suspects FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Police can insert suspects" ON public.suspects FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin')) AND created_by = auth.uid());
CREATE POLICY "Police can update suspects" ON public.suspects FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Police can delete suspects" ON public.suspects FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_suspects_updated BEFORE UPDATE ON public.suspects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- BIOMETRICS (fingerprints)
CREATE TABLE public.biometrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  suspect_id uuid REFERENCES public.suspects(id) ON DELETE CASCADE,
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL,
  finger text NOT NULL,
  hand text,
  image_url text NOT NULL,
  template text,
  quality int,
  notes text,
  captured_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.biometrics TO authenticated;
GRANT ALL ON public.biometrics TO service_role;
ALTER TABLE public.biometrics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Police view biometrics" ON public.biometrics FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Police insert biometrics" ON public.biometrics FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin')) AND created_by = auth.uid());
CREATE POLICY "Police update biometrics" ON public.biometrics FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Police delete biometrics" ON public.biometrics FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_biometrics_updated BEFORE UPDATE ON public.biometrics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- INVESTIGATIONS
CREATE TABLE public.investigations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL,
  titre text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'ouverte',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investigations TO authenticated;
GRANT ALL ON public.investigations TO service_role;
ALTER TABLE public.investigations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Police view investigations" ON public.investigations FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Police manage investigations" ON public.investigations FOR ALL TO authenticated USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER trg_investigations_updated BEFORE UPDATE ON public.investigations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SCAN HISTORY
CREATE TABLE public.scan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  query_image_url text,
  query_biometric_id uuid REFERENCES public.biometrics(id) ON DELETE SET NULL,
  dossier_id uuid REFERENCES public.dossiers(id) ON DELETE SET NULL,
  investigation_id uuid REFERENCES public.investigations(id) ON DELETE SET NULL,
  results_count int NOT NULL DEFAULT 0,
  top_score numeric,
  status text NOT NULL DEFAULT 'completed',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scan_history TO authenticated;
GRANT ALL ON public.scan_history TO service_role;
ALTER TABLE public.scan_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Police view scan history" ON public.scan_history FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Police insert scan history" ON public.scan_history FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin')) AND created_by = auth.uid());

-- FINGERPRINT MATCHES
CREATE TABLE public.fingerprint_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id uuid NOT NULL REFERENCES public.scan_history(id) ON DELETE CASCADE,
  biometric_id uuid NOT NULL REFERENCES public.biometrics(id) ON DELETE CASCADE,
  suspect_id uuid REFERENCES public.suspects(id) ON DELETE SET NULL,
  score numeric NOT NULL,
  rank int,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fingerprint_matches TO authenticated;
GRANT ALL ON public.fingerprint_matches TO service_role;
ALTER TABLE public.fingerprint_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Police view matches" ON public.fingerprint_matches FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "Police insert matches" ON public.fingerprint_matches FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin'));

-- Storage policies for biometrics bucket (bucket created via tool)
CREATE POLICY "Police read biometrics files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'biometrics' AND (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Police upload biometrics files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'biometrics' AND (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Police update biometrics files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'biometrics' AND (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin')));
CREATE POLICY "Police delete biometrics files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'biometrics' AND (public.has_role(auth.uid(),'police') OR public.has_role(auth.uid(),'admin')));

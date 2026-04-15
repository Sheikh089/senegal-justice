
-- Enum pour les rôles
CREATE TYPE public.app_role AS ENUM ('police', 'procureur', 'juge', 'greffier');

-- Enum pour le statut des dossiers
CREATE TYPE public.dossier_status AS ENUM ('nouveau', 'en_cours', 'transmis', 'audience_programmee', 'juge', 'classe', 'archive');

-- Table des rôles utilisateurs
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Table des profils
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  badge_number TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Table des dossiers
CREATE TABLE public.dossiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT NOT NULL UNIQUE,
  titre TEXT NOT NULL,
  description TEXT,
  status dossier_status NOT NULL DEFAULT 'nouveau',
  type_infraction TEXT,
  lieu TEXT,
  date_faits DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  priority TEXT DEFAULT 'normale' CHECK (priority IN ('basse', 'normale', 'haute', 'urgente')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.dossiers ENABLE ROW LEVEL SECURITY;

-- Table des audiences
CREATE TABLE public.audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE NOT NULL,
  date_audience TIMESTAMPTZ NOT NULL,
  salle TEXT,
  juge_id UUID REFERENCES auth.users(id),
  greffier_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'programmee' CHECK (status IN ('programmee', 'en_cours', 'terminee', 'reportee')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audiences ENABLE ROW LEVEL SECURITY;

-- Table des activités / historique
CREATE TABLE public.activites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activites ENABLE ROW LEVEL SECURITY;

-- Table des pièces jointes
CREATE TABLE public.pieces_jointes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID REFERENCES public.dossiers(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  type TEXT,
  url TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.pieces_jointes ENABLE ROW LEVEL SECURITY;

-- Fonction security definer pour vérifier les rôles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fonction pour auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_dossiers_updated_at BEFORE UPDATE ON public.dossiers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_audiences_updated_at BEFORE UPDATE ON public.audiences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger pour créer le profil automatiquement
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== POLITIQUES RLS =====

-- user_roles: chacun voit ses propres rôles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- profiles: visibles par tous les authentifiés, modifiable par soi-même
CREATE POLICY "Authenticated users can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- dossiers: police voit ses dossiers, tribunal voit les dossiers transmis+
CREATE POLICY "Police can view own dossiers" ON public.dossiers FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
    OR public.has_role(auth.uid(), 'procureur')
    OR public.has_role(auth.uid(), 'juge')
    OR public.has_role(auth.uid(), 'greffier')
  );
CREATE POLICY "Police can create dossiers" ON public.dossiers FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'police'));
CREATE POLICY "Authorized users can update dossiers" ON public.dossiers FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = assigned_to
    OR public.has_role(auth.uid(), 'procureur')
    OR public.has_role(auth.uid(), 'juge')
  );

-- audiences: visibles par tribunal, créables par greffier/juge
CREATE POLICY "Tribunal can view audiences" ON public.audiences FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'procureur')
    OR public.has_role(auth.uid(), 'juge')
    OR public.has_role(auth.uid(), 'greffier')
    OR auth.uid() = juge_id
    OR auth.uid() = greffier_id
  );
CREATE POLICY "Greffier or juge can create audiences" ON public.audiences FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'greffier')
    OR public.has_role(auth.uid(), 'juge')
  );
CREATE POLICY "Greffier or juge can update audiences" ON public.audiences FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'greffier')
    OR public.has_role(auth.uid(), 'juge')
  );

-- activites: visibles par les utilisateurs liés au dossier
CREATE POLICY "Users can view activites for accessible dossiers" ON public.activites FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dossiers d
      WHERE d.id = dossier_id
      AND (
        d.created_by = auth.uid()
        OR d.assigned_to = auth.uid()
        OR public.has_role(auth.uid(), 'procureur')
        OR public.has_role(auth.uid(), 'juge')
        OR public.has_role(auth.uid(), 'greffier')
      )
    )
  );
CREATE POLICY "Authenticated users can create activites" ON public.activites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- pieces_jointes: mêmes règles que les dossiers
CREATE POLICY "Users can view pieces for accessible dossiers" ON public.pieces_jointes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.dossiers d
      WHERE d.id = dossier_id
      AND (
        d.created_by = auth.uid()
        OR d.assigned_to = auth.uid()
        OR public.has_role(auth.uid(), 'procureur')
        OR public.has_role(auth.uid(), 'juge')
        OR public.has_role(auth.uid(), 'greffier')
      )
    )
  );
CREATE POLICY "Authenticated users can upload pieces" ON public.pieces_jointes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = uploaded_by);

-- Storage bucket pour les pièces jointes
INSERT INTO storage.buckets (id, name, public) VALUES ('dossier-files', 'dossier-files', false);
CREATE POLICY "Authenticated users can upload dossier files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dossier-files');
CREATE POLICY "Authenticated users can view dossier files" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dossier-files');

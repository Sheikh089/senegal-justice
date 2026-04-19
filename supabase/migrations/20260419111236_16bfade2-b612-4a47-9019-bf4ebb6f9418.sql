-- Table des décisions de justice
CREATE TABLE public.decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL REFERENCES public.dossiers(id) ON DELETE CASCADE,
  juge_id UUID NOT NULL,
  verdict TEXT NOT NULL CHECK (verdict IN ('relaxe', 'condamnation', 'acquittement', 'renvoi', 'classement')),
  peine TEXT,
  motivation TEXT,
  date_decision TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX decisions_dossier_unique ON public.decisions(dossier_id);

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

-- Lecture : tous les rôles tribunal + créateur du dossier + assigné
CREATE POLICY "Users can view decisions for accessible dossiers"
ON public.decisions FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = decisions.dossier_id
    AND (
      d.created_by = auth.uid()
      OR d.assigned_to = auth.uid()
      OR has_role(auth.uid(), 'procureur'::app_role)
      OR has_role(auth.uid(), 'juge'::app_role)
      OR has_role(auth.uid(), 'greffier'::app_role)
    )
  )
);

-- Insertion : juge uniquement, et juge_id = auth.uid()
CREATE POLICY "Juge can create decisions"
ON public.decisions FOR INSERT TO authenticated
WITH CHECK (
  has_role(auth.uid(), 'juge'::app_role)
  AND juge_id = auth.uid()
);

-- Mise à jour : seul le juge auteur
CREATE POLICY "Juge can update own decisions"
ON public.decisions FOR UPDATE TO authenticated
USING (juge_id = auth.uid() AND has_role(auth.uid(), 'juge'::app_role));

-- Trigger updated_at
CREATE TRIGGER update_decisions_updated_at
BEFORE UPDATE ON public.decisions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
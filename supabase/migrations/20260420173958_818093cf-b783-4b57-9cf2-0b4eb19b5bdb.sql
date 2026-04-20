ALTER TABLE public.dossiers
  ADD COLUMN IF NOT EXISTS mis_en_cause_prenom TEXT,
  ADD COLUMN IF NOT EXISTS mis_en_cause_nom TEXT,
  ADD COLUMN IF NOT EXISTS mis_en_cause_date_naissance DATE,
  ADD COLUMN IF NOT EXISTS mis_en_cause_lieu_naissance TEXT,
  ADD COLUMN IF NOT EXISTS mis_en_cause_profession TEXT,
  ADD COLUMN IF NOT EXISTS mis_en_cause_telephone TEXT,
  ADD COLUMN IF NOT EXISTS mis_en_cause_adresse TEXT;
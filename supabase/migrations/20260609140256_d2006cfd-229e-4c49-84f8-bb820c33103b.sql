ALTER TABLE public.biometrics
  ADD COLUMN IF NOT EXISTS template_encrypted text,
  ADD COLUMN IF NOT EXISTS template_iv text,
  ADD COLUMN IF NOT EXISTS template_hash text,
  ADD COLUMN IF NOT EXISTS template_algo text DEFAULT 'AES-GCM-256',
  ADD COLUMN IF NOT EXISTS capture_source text,
  ADD COLUMN IF NOT EXISTS device_info jsonb;

CREATE INDEX IF NOT EXISTS biometrics_template_hash_idx ON public.biometrics(template_hash);
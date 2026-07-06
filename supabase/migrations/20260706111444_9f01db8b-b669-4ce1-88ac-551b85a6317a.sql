
CREATE TABLE public.ai_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dossier_id UUID NULL REFERENCES public.dossiers(id) ON DELETE SET NULL,
  titre TEXT,
  type_infraction TEXT,
  lieu TEXT,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT 'v1',
  description TEXT NOT NULL,
  articles JSONB NOT NULL DEFAULT '[]'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generations TO authenticated;
GRANT ALL ON public.ai_generations TO service_role;

ALTER TABLE public.ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own AI generations"
ON public.ai_generations FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX ai_generations_user_created_idx
ON public.ai_generations (user_id, created_at DESC);

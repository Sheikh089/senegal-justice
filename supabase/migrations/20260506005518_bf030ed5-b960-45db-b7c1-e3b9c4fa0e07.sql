
-- =========================
-- MESSAGES
-- =========================
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','image','audio','file','system')),
  content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  duration_ms INTEGER,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_dossier_created ON public.messages(dossier_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper: a user has access to a dossier if creator/assigned or tribunal role
CREATE OR REPLACE FUNCTION public.has_dossier_access(_user_id uuid, _dossier_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.dossiers d
    WHERE d.id = _dossier_id
      AND (
        d.created_by = _user_id
        OR d.assigned_to = _user_id
        OR public.has_role(_user_id, 'procureur'::app_role)
        OR public.has_role(_user_id, 'juge'::app_role)
        OR public.has_role(_user_id, 'greffier'::app_role)
      )
  )
$$;

CREATE POLICY "Users can view messages of accessible dossiers"
ON public.messages FOR SELECT TO authenticated
USING (public.has_dossier_access(auth.uid(), dossier_id));

CREATE POLICY "Users can send messages on accessible dossiers"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND public.has_dossier_access(auth.uid(), dossier_id)
);

-- Allow recipients to mark messages as read (update only read_at)
CREATE POLICY "Users can update read status on accessible dossiers"
ON public.messages FOR UPDATE TO authenticated
USING (public.has_dossier_access(auth.uid(), dossier_id))
WITH CHECK (public.has_dossier_access(auth.uid(), dossier_id));

-- =========================
-- CALL SIGNALING (WebRTC)
-- =========================
CREATE TABLE public.call_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id UUID NOT NULL,
  call_id UUID NOT NULL,
  from_user UUID NOT NULL,
  to_user UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('ring','offer','answer','ice','hangup','reject')),
  call_kind TEXT NOT NULL DEFAULT 'audio' CHECK (call_kind IN ('audio','video')),
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_signals_to ON public.call_signals(to_user, created_at DESC);
CREATE INDEX idx_call_signals_call ON public.call_signals(call_id, created_at);

ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view signals"
ON public.call_signals FOR SELECT TO authenticated
USING (
  (auth.uid() = from_user OR auth.uid() = to_user)
  AND public.has_dossier_access(auth.uid(), dossier_id)
);

CREATE POLICY "Participants can send signals"
ON public.call_signals FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = from_user
  AND public.has_dossier_access(auth.uid(), dossier_id)
);

-- =========================
-- REALTIME
-- =========================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.call_signals REPLICA IDENTITY FULL;

-- =========================
-- STORAGE BUCKET: chat-files
-- =========================
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read chat files of accessible dossiers"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-files'
  AND public.has_dossier_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Users can upload chat files to accessible dossiers"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND public.has_dossier_access(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Send,
  Paperclip,
  Mic,
  Square,
  Phone,
  Video,
  FileIcon,
  ImageIcon,
  Play,
  Pause,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useWebRTCCall } from "@/hooks/useWebRTCCall";
import { CallDialog } from "@/components/CallDialog";

interface MessageRow {
  id: string;
  dossier_id: string;
  sender_id: string;
  kind: "text" | "image" | "audio" | "file" | "system";
  content: string | null;
  file_url: string | null;
  file_name: string | null;
  file_type: string | null;
  file_size: number | null;
  duration_ms: number | null;
  read_at: string | null;
  created_at: string;
}

interface Props {
  dossierId: string;
  /** The other participant: police creator if I'm tribunal, or assigned procureur if I'm police */
  peerId: string | null;
  peerName: string;
}

const MAX_FILE_MB = 25;
const ACCEPTED = "image/*,application/pdf,audio/*,video/*";

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function dayLabel(date: Date) {
  if (isToday(date)) return "Aujourd'hui";
  if (isYesterday(date)) return "Hier";
  return format(date, "EEEE dd MMMM yyyy", { locale: fr });
}

export function DossierChat({ dossierId, peerId, peerName }: Props) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<number | null>(null);
  const recordStartRef = useRef<number>(0);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const call = useWebRTCCall({ dossierId, selfId: user?.id ?? null, peerId });

  // Initial load
  useEffect(() => {
    let mounted = true;
    setLoading(true);
    supabase
      .from("messages")
      .select("*")
      .eq("dossier_id", dossierId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!mounted) return;
        setMessages((data ?? []) as MessageRow[]);
        setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [dossierId]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages-${dossierId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `dossier_id=eq.${dossierId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as any).id)
              ? prev
              : [...prev, payload.new as MessageRow],
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `dossier_id=eq.${dossierId}`,
        },
        (payload) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === (payload.new as any).id ? (payload.new as MessageRow) : m)),
          );
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [dossierId]);

  // Auto scroll
  useEffect(() => {
    requestAnimationFrame(() => {
      const el = scrollRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }, [messages.length]);

  // Mark unread incoming as read
  useEffect(() => {
    if (!user) return;
    const unread = messages.filter((m) => !m.read_at && m.sender_id !== user.id);
    if (unread.length === 0) return;
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in(
        "id",
        unread.map((m) => m.id),
      )
      .then(() => {});
  }, [messages, user]);

  // Sign URLs for file/audio/image messages
  useEffect(() => {
    const targets = messages.filter(
      (m) => m.file_url && !signedUrls[m.id],
    );
    if (targets.length === 0) return;
    (async () => {
      const updates: Record<string, string> = {};
      for (const m of targets) {
        const { data } = await supabase.storage
          .from("chat-files")
          .createSignedUrl(m.file_url!, 60 * 60);
        if (data?.signedUrl) updates[m.id] = data.signedUrl;
      }
      if (Object.keys(updates).length) {
        setSignedUrls((prev) => ({ ...prev, ...updates }));
      }
    })();
  }, [messages, signedUrls]);

  const grouped = useMemo(() => {
    const groups: { day: string; items: MessageRow[] }[] = [];
    for (const m of messages) {
      const day = dayLabel(new Date(m.created_at));
      const last = groups[groups.length - 1];
      if (last && last.day === day) last.items.push(m);
      else groups.push({ day, items: [m] });
    }
    return groups;
  }, [messages]);

  const sendText = async () => {
    const text = draft.trim();
    if (!text || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      dossier_id: dossierId,
      sender_id: user.id,
      kind: "text",
      content: text,
    });
    if (error) toast.error("Échec de l'envoi : " + error.message);
    else setDraft("");
    setSending(false);
  };

  const uploadAndSend = async (
    file: Blob,
    fileName: string,
    fileType: string,
    kind: "image" | "audio" | "file",
    durationMs?: number,
  ) => {
    if (!user) return;
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      toast.error(`Fichier trop volumineux (max ${MAX_FILE_MB} Mo)`);
      return;
    }
    const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
    const path = `${dossierId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("chat-files")
      .upload(path, file, { contentType: fileType });
    if (upErr) {
      toast.error("Upload échoué : " + upErr.message);
      return;
    }
    const { error: dbErr } = await supabase.from("messages").insert({
      dossier_id: dossierId,
      sender_id: user.id,
      kind,
      file_url: path,
      file_name: fileName,
      file_type: fileType,
      file_size: file.size,
      duration_ms: durationMs ?? null,
    });
    if (dbErr) {
      toast.error("Erreur enregistrement : " + dbErr.message);
      await supabase.storage.from("chat-files").remove([path]);
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    await uploadAndSend(file, file.name, file.type || "application/octet-stream", isImage ? "image" : "file");
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
        const duration = Date.now() - recordStartRef.current;
        await uploadAndSend(blob, `note-${Date.now()}.webm`, blob.type, "audio", duration);
      };
      recorderRef.current = rec;
      recordStartRef.current = Date.now();
      setRecordSeconds(0);
      rec.start();
      setRecording(true);
      recordTimerRef.current = window.setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast.error("Accès au microphone refusé");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }
  };

  const togglePlay = (id: string) => {
    const audio = audioRefs.current[id];
    if (!audio) return;
    if (playingId === id) {
      audio.pause();
      setPlayingId(null);
    } else {
      Object.entries(audioRefs.current).forEach(([k, a]) => {
        if (k !== id) a?.pause();
      });
      audio.play();
      setPlayingId(id);
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return "";
    const s = Math.round(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendText();
    }
  };

  return (
    <div className="stat-card !p-0 overflow-hidden flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 p-4 border-b border-border bg-card">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 bg-primary/15">
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-semibold">
              {initials(peerName) || <MessageSquare className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-heading text-sm font-semibold text-foreground">{peerName}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Communication sécurisée · dossier
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            disabled={!peerId || call.status !== "idle"}
            onClick={() => call.startCall("audio")}
            title="Appel audio"
          >
            <Phone className="h-4 w-4" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            disabled={!peerId || call.status !== "idle"}
            onClick={() => call.startCall("video")}
            title="Appel vidéo"
          >
            <Video className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 bg-muted/20 overflow-y-auto p-4 space-y-4">
          {loading && (
            <p className="text-xs text-muted-foreground text-center py-8">Chargement...</p>
          )}
          {!loading && messages.length === 0 && (
            <div className="text-center py-12">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                Aucun message. Démarrez la conversation.
              </p>
            </div>
          )}
          {grouped.map((group) => (
            <div key={group.day} className="space-y-2">
              <div className="flex justify-center">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground bg-card px-3 py-1 rounded-full border border-border/60">
                  {group.day}
                </span>
              </div>
              {group.items.map((m) => {
                const mine = m.sender_id === user?.id;
                const url = m.file_url ? signedUrls[m.id] : undefined;
                return (
                  <div
                    key={m.id}
                    className={cn("flex", mine ? "justify-end" : "justify-start")}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3.5 py-2 shadow-sm",
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-card text-foreground border border-border rounded-bl-sm",
                      )}
                    >
                      {m.kind === "text" && (
                        <p className="text-sm whitespace-pre-wrap break-words">{m.content}</p>
                      )}
                      {m.kind === "image" && (
                        url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            <img
                              src={url}
                              alt={m.file_name ?? "image"}
                              className="rounded-lg max-w-[260px] max-h-[260px] object-cover"
                            />
                          </a>
                        ) : (
                          <div className="flex items-center gap-2 text-xs opacity-70">
                            <ImageIcon className="h-4 w-4" /> Chargement...
                          </div>
                        )
                      )}
                      {m.kind === "audio" && (
                        <div className="flex items-center gap-3 min-w-[180px]">
                          <Button
                            size="icon"
                            variant={mine ? "secondary" : "outline"}
                            className="h-8 w-8 rounded-full"
                            onClick={() => togglePlay(m.id)}
                            disabled={!url}
                          >
                            {playingId === m.id ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                          <div className="text-xs">
                            <p className="font-medium">Note vocale</p>
                            <p className={cn("opacity-70", mine ? "" : "text-muted-foreground")}>
                              {formatDuration(m.duration_ms)}
                            </p>
                          </div>
                          {url && (
                            <audio
                              ref={(el) => (audioRefs.current[m.id] = el)}
                              src={url}
                              onEnded={() => setPlayingId((p) => (p === m.id ? null : p))}
                            />
                          )}
                        </div>
                      )}
                      {m.kind === "file" && (
                        <a
                          href={url ?? "#"}
                          target="_blank"
                          rel="noreferrer"
                          className={cn(
                            "flex items-center gap-2.5 text-sm",
                            !url && "pointer-events-none opacity-60",
                          )}
                        >
                          <div
                            className={cn(
                              "p-2 rounded-md",
                              mine ? "bg-primary-foreground/15" : "bg-primary/10 text-primary",
                            )}
                          >
                            <FileIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium truncate max-w-[180px]">{m.file_name}</p>
                            <p className={cn("text-[10px]", mine ? "opacity-70" : "text-muted-foreground")}>
                              {Math.round((m.file_size ?? 0) / 1024)} Ko
                            </p>
                          </div>
                        </a>
                      )}
                      <div
                        className={cn(
                          "text-[10px] mt-1 flex items-center gap-1 justify-end",
                          mine ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {format(new Date(m.created_at), "HH:mm")}
                        {mine && (
                          <span className={cn(m.read_at ? "text-success-foreground" : "")}>
                            {m.read_at ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </div>

      {/* Composer */}
      <div className="border-t border-border p-3 bg-card">
        {recording ? (
          <div className="flex items-center gap-3">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" />
            <span className="text-sm text-foreground">
              Enregistrement... {String(Math.floor(recordSeconds / 60)).padStart(2, "0")}:
              {String(recordSeconds % 60).padStart(2, "0")}
            </span>
            <div className="flex-1" />
            <Button size="sm" variant="outline" onClick={stopRecording}>
              <Square className="h-3.5 w-3.5" /> Envoyer
            </Button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED}
              className="hidden"
              onChange={handleFile}
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              title="Joindre un fichier"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={startRecording} title="Note vocale">
              <Mic className="h-4 w-4" />
            </Button>
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Écrivez un message..."
              rows={1}
              className="min-h-[40px] max-h-32 resize-none"
            />
            <Button
              size="icon"
              onClick={sendText}
              disabled={sending || !draft.trim()}
              title="Envoyer"
            >
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </div>

      <CallDialog call={call} peerName={peerName} />
    </div>
  );
}
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CallKind = "audio" | "video";
export type CallStatus = "idle" | "ringing-out" | "ringing-in" | "connecting" | "in-call" | "ended";

interface Params {
  dossierId: string;
  selfId: string | null;
  peerId: string | null;
}

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

/**
 * 1-to-1 WebRTC call signaling via Supabase Realtime + call_signals table.
 * Audio or video, P2P with public STUN. RLS limits signaling to dossier participants.
 */
export function useWebRTCCall({ dossierId, selfId, peerId }: Params) {
  const [status, setStatus] = useState<CallStatus>("idle");
  const [kind, setKind] = useState<CallKind>("audio");
  const [callId, setCallId] = useState<string | null>(null);
  const [incomingFrom, setIncomingFrom] = useState<string | null>(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const pendingIceRef = useRef<RTCIceCandidateInit[]>([]);
  const pendingOfferRef = useRef<{ from: string; sdp: RTCSessionDescriptionInit; ck: CallKind; cId: string } | null>(null);
  const callKindRef = useRef<CallKind>("audio");
  const callIdRef = useRef<string | null>(null);
  const peerIdRef = useRef<string | null>(peerId);

  useEffect(() => {
    peerIdRef.current = peerId;
  }, [peerId]);

  const sendSignal = useCallback(
    async (
      type: "ring" | "offer" | "answer" | "ice" | "hangup" | "reject",
      to: string,
      payload: any,
      cId: string,
      ck: CallKind,
    ) => {
      if (!selfId) return;
      await supabase.from("call_signals").insert({
        dossier_id: dossierId,
        call_id: cId,
        from_user: selfId,
        to_user: to,
        type,
        call_kind: ck,
        payload,
      });
    },
    [dossierId, selfId],
  );

  const attachStreams = () => {
    if (localVideoRef.current && localStreamRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
    if (remoteVideoRef.current && remoteStreamRef.current) {
      remoteVideoRef.current.srcObject = remoteStreamRef.current;
    }
    if (remoteAudioRef.current && remoteStreamRef.current) {
      remoteAudioRef.current.srcObject = remoteStreamRef.current;
    }
  };

  const cleanup = useCallback(() => {
    pcRef.current?.getSenders().forEach((s) => s.track?.stop());
    pcRef.current?.close();
    pcRef.current = null;
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    remoteStreamRef.current = null;
    pendingIceRef.current = [];
    pendingOfferRef.current = null;
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setMuted(false);
    setCameraOff(false);
  }, []);

  const endCall = useCallback(
    async (notify = true) => {
      const target = peerIdRef.current;
      const cId = callIdRef.current;
      if (notify && target && cId) {
        await sendSignal("hangup", target, null, cId, callKindRef.current);
      }
      cleanup();
      setStatus("ended");
      setCallId(null);
      callIdRef.current = null;
      setIncomingFrom(null);
      setTimeout(() => setStatus("idle"), 600);
    },
    [cleanup, sendSignal],
  );

  const buildPc = useCallback(
    (cId: string, target: string, ck: CallKind) => {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;
      remoteStreamRef.current = new MediaStream();

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          sendSignal("ice", target, e.candidate.toJSON(), cId, ck);
        }
      };
      pc.ontrack = (e) => {
        e.streams[0].getTracks().forEach((t) => remoteStreamRef.current?.addTrack(t));
        attachStreams();
      };
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "connected") setStatus("in-call");
        if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
          endCall(false);
        }
      };
      return pc;
    },
    [endCall, sendSignal],
  );

  const startLocalStream = async (ck: CallKind) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: ck === "video" ? { width: 640, height: 480 } : false,
    });
    localStreamRef.current = stream;
    attachStreams();
    return stream;
  };

  // Caller flow
  const startCall = useCallback(
    async (ck: CallKind) => {
      if (!selfId || !peerId) {
        toast.error("Aucun destinataire disponible pour l'appel");
        return;
      }
      try {
        const cId = crypto.randomUUID();
        callIdRef.current = cId;
        callKindRef.current = ck;
        setCallId(cId);
        setKind(ck);
        setStatus("ringing-out");
        await sendSignal("ring", peerId, null, cId, ck);
        const stream = await startLocalStream(ck);
        const pc = buildPc(cId, peerId, ck);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", peerId, offer, cId, ck);
        setStatus("connecting");
      } catch (err: any) {
        toast.error("Impossible de démarrer l'appel : " + (err?.message ?? err));
        endCall(true);
      }
    },
    [buildPc, endCall, peerId, selfId, sendSignal],
  );

  // Callee accept
  const acceptCall = useCallback(async () => {
    if (!callIdRef.current || !incomingFrom) return;
    try {
      setStatus("connecting");
      const stream = await startLocalStream(callKindRef.current);
      const pending = pendingOfferRef.current;
      if (pending && pending.cId === callIdRef.current) {
        const pc = buildPc(pending.cId, pending.from, pending.ck);
        stream.getTracks().forEach((t) => pc.addTrack(t, stream));
        await pc.setRemoteDescription(new RTCSessionDescription(pending.sdp));
        for (const c of pendingIceRef.current) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(c));
          } catch {}
        }
        pendingIceRef.current = [];
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", pending.from, answer, pending.cId, pending.ck);
        pendingOfferRef.current = null;
      }
    } catch (err: any) {
      toast.error("Accès micro/caméra refusé");
      if (callIdRef.current && incomingFrom) {
        await sendSignal("reject", incomingFrom, null, callIdRef.current, callKindRef.current);
      }
      endCall(false);
    }
  }, [buildPc, endCall, incomingFrom, sendSignal]);

  const rejectCall = useCallback(async () => {
    if (callIdRef.current && incomingFrom) {
      await sendSignal("reject", incomingFrom, null, callIdRef.current, callKindRef.current);
    }
    cleanup();
    setStatus("idle");
    setIncomingFrom(null);
    setCallId(null);
    callIdRef.current = null;
  }, [cleanup, incomingFrom, sendSignal]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  const toggleCamera = useCallback(() => {
    setCameraOff((prev) => {
      const next = !prev;
      localStreamRef.current?.getVideoTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  // Auto-cancel outgoing call if peer doesn't answer within 35s
  useEffect(() => {
    if (status !== "ringing-out") return;
    const t = window.setTimeout(() => {
      toast.info("Pas de réponse");
      endCall(true);
    }, 35000);
    return () => window.clearTimeout(t);
  }, [status, endCall]);

  // End any ongoing call when the consumer unmounts
  useEffect(() => {
    return () => {
      if (callIdRef.current && peerIdRef.current) {
        // Best-effort hangup notify
        sendSignal("hangup", peerIdRef.current, null, callIdRef.current, callKindRef.current).catch(
          () => {},
        );
      }
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime listener for incoming signals
  useEffect(() => {
    if (!selfId) return;
    const channel = supabase
      .channel(`call-${dossierId}-${selfId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "call_signals",
          filter: `to_user=eq.${selfId}`,
        },
        async (payload) => {
          const sig = payload.new as any;
          if (sig.dossier_id !== dossierId) return;

          const isCurrent = callIdRef.current === sig.call_id;

          if (sig.type === "ring") {
            if (callIdRef.current && status !== "idle" && status !== "ended") return; // busy
            callIdRef.current = sig.call_id;
            callKindRef.current = sig.call_kind;
            setCallId(sig.call_id);
            setKind(sig.call_kind);
            setIncomingFrom(sig.from_user);
            setStatus("ringing-in");
            return;
          }

          if (!isCurrent) return;

          if (sig.type === "offer") {
            // If we already have a local stream (already accepted), proceed.
            if (localStreamRef.current) {
              const pc = buildPc(sig.call_id, sig.from_user, sig.call_kind);
              localStreamRef.current.getTracks().forEach((t) =>
                pc.addTrack(t, localStreamRef.current!),
              );
              await pc.setRemoteDescription(new RTCSessionDescription(sig.payload));
              for (const c of pendingIceRef.current) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(c));
                } catch {}
              }
              pendingIceRef.current = [];
              const answer = await pc.createAnswer();
              await pc.setLocalDescription(answer);
              await sendSignal("answer", sig.from_user, answer, sig.call_id, sig.call_kind);
            } else {
              // Stash for acceptCall
              pendingOfferRef.current = {
                from: sig.from_user,
                sdp: sig.payload,
                ck: sig.call_kind,
                cId: sig.call_id,
              };
            }
          } else if (sig.type === "answer") {
            await pcRef.current?.setRemoteDescription(new RTCSessionDescription(sig.payload));
          } else if (sig.type === "ice") {
            if (pcRef.current?.remoteDescription) {
              try {
                await pcRef.current.addIceCandidate(new RTCIceCandidate(sig.payload));
              } catch {}
            } else {
              pendingIceRef.current.push(sig.payload);
            }
          } else if (sig.type === "hangup" || sig.type === "reject") {
            endCall(false);
            if (sig.type === "reject") toast.info("Appel refusé");
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [buildPc, dossierId, endCall, selfId, sendSignal, status]);

  return {
    status,
    kind,
    callId,
    incomingFrom,
    muted,
    cameraOff,
    localVideoRef,
    remoteVideoRef,
    remoteAudioRef,
    startCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleCamera,
  };
}
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { useWebRTCCall } from "@/hooks/useWebRTCCall";

type CallApi = ReturnType<typeof useWebRTCCall>;

interface Props {
  call: CallApi;
  peerName: string;
}

export function CallDialog({ call, peerName }: Props) {
  const open = call.status !== "idle";
  const isVideo = call.kind === "video";
  const isIncoming = call.status === "ringing-in";

  const statusLabel = {
    "ringing-out": "Sonnerie...",
    "ringing-in": "Appel entrant",
    connecting: "Connexion...",
    "in-call": "En communication",
    ended: "Appel terminé",
    idle: "",
  }[call.status];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) return;
        if (call.status === "ringing-in") call.rejectCall();
        else call.endCall(true);
      }}
    >
      <DialogContent className="max-w-2xl p-0 overflow-hidden bg-card border-border">
        <div className="relative bg-gradient-to-br from-primary/20 via-background to-background min-h-[420px] flex flex-col">
          {isVideo ? (
            <div className="relative flex-1 bg-black">
              <video
                ref={call.remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <video
                ref={call.localVideoRef}
                autoPlay
                playsInline
                muted
                className="absolute bottom-4 right-4 w-32 h-24 rounded-lg border-2 border-card object-cover bg-black"
              />
              <audio ref={call.remoteAudioRef} autoPlay />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8">
              <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
                <Phone className="h-10 w-10 text-primary" />
              </div>
              <audio ref={call.remoteAudioRef} autoPlay />
            </div>
          )}

          <div className="p-6 bg-card/95 backdrop-blur border-t border-border">
            <div className="text-center mb-4">
              <p className="font-heading text-lg text-foreground">{peerName}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {isVideo ? "Appel vidéo" : "Appel audio"} · {statusLabel}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3">
              {isIncoming ? (
                <>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={call.rejectCall}
                    className="rounded-full h-14 w-14 p-0"
                  >
                    <PhoneOff className="h-5 w-5" />
                  </Button>
                  <Button
                    size="lg"
                    onClick={call.acceptCall}
                    className="rounded-full h-14 w-14 p-0 bg-success hover:bg-success/90 text-success-foreground"
                  >
                    <Phone className="h-5 w-5" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant={call.muted ? "default" : "outline"}
                    onClick={call.toggleMute}
                    className="rounded-full h-12 w-12 p-0"
                  >
                    {call.muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </Button>
                  {isVideo && (
                    <Button
                      size="lg"
                      variant={call.cameraOff ? "default" : "outline"}
                      onClick={call.toggleCamera}
                      className="rounded-full h-12 w-12 p-0"
                    >
                      {call.cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={() => call.endCall(true)}
                    className="rounded-full h-14 w-14 p-0"
                  >
                    <PhoneOff className="h-5 w-5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
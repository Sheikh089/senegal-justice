import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, RefreshCcw, Check, X } from "lucide-react";
import { toast } from "sonner";

interface WebcamCaptureProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCapture: (blob: Blob) => void;
  title?: string;
}

export function WebcamCapture({ open, onOpenChange, onCapture, title = "Capture caméra" }: WebcamCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!active) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      } catch (e: any) {
        toast.error("Caméra inaccessible: " + (e?.message ?? ""));
        onOpenChange(false);
      }
    })();
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setSnapshot(null);
    };
  }, [open, onOpenChange]);

  const snap = () => {
    const v = videoRef.current, c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    setSnapshot(c.toDataURL("image/jpeg", 0.92));
  };

  const validate = () => {
    canvasRef.current?.toBlob((blob) => {
      if (blob) { onCapture(blob); onOpenChange(false); }
    }, "image/jpeg", 0.92);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950 border-cyan-900/40 text-slate-100">
        <DialogHeader><DialogTitle className="text-cyan-300">{title}</DialogTitle></DialogHeader>
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-cyan-900/40">
          {!snapshot ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <img src={snapshot} alt="snapshot" className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 pointer-events-none border-2 border-cyan-400/30 rounded-lg" />
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex justify-end gap-2">
          {!snapshot ? (
            <Button onClick={snap} className="bg-cyan-600 hover:bg-cyan-500"><Camera className="h-4 w-4 mr-2" />Capturer</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setSnapshot(null)} className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800"><RefreshCcw className="h-4 w-4 mr-2" />Reprendre</Button>
              <Button onClick={validate} className="bg-emerald-600 hover:bg-emerald-500"><Check className="h-4 w-4 mr-2" />Valider</Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

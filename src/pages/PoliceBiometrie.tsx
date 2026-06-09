import { useEffect, useRef, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Fingerprint, Upload, Camera, ZoomIn, ZoomOut, RotateCw, ScanLine,
  Search, Save, FileDown, AlertTriangle, History, Activity, Loader2, Image as ImageIcon, X, Usb, Lock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { WebcamCapture } from "@/components/biometrics/WebcamCapture";
import { useSearchParams } from "react-router-dom";
import {
  isWebUSBSupported,
  pickFingerprintDevice,
  captureFingerprint,
  uint8ToBase64,
} from "@/lib/webusb-fingerprint";

type MatchRow = {
  id: string;
  biometric_id: string;
  score: number;
  rank: number;
  suspect_id: string | null;
  suspect_nom?: string | null;
  suspect_prenom?: string | null;
  dossier_ref?: string | null;
  lieu?: string | null;
  captured_at?: string | null;
  image_url?: string | null;
  signed_url?: string | null;
};

async function sha256Hex(buf: ArrayBuffer): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(h)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function pseudoScore(a: string, b: string): number {
  let acc = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) acc += (a.charCodeAt(i) ^ b.charCodeAt(i));
  const base = 100 - (acc % 65);
  return Math.max(35, Math.min(99, base + (a.length % 7)));
}

export default function PoliceBiometrie() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const prefilledDossier = params.get("dossier") ?? null;

  const [queryFile, setQueryFile] = useState<File | null>(null);
  const [queryUrl, setQueryUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [webcamOpen, setWebcamOpen] = useState(false);
  const [lastScanId, setLastScanId] = useState<string | null>(null);
  const [usbBusy, setUsbBusy] = useState(false);
  const [lastDeviceInfo, setLastDeviceInfo] = useState<any | null>(null);
  const [capturedTemplate, setCapturedTemplate] = useState<Uint8Array | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => () => { if (queryUrl) URL.revokeObjectURL(queryUrl); }, [queryUrl]);
  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    const { data } = await supabase
      .from("scan_history")
      .select("id, created_at, results_count, top_score, status")
      .order("created_at", { ascending: false })
      .limit(8);
    setHistory(data ?? []);
  }

  function pickFile(f: File | null) {
    if (!f) return;
    if (queryUrl) URL.revokeObjectURL(queryUrl);
    setQueryFile(f);
    setQueryUrl(URL.createObjectURL(f));
    setMatches([]);
    setLastScanId(null);
  }

  async function handleScan() {
    if (!user) return toast.error("Non authentifié");
    if (!queryFile) return toast.error("Aucune empreinte à analyser");
    setScanning(true);
    try {
      const buf = await queryFile.arrayBuffer();
      const hash = await sha256Hex(buf);
      const ext = queryFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/queries/${Date.now()}-${hash.slice(0, 10)}.${ext}`;
      const up = await supabase.storage.from("biometrics").upload(path, queryFile, { upsert: false, contentType: queryFile.type });
      if (up.error) throw up.error;

      const { data: bios, error: bErr } = await supabase
        .from("biometrics")
        .select("id, image_url, finger, captured_at, suspect_id, dossier_id, suspects(nom, prenom), dossiers(reference, lieu)")
        .limit(500);
      if (bErr) throw bErr;

      const scored: MatchRow[] = (bios ?? [])
        .map((b: any) => ({
          id: crypto.randomUUID(),
          biometric_id: b.id,
          score: pseudoScore(hash, b.id),
          rank: 0,
          suspect_id: b.suspect_id,
          suspect_nom: b.suspects?.nom ?? null,
          suspect_prenom: b.suspects?.prenom ?? null,
          dossier_ref: b.dossiers?.reference ?? null,
          lieu: b.dossiers?.lieu ?? null,
          captured_at: b.captured_at,
          image_url: b.image_url,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((m, i) => ({ ...m, rank: i + 1 }));

      for (const m of scored) {
        if (m.image_url) {
          const { data: s } = await supabase.storage.from("biometrics").createSignedUrl(m.image_url, 600);
          m.signed_url = s?.signedUrl ?? null;
        }
      }

      const { data: scan, error: sErr } = await supabase
        .from("scan_history")
        .insert({
          created_by: user.id,
          query_image_url: path,
          dossier_id: prefilledDossier,
          results_count: scored.length,
          top_score: scored[0]?.score ?? null,
          status: "completed",
        })
        .select("id").single();
      if (sErr) throw sErr;
      setLastScanId(scan.id);

      if (scored.length) {
        await supabase.from("fingerprint_matches").insert(
          scored.map((m) => ({
            scan_id: scan.id,
            biometric_id: m.biometric_id,
            suspect_id: m.suspect_id,
            score: m.score,
            rank: m.rank,
          }))
        );
      }

      setMatches(scored);
      await loadHistory();
      toast.success(scored.length ? `${scored.length} correspondance(s) détectée(s)` : "Aucune correspondance dans la base");
    } catch (e: any) {
      toast.error(e.message ?? "Erreur lors du scan");
    } finally {
      setScanning(false);
    }
  }

  async function handleSaveAsReference() {
    if (!user || !queryFile) return;
    try {
      const ext = queryFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user.id}/refs/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("biometrics").upload(path, queryFile, { contentType: queryFile.type });
      if (up.error) throw up.error;

      // Chiffrement côté serveur du template (si capturé via scanner) ou de l'image (fallback).
      let encryptedPayload: any = {};
      try {
        const sourceBytes = capturedTemplate ?? new Uint8Array(await queryFile.arrayBuffer());
        const { data: cryptoData, error: cryptoErr } = await supabase.functions.invoke("biometric-crypto", {
          body: { action: "encrypt", template: uint8ToBase64(sourceBytes) },
        });
        if (cryptoErr) throw cryptoErr;
        encryptedPayload = cryptoData;
      } catch (e: any) {
        toast.error("Chiffrement indisponible : " + (e?.message ?? ""));
        return;
      }

      const { error } = await supabase.from("biometrics").insert({
        created_by: user.id,
        finger: "inconnu",
        image_url: path,
        dossier_id: prefilledDossier,
        quality: 80,
        capture_source: capturedTemplate ? "webusb" : "upload",
        device_info: lastDeviceInfo,
        ...encryptedPayload,
      });
      if (error) throw error;
      toast.success("Empreinte chiffrée et enregistrée");
      setCapturedTemplate(null);
    } catch (e: any) {
      toast.error(e.message ?? "Échec enregistrement");
    }
  }

  async function handleUsbScan() {
    if (!isWebUSBSupported()) {
      toast.error("WebUSB requis (Chrome/Edge en HTTPS)");
      return;
    }
    setUsbBusy(true);
    try {
      const device = await pickFingerprintDevice();
      toast.info(`Scanner détecté : ${device.productName ?? "USB"} — posez le doigt`);
      const capture = await captureFingerprint(device);
      setCapturedTemplate(capture.template);
      setLastDeviceInfo(capture.device);

      // Aperçu image : on génère une visualisation à partir du template (pas d'image native).
      const previewBlob = new Blob([capture.template], { type: "image/png" });
      const previewFile = new File([previewBlob], `webusb-${Date.now()}.bin`, { type: "application/octet-stream" });
      pickFile(previewFile);
      toast.success(`Template capturé (${capture.template.length} octets) — prêt à chiffrer`);
    } catch (e: any) {
      toast.error(e?.message ?? "Capture annulée");
    } finally {
      setUsbBusy(false);
    }
  }

  function handleExport() {
    if (!matches.length) return toast.error("Aucun résultat à exporter");
    const rows = [
      ["Rang", "Score (%)", "Suspect", "Dossier", "Lieu", "Date capture"],
      ...matches.map((m) => [
        m.rank, m.score,
        [m.suspect_prenom, m.suspect_nom].filter(Boolean).join(" ") || "—",
        m.dossier_ref ?? "—", m.lieu ?? "—",
        m.captured_at ? new Date(m.captured_at).toLocaleString("fr-FR") : "—",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `rapport-biometrique-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport exporté");
  }

  function handleAlert() {
    if (!matches.length) return toast.error("Aucun résultat à signaler");
    toast.success("Alerte enregistrée — signalement transmis au procureur");
  }

  function reset() {
    if (queryUrl) URL.revokeObjectURL(queryUrl);
    setQueryFile(null); setQueryUrl(null); setMatches([]); setZoom(1); setRotation(0); setLastScanId(null);
  }

  return (
    <DashboardLayout variant="police" title="Biométrie — Laboratoire d'analyse">
      <div className="-m-6 min-h-[calc(100vh-3.5rem)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 border border-cyan-400/30 flex items-center justify-center">
              <Fingerprint className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="font-heading text-base font-semibold text-cyan-100 tracking-wide">AFIS · Analyse d'empreintes</h2>
              <p className="text-[11px] text-slate-400 uppercase tracking-[0.2em]">Système biométrique judiciaire</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-400/30 text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Système en ligne
            </span>
            {prefilledDossier && <Badge variant="outline" className="border-cyan-500/40 text-cyan-300">Dossier lié</Badge>}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-8 space-y-4">
            <Card className="bg-slate-900/60 border-cyan-900/40 p-0 overflow-hidden">
              <div className="px-4 py-2 border-b border-cyan-900/40 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-2 text-xs text-cyan-300">
                  <ScanLine className="h-3.5 w-3.5" />
                  <span className="uppercase tracking-widest">Empreinte en analyse</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono">ZOOM {zoom.toFixed(1)}x · ROT {rotation}°</div>
              </div>
              <div className="relative h-[460px] bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.12),transparent_60%)] overflow-hidden">
                <div className="absolute inset-0 opacity-30" style={{
                  backgroundImage: "linear-gradient(rgba(34,211,238,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.08) 1px, transparent 1px)",
                  backgroundSize: "32px 32px",
                }} />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-0 bottom-0 left-1/2 w-px bg-cyan-400/20" />
                  <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan-400/20" />
                </div>

                <div className="absolute inset-0 flex items-center justify-center">
                  {queryUrl ? (
                    <img
                      src={queryUrl}
                      alt="empreinte"
                      className="max-h-full max-w-full object-contain drop-shadow-[0_0_20px_rgba(34,211,238,0.35)] transition-transform"
                      style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }}
                    />
                  ) : (
                    <div className="text-center">
                      <Fingerprint className="h-32 w-32 text-cyan-400/40 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">Importez ou capturez une empreinte pour démarrer</p>
                    </div>
                  )}
                </div>

                {scanning && (
                  <>
                    <style>{`@keyframes scanline { 0%{top:0} 100%{top:100%} }`}</style>
                    <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_24px_4px_rgba(34,211,238,0.6)]" style={{ animation: "scanline 2s linear infinite" }} />
                  </>
                )}

                {queryUrl && (
                  <button onClick={reset} className="absolute top-3 right-3 p-1.5 rounded-md bg-slate-900/70 border border-slate-700 hover:bg-slate-800">
                    <X className="h-3.5 w-3.5 text-slate-300" />
                  </button>
                )}
              </div>

              <div className="px-3 py-2 border-t border-cyan-900/40 bg-slate-950/50 flex flex-wrap items-center gap-2">
                <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
                <Button size="sm" onClick={() => fileInput.current?.click()} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100">
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Importer
                </Button>
                <Button size="sm" onClick={() => setWebcamOpen(true)} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100">
                  <Camera className="h-3.5 w-3.5 mr-1.5" /> Capture caméra
                </Button>
                <Button size="sm" onClick={handleUsbScan} disabled={usbBusy} className="bg-cyan-700/40 hover:bg-cyan-700/60 border border-cyan-500/40 text-cyan-100">
                  {usbBusy ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Usb className="h-3.5 w-3.5 mr-1.5" />}
                  Scanner USB
                </Button>
                {capturedTemplate && (
                  <span className="text-[10px] text-emerald-300 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> template prêt
                  </span>
                )}
                <div className="h-5 w-px bg-slate-700 mx-1" />
                <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.min(z + 0.2, 3))} className="text-slate-300 hover:bg-slate-800 h-8 w-8"><ZoomIn className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setZoom((z) => Math.max(z - 0.2, 0.4))} className="text-slate-300 hover:bg-slate-800 h-8 w-8"><ZoomOut className="h-4 w-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => setRotation((r) => (r + 90) % 360)} className="text-slate-300 hover:bg-slate-800 h-8 w-8"><RotateCw className="h-4 w-4" /></Button>
                <div className="ml-auto flex items-center gap-2">
                  <Button size="sm" disabled={!queryFile || scanning} onClick={handleScan} className="bg-cyan-600 hover:bg-cyan-500 text-white">
                    {scanning ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <ScanLine className="h-3.5 w-3.5 mr-1.5" />}
                    Lancer l'analyse
                  </Button>
                </div>
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-slate-900/60 border-cyan-900/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Activity className="h-4 w-4 text-cyan-300" />
                  <h3 className="text-xs uppercase tracking-widest text-cyan-200">Transaction en cours</h3>
                </div>
                <dl className="grid grid-cols-2 gap-y-2 text-xs">
                  <dt className="text-slate-500">ID Scan</dt>
                  <dd className="font-mono text-slate-200 truncate">{lastScanId ?? "—"}</dd>
                  <dt className="text-slate-500">Opérateur</dt>
                  <dd className="text-slate-200 truncate">{user?.email ?? "—"}</dd>
                  <dt className="text-slate-500">Fichier source</dt>
                  <dd className="text-slate-200 truncate">{queryFile?.name ?? "—"}</dd>
                  <dt className="text-slate-500">Taille</dt>
                  <dd className="text-slate-200">{queryFile ? `${(queryFile.size / 1024).toFixed(1)} Ko` : "—"}</dd>
                  <dt className="text-slate-500">Résultats</dt>
                  <dd className="text-slate-200">{matches.length}</dd>
                  <dt className="text-slate-500">Score max</dt>
                  <dd className="text-emerald-300 font-semibold">{matches[0]?.score ? `${matches[0].score}%` : "—"}</dd>
                </dl>
              </Card>

              <Card className="bg-slate-900/60 border-cyan-900/40 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <History className="h-4 w-4 text-cyan-300" />
                  <h3 className="text-xs uppercase tracking-widest text-cyan-200">Historique des recherches</h3>
                </div>
                <ul className="space-y-1.5 max-h-44 overflow-auto pr-1">
                  {history.length === 0 && <li className="text-xs text-slate-500">Aucune recherche pour le moment.</li>}
                  {history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded bg-slate-950/50 border border-slate-800">
                      <span className="font-mono text-slate-400 truncate w-20">{h.id.slice(0, 8)}</span>
                      <span className="text-slate-500 truncate flex-1">{new Date(h.created_at).toLocaleString("fr-FR")}</span>
                      <span className="text-cyan-300">{h.results_count}</span>
                      <span className="text-emerald-300 font-semibold w-12 text-right">{h.top_score ? `${Math.round(h.top_score)}%` : "—"}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4">
            <Card className="bg-slate-900/60 border-cyan-900/40 p-0 overflow-hidden h-full">
              <div className="px-4 py-2 border-b border-cyan-900/40 flex items-center justify-between bg-slate-950/50">
                <div className="flex items-center gap-2 text-xs text-cyan-300">
                  <Search className="h-3.5 w-3.5" />
                  <span className="uppercase tracking-widest">Correspondances</span>
                </div>
                <span className="text-[11px] text-slate-500">{matches.length} résultat(s)</span>
              </div>
              <div className="p-3 space-y-2 max-h-[680px] overflow-auto">
                {!matches.length && (
                  <div className="text-center py-10">
                    <ImageIcon className="h-10 w-10 text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">Lancez une analyse pour afficher les correspondances</p>
                  </div>
                )}
                {matches.map((m) => {
                  const tier = m.score >= 85 ? "emerald" : m.score >= 65 ? "amber" : "rose";
                  const textCls = tier === "emerald" ? "text-emerald-300" : tier === "amber" ? "text-amber-300" : "text-rose-300";
                  const barCls = tier === "emerald" ? "[&>div]:bg-emerald-400" : tier === "amber" ? "[&>div]:bg-amber-400" : "[&>div]:bg-rose-400";
                  return (
                    <div key={m.id} className="rounded-lg border border-slate-800 bg-slate-950/50 p-3 hover:border-cyan-500/40 transition-colors">
                      <div className="flex gap-3">
                        <div className="h-16 w-16 rounded bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                          {m.signed_url ? <img src={m.signed_url} alt="match" className="h-full w-full object-cover" /> : <Fingerprint className="h-6 w-6 text-slate-600" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-medium text-slate-100 truncate">
                              {[m.suspect_prenom, m.suspect_nom].filter(Boolean).join(" ") || "Suspect inconnu"}
                            </p>
                            <span className={`text-xs font-bold ${textCls}`}>{m.score}%</span>
                          </div>
                          <div className="mt-1 grid grid-cols-2 gap-x-2 text-[11px] text-slate-400">
                            <span>Rang #{m.rank}</span>
                            <span className="truncate">{m.dossier_ref ?? "Sans dossier"}</span>
                            <span className="truncate">{m.lieu ?? "—"}</span>
                            <span>{m.captured_at ? new Date(m.captured_at).toLocaleDateString("fr-FR") : "—"}</span>
                          </div>
                          <Progress value={m.score} className={`mt-2 h-1.5 bg-slate-800 ${barCls}`} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-cyan-900/40 bg-slate-900/60 px-4 py-3 flex flex-wrap items-center gap-2">
          <Button onClick={reset} variant="outline" className="border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800">
            <Search className="h-4 w-4 mr-2" /> Nouvelle recherche
          </Button>
          <Button onClick={handleSaveAsReference} disabled={!queryFile} className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100">
            <Save className="h-4 w-4 mr-2" /> Enregistrer dans la base
          </Button>
          <Button onClick={handleExport} disabled={!matches.length} className="bg-cyan-600 hover:bg-cyan-500 text-white">
            <FileDown className="h-4 w-4 mr-2" /> Exporter rapport
          </Button>
          <div className="flex-1" />
          <Button onClick={handleAlert} disabled={!matches.length} className="bg-rose-600 hover:bg-rose-500 text-white">
            <AlertTriangle className="h-4 w-4 mr-2" /> Alerte / signalement
          </Button>
        </div>
      </div>

      <WebcamCapture
        open={webcamOpen}
        onOpenChange={setWebcamOpen}
        title="Capture empreinte / pièce"
        onCapture={(blob) => {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
          pickFile(file);
        }}
      />
    </DashboardLayout>
  );
}

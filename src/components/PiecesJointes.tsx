import { useEffect, useState } from "react";
import { Paperclip, Upload, FileIcon, ImageIcon, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PieceRow {
  id: string;
  nom: string;
  type: string | null;
  url: string;
  created_at: string;
  uploaded_by: string;
}

interface Props {
  dossierId: string;
}

const ACCEPTED = "application/pdf,image/png,image/jpeg,image/jpg,image/webp";
const MAX_SIZE_MB = 20;

export function PiecesJointes({ dossierId }: Props) {
  const { user } = useAuth();
  const [pieces, setPieces] = useState<PieceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("pieces_jointes")
      .select("*")
      .eq("dossier_id", dossierId)
      .order("created_at", { ascending: false });
    setPieces(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [dossierId]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user) return;

    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Fichier trop volumineux (max ${MAX_SIZE_MB} Mo)`);
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${dossierId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("dossier-files")
      .upload(path, file, { contentType: file.type });

    if (upErr) {
      toast.error("Échec de l'envoi : " + upErr.message);
      setUploading(false);
      return;
    }

    const { error: dbErr } = await supabase.from("pieces_jointes").insert({
      dossier_id: dossierId,
      nom: file.name,
      type: file.type,
      url: path,
      uploaded_by: user.id,
    });

    if (dbErr) {
      toast.error("Erreur enregistrement : " + dbErr.message);
      await supabase.storage.from("dossier-files").remove([path]);
      setUploading(false);
      return;
    }

    await supabase.from("activites").insert({
      dossier_id: dossierId,
      user_id: user.id,
      action: "Pièce ajoutée",
      details: file.name,
    });

    toast.success("Pièce jointe ajoutée");
    setUploading(false);
    load();
  };

  const handleOpen = async (piece: PieceRow) => {
    const { data, error } = await supabase.storage
      .from("dossier-files")
      .createSignedUrl(piece.url, 60 * 5);
    if (error || !data) {
      toast.error("Impossible d'ouvrir le fichier");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const handleDownload = async (e: React.MouseEvent, piece: PieceRow) => {
    e.stopPropagation();
    const { data, error } = await supabase.storage
      .from("dossier-files")
      .createSignedUrl(piece.url, 60 * 5, { download: piece.nom });
    if (error || !data) {
      toast.error("Impossible de télécharger le fichier");
      return;
    }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = piece.nom;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="stat-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
          <Paperclip className="h-4 w-4 text-primary" />
          Pièces jointes {pieces.length > 0 && <span className="text-muted-foreground">({pieces.length})</span>}
        </h3>
        <label>
          <input
            type="file"
            accept={ACCEPTED}
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button asChild size="sm" variant="outline" disabled={uploading}>
            <span className="cursor-pointer">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Ajouter
            </span>
          </Button>
        </label>
      </div>

      {loading && <p className="text-xs text-muted-foreground">Chargement...</p>}

      {!loading && pieces.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Aucune pièce jointe. Formats acceptés : PDF, PNG, JPG, WEBP (max {MAX_SIZE_MB} Mo).
        </p>
      )}

      <div className="space-y-2">
        {pieces.map((p) => {
          const isImage = (p.type ?? "").startsWith("image/");
          return (
            <button
              key={p.id}
              onClick={() => handleOpen(p)}
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-muted/50 transition-colors text-left group"
            >
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                {isImage ? <ImageIcon className="h-4 w-4" /> : <FileIcon className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {p.nom}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString("fr-FR")} · {p.type ?? "fichier"}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => handleDownload(e, p)}
                className="gap-1.5"
                title="Télécharger"
              >
                <Download className="h-4 w-4" />
                Télécharger
              </Button>
            </button>
          );
        })}
      </div>
    </div>
  );
}

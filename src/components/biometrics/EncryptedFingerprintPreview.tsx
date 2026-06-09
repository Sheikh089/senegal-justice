import { useEffect, useState } from "react";
import { Lock, Fingerprint } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface Props {
  hash?: string | null;
  imagePath?: string | null;
  encrypted?: boolean;
  className?: string;
}

/**
 * Affiche une empreinte enregistrée. Si l'utilisateur n'est PAS police/admin,
 * l'image est floutée et un badge "Accès restreint" est affiché.
 * Le hash SHA-256 du template est utilisé comme empreinte visuelle (8 derniers caractères).
 */
export function EncryptedFingerprintPreview({ hash, imagePath, encrypted, className }: Props) {
  const { role } = useAuth();
  const authorized = role === "police" || role === "admin";
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!imagePath) return;
    supabase.storage
      .from("biometrics")
      .createSignedUrl(imagePath, 600)
      .then(({ data }) => { if (active) setSignedUrl(data?.signedUrl ?? null); });
    return () => { active = false; };
  }, [imagePath]);

  return (
    <div className={cn("relative rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden", className)}>
      <div className="aspect-square flex items-center justify-center bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.10),transparent_60%)]">
        {signedUrl ? (
          <img
            src={signedUrl}
            alt="empreinte"
            className={cn("w-full h-full object-cover transition", !authorized && "blur-xl scale-110")}
            draggable={false}
          />
        ) : (
          <Fingerprint className={cn("h-16 w-16 text-cyan-400/40", !authorized && "blur-sm")} />
        )}
      </div>

      {!authorized && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/40 backdrop-blur-[2px]">
          <Badge variant="outline" className="border-rose-500/50 bg-rose-500/10 text-rose-200">
            <Lock className="h-3 w-3 mr-1" /> Accès restreint
          </Badge>
          {hash && (
            <code className="text-[10px] font-mono text-slate-400 tracking-widest">
              •••• {hash.slice(-8)}
            </code>
          )}
        </div>
      )}

      {authorized && encrypted && (
        <div className="absolute top-2 right-2">
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-200 text-[10px]">
            <Lock className="h-2.5 w-2.5 mr-1" /> Chiffré
          </Badge>
        </div>
      )}
    </div>
  );
}

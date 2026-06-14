import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DossierChat } from "@/components/DossierChat";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { DossierRow } from "@/lib/dossier-helpers";

interface Props {
  variant: "police" | "tribunal";
}

export default function DossierChatPage({ variant }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [dossier, setDossier] = useState<DossierRow | null>(null);
  const [peerName, setPeerName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data: d } = await supabase.from("dossiers").select("*").eq("id", id).maybeSingle();
      setDossier(d);
      const peerId = variant === "police" ? d?.assigned_to : d?.created_by;
      if (peerId) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", peerId)
          .maybeSingle();
        setPeerName(
          p?.full_name ?? (variant === "police" ? "Procureur (non assigné)" : "Officier de police")
        );
      } else {
        setPeerName(variant === "police" ? "Procureur (non assigné)" : "Officier de police");
      }
      setLoading(false);
    })();
  }, [id, variant]);

  const backTo =
    variant === "police" ? `/police/dossiers/${id}` : `/tribunal/dossiers/${id}`;

  return (
    <DashboardLayout variant={variant} title="Communication">
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(backTo)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Retour au dossier
        </Button>

        {loading && <p className="text-sm text-muted-foreground">Chargement...</p>}
        {!loading && !dossier && (
          <p className="text-sm text-muted-foreground">Dossier introuvable.</p>
        )}

        {dossier && (
          <>
            <div className="stat-card">
              <p className="text-xs font-mono text-muted-foreground mb-1">{dossier.reference}</p>
              <h2 className="font-heading text-lg font-semibold text-foreground">{dossier.titre}</h2>
            </div>
            <DossierChat
              dossierId={dossier.id}
              peerId={variant === "police" ? dossier.assigned_to ?? null : dossier.created_by ?? null}
              peerName={peerName}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
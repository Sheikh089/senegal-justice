import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { DossierCard } from "@/components/DossierCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DossierRow } from "@/lib/dossier-helpers";
import { FolderOpen, Send, Clock, AlertTriangle, FileText } from "lucide-react";

interface Activite {
  id: string;
  action: string;
  details: string | null;
  created_at: string;
}

export default function PoliceDashboard() {
  const { user } = useAuth();
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [activites, setActivites] = useState<Activite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: d }, { data: a }] = await Promise.all([
        supabase
          .from("dossiers")
          .select("*")
          .eq("created_by", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("activites")
          .select("id, action, details, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      setDossiers(d ?? []);
      setActivites(a ?? []);
      setLoading(false);
    };
    load();
  }, [user]);

  const actifs = dossiers.filter((d) => ["nouveau", "en_cours"].includes(d.status));
  const transmis = dossiers.filter((d) => d.status === "transmis");
  const enAttente = dossiers.filter((d) => d.status === "nouveau");
  const haute = dossiers.filter((d) => d.priority === "haute");

  return (
    <DashboardLayout variant="police" title="Tableau de bord">
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Dossiers actifs" value={actifs.length} icon={FolderOpen} />
          <StatCard label="Transmis" value={transmis.length} icon={Send} accent />
          <StatCard label="En attente" value={enAttente.length} icon={Clock} />
          <StatCard label="Priorité haute" value={haute.length} icon={AlertTriangle} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-heading font-semibold text-foreground text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Dossiers récents
            </h2>
            <div className="space-y-3">
              {loading && <p className="text-xs text-muted-foreground">Chargement...</p>}
              {!loading && dossiers.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun dossier pour l'instant.</p>
              )}
              {dossiers.slice(0, 5).map((d) => (
                <DossierCard key={d.id} dossier={d} variant="police" />
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-foreground text-sm">Activité récente</h2>
            <div className="stat-card space-y-4">
              {activites.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucune activité.</p>
              )}
              {activites.map((a) => (
                <div key={a.id} className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <p className="text-xs text-foreground">{a.action}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleString("fr-FR")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

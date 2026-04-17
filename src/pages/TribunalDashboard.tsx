import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { DossierCard } from "@/components/DossierCard";
import { supabase } from "@/integrations/supabase/client";
import type { DossierRow } from "@/lib/dossier-helpers";
import { FolderOpen, Gavel, CalendarDays, Users, Clock, FileText } from "lucide-react";

interface AudienceRow {
  id: string;
  date_audience: string;
  salle: string | null;
  dossier_id: string;
  dossiers?: { reference: string; titre: string; type_infraction: string | null } | null;
}

export default function TribunalDashboard() {
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [audiences, setAudiences] = useState<AudienceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const [{ data: d }, { data: a }] = await Promise.all([
        supabase
          .from("dossiers")
          .select("*")
          .in("status", ["transmis", "audience_programmee", "juge"])
          .order("created_at", { ascending: false }),
        supabase
          .from("audiences")
          .select("id, date_audience, salle, dossier_id, dossiers(reference, titre, type_infraction)")
          .order("date_audience", { ascending: true })
          .limit(5),
      ]);
      setDossiers(d ?? []);
      setAudiences((a as AudienceRow[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const recus = dossiers.filter((d) => d.status === "transmis");
  const enAttente = dossiers.filter((d) => d.status === "transmis" && !d.assigned_to);
  const planifiees = dossiers.filter((d) => d.status === "audience_programmee");
  const juges = dossiers.filter((d) => d.status === "juge");

  return (
    <DashboardLayout variant="tribunal" title="Tableau de bord">
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Dossiers reçus" value={recus.length} icon={FolderOpen} />
          <StatCard label="En attente d'attribution" value={enAttente.length} icon={Users} />
          <StatCard label="Audiences planifiées" value={planifiees.length} icon={CalendarDays} accent />
          <StatCard label="Dossiers jugés" value={juges.length} icon={Gavel} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-heading font-semibold text-foreground text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Dossiers en cours
            </h2>
            <div className="space-y-3">
              {loading && <p className="text-xs text-muted-foreground">Chargement...</p>}
              {!loading && dossiers.length === 0 && (
                <p className="text-xs text-muted-foreground">Aucun dossier reçu.</p>
              )}
              {dossiers.slice(0, 5).map((d) => (
                <DossierCard key={d.id} dossier={d} variant="tribunal" />
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <h2 className="font-heading font-semibold text-foreground text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Prochaines audiences
              </h2>
              <div className="stat-card space-y-3">
                {audiences.length === 0 && (
                  <p className="text-xs text-muted-foreground">Aucune audience programmée.</p>
                )}
                {audiences.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        {a.dossiers?.reference ?? "—"}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{a.salle ?? "Salle à définir"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-primary">
                        {new Date(a.date_audience).toLocaleDateString("fr-FR")}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {a.dossiers?.type_infraction ?? ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="font-heading font-semibold text-foreground text-sm">
                <Clock className="inline h-4 w-4 text-muted-foreground mr-1" />
                Activité récente
              </h2>
              <div className="stat-card">
                <p className="text-xs text-muted-foreground">À venir.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

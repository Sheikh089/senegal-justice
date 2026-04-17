import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { CalendarDays, Scale, Clock, MapPin } from "lucide-react";

interface AudienceRow {
  id: string;
  date_audience: string;
  salle: string | null;
  status: string;
  dossiers?: {
    reference: string;
    titre: string;
    type_infraction: string | null;
  } | null;
}

export default function TribunalAudiences() {
  const [audiences, setAudiences] = useState<AudienceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("audiences")
      .select("id, date_audience, salle, status, dossiers(reference, titre, type_infraction)")
      .order("date_audience", { ascending: true })
      .then(({ data }) => {
        setAudiences((data as AudienceRow[]) ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout variant="tribunal" title="Audiences">
      <div className="space-y-4 animate-fade-in">
        <div className="grid gap-4">
          {loading && <p className="text-xs text-muted-foreground">Chargement...</p>}
          {!loading && audiences.length === 0 && (
            <div className="stat-card text-center py-12">
              <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune audience planifiée</p>
            </div>
          )}
          {audiences.map((a) => {
            const date = new Date(a.date_audience);
            return (
              <div key={a.id} className="stat-card">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/15">
                      <CalendarDays className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold text-sm text-foreground">
                        {a.dossiers?.titre ?? "Dossier"}
                      </h3>
                      <p className="text-xs text-muted-foreground font-mono">
                        {a.dossiers?.reference ?? "—"}
                      </p>
                    </div>
                  </div>
                  <span className="badge-status bg-accent/15 text-accent-foreground">{a.status}</span>
                </div>

                <div className="grid sm:grid-cols-3 gap-4 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    <span>
                      <strong className="text-foreground">
                        {date.toLocaleDateString("fr-FR")}
                      </strong>{" "}
                      ·{" "}
                      {date.toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    <span>{a.salle ?? "Salle à définir"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Scale className="h-3.5 w-3.5" />
                    <span>{a.dossiers?.type_infraction ?? ""}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}

import { DashboardLayout } from "@/components/DashboardLayout";
import { mockDossiers } from "@/lib/mock-data";
import { CalendarDays, Scale, Clock, MapPin } from "lucide-react";
import { StatusBadge } from "@/components/StatusBadge";

const audiences = mockDossiers.filter(d => d.dateAudience);

export default function TribunalAudiences() {
  return (
    <DashboardLayout variant="tribunal" title="Audiences">
      <div className="space-y-4 animate-fade-in">
        <div className="grid gap-4">
          {audiences.map(d => (
            <div key={d.id} className="stat-card">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-accent/15">
                    <CalendarDays className="h-5 w-5 text-accent-foreground" />
                  </div>
                  <div>
                    <h3 className="font-heading font-semibold text-sm text-foreground">{d.titre}</h3>
                    <p className="text-xs text-muted-foreground font-mono">{d.numero}</p>
                  </div>
                </div>
                <StatusBadge statut={d.statut} />
              </div>

              <div className="grid sm:grid-cols-4 gap-4 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span><strong className="text-foreground">{d.dateAudience}</strong> · 09:00</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Scale className="h-3.5 w-3.5" />
                  <span>{d.jugeAssigne}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5" />
                  <span>Salle A-12</span>
                </div>
                <div className="text-right">
                  <span className="text-foreground font-medium">{d.typeInfraction}</span>
                </div>
              </div>
            </div>
          ))}

          {audiences.length === 0 && (
            <div className="stat-card text-center py-12">
              <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Aucune audience planifiée</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

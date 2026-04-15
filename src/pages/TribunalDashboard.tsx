import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { DossierCard } from "@/components/DossierCard";
import { mockDossiers, mockActivites } from "@/lib/mock-data";
import { FolderOpen, Gavel, CalendarDays, Users, Clock, FileText } from "lucide-react";

const tribunalDossiers = mockDossiers.filter(d =>
  ["transmis", "recu", "attribue", "audience_planifiee", "juge"].includes(d.statut)
);

const upcomingAudiences = mockDossiers.filter(d => d.dateAudience);

const recentActivites = mockActivites
  .filter(a => ["juge", "procureur", "greffier"].includes(a.role))
  .slice(0, 5);

export default function TribunalDashboard() {
  return (
    <DashboardLayout variant="tribunal" title="Tableau de bord">
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Dossiers reçus" value={4} icon={FolderOpen} />
          <StatCard label="En attente d'attribution" value={1} icon={Users} />
          <StatCard label="Audiences planifiées" value={1} icon={CalendarDays} accent />
          <StatCard label="Dossiers jugés" value={1} icon={Gavel} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Dossiers */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-heading font-semibold text-foreground text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Dossiers en cours
            </h2>
            <div className="space-y-3">
              {tribunalDossiers.map(d => (
                <DossierCard key={d.id} dossier={d} variant="tribunal" />
              ))}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-6">
            {/* Upcoming hearings */}
            <div className="space-y-3">
              <h2 className="font-heading font-semibold text-foreground text-sm flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                Prochaines audiences
              </h2>
              <div className="stat-card space-y-3">
                {upcomingAudiences.map(d => (
                  <div key={d.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-xs font-medium text-foreground">{d.numero}</p>
                      <p className="text-[10px] text-muted-foreground">{d.jugeAssigne}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono text-primary">{d.dateAudience}</p>
                      <p className="text-[10px] text-muted-foreground">{d.typeInfraction}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="space-y-3">
              <h2 className="font-heading font-semibold text-foreground text-sm">
                <Clock className="inline h-4 w-4 text-muted-foreground mr-1" />
                Activité récente
              </h2>
              <div className="stat-card space-y-4">
                {recentActivites.map(a => (
                  <div key={a.id} className="flex gap-3">
                    <div className="h-2 w-2 rounded-full bg-accent mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-foreground">{a.action}</p>
                      <p className="text-[10px] text-muted-foreground">{a.auteur} · {a.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { DossierCard } from "@/components/DossierCard";
import { mockDossiers, mockActivites } from "@/lib/mock-data";
import { FolderOpen, Send, Clock, AlertTriangle, FileText } from "lucide-react";

const policeDossiers = mockDossiers.filter(d =>
  ["nouveau", "en_cours", "transmis"].includes(d.statut)
);

const recentActivites = mockActivites
  .filter(a => a.role === "police")
  .slice(0, 5);

export default function PoliceDashboard() {
  return (
    <DashboardLayout variant="police" title="Tableau de bord">
      <div className="space-y-6 animate-fade-in">
        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Dossiers actifs" value={3} icon={FolderOpen} />
          <StatCard label="Transmis" value={1} icon={Send} accent />
          <StatCard label="En attente" value={2} icon={Clock} />
          <StatCard label="Priorité haute" value={2} icon={AlertTriangle} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Dossiers */}
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-heading font-semibold text-foreground text-sm flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Dossiers récents
            </h2>
            <div className="space-y-3">
              {policeDossiers.map(d => (
                <DossierCard key={d.id} dossier={d} variant="police" />
              ))}
            </div>
          </div>

          {/* Activity feed */}
          <div className="space-y-3">
            <h2 className="font-heading font-semibold text-foreground text-sm">
              Activité récente
            </h2>
            <div className="stat-card space-y-4">
              {recentActivites.map(a => (
                <div key={a.id} className="flex gap-3">
                  <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
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
    </DashboardLayout>
  );
}

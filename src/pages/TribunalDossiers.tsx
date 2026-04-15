import { DashboardLayout } from "@/components/DashboardLayout";
import { DossierCard } from "@/components/DossierCard";
import { mockDossiers } from "@/lib/mock-data";
import { Search, Filter } from "lucide-react";
import { useState } from "react";

export default function TribunalDossiers() {
  const [search, setSearch] = useState("");
  const dossiers = mockDossiers
    .filter(d => ["transmis", "recu", "attribue", "audience_planifiee", "juge"].includes(d.statut))
    .filter(d =>
      d.titre.toLowerCase().includes(search.toLowerCase()) ||
      d.numero.toLowerCase().includes(search.toLowerCase())
    );

  return (
    <DashboardLayout variant="tribunal" title="Dossiers reçus">
      <div className="space-y-4 animate-fade-in">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher un dossier..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <button className="px-4 py-2.5 rounded-lg border border-input bg-card text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" /> Filtrer
          </button>
        </div>
        <div className="space-y-3">
          {dossiers.map(d => (
            <DossierCard key={d.id} dossier={d} variant="tribunal" />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

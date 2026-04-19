import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { DossierCard } from "@/components/DossierCard";
import { supabase } from "@/integrations/supabase/client";
import type { DossierRow } from "@/lib/dossier-helpers";
import { enrichDossiersWithAssignee } from "@/lib/dossier-assignee";
import { Search, Filter } from "lucide-react";

type EnrichedDossier = DossierRow & { assigned_name?: string | null; assigned_role?: string | null };

export default function TribunalDossiers() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dossiers, setDossiers] = useState<EnrichedDossier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("dossiers")
      .select("*")
      .in("status", ["transmis", "audience_programmee", "juge", "classe"])
      .order("created_at", { ascending: false })
      .then(async ({ data }) => {
        const enriched = await enrichDossiersWithAssignee(data ?? []);
        setDossiers(enriched);
        setLoading(false);
      });
  }, []);

  const filtered = dossiers.filter(
    (d) =>
      d.titre.toLowerCase().includes(search.toLowerCase()) ||
      d.reference.toLowerCase().includes(search.toLowerCase())
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
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>
          <button className="px-4 py-2.5 rounded-lg border border-input bg-card text-muted-foreground hover:bg-muted transition-colors flex items-center gap-2 text-sm">
            <Filter className="h-4 w-4" /> Filtrer
          </button>
        </div>
        <div className="space-y-3">
          {loading && <p className="text-xs text-muted-foreground">Chargement...</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucun dossier trouvé.</p>
          )}
          {filtered.map((d) => (
            <DossierCard
              key={d.id}
              dossier={d}
              variant="tribunal"
              onClick={() => navigate(`/tribunal/dossiers/${d.id}`)}
            />
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

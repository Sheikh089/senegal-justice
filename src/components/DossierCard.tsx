import { FileText, Paperclip, Calendar, MapPin, UserCheck } from "lucide-react";
import { StatusBadge, PrioriteBadge } from "./StatusBadge";
import type { DossierRow } from "@/lib/dossier-helpers";

interface DossierCardProps {
  dossier: DossierRow & { pieces_count?: number; assigned_name?: string | null; assigned_role?: string | null };
  onClick?: () => void;
  variant?: "police" | "tribunal";
}

export function DossierCard({ dossier, onClick }: DossierCardProps) {
  return (
    <button
      onClick={onClick}
      className="stat-card w-full text-left group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">{dossier.reference}</span>
        </div>
        <div className="flex gap-1.5">
          <PrioriteBadge priorite={dossier.priority ?? "normale"} />
          <StatusBadge statut={dossier.status} />
        </div>
      </div>

      <h3 className="font-heading font-semibold text-sm text-foreground mb-2 group-hover:text-primary transition-colors">
        {dossier.titre}
      </h3>

      {dossier.description && (
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{dossier.description}</p>
      )}

      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {dossier.type_infraction && (
          <span className="flex items-center gap-1">
            <Paperclip className="h-3 w-3" />
            {dossier.type_infraction}
          </span>
        )}
        {dossier.lieu && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {dossier.lieu}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(dossier.created_at).toLocaleDateString("fr-FR")}
        </span>
        {dossier.assigned_name && (
          <span className="flex items-center gap-1 text-primary">
            <UserCheck className="h-3 w-3" />
            {dossier.assigned_name}
            {dossier.assigned_role && (
              <span className="text-muted-foreground"> ({dossier.assigned_role})</span>
            )}
          </span>
        )}
      </div>
    </button>
  );
}

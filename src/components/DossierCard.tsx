import { FileText, Paperclip, Calendar, User } from "lucide-react";
import { StatusBadge, PrioriteBadge } from "./StatusBadge";
import type { Dossier } from "@/lib/mock-data";

interface DossierCardProps {
  dossier: Dossier;
  onClick?: () => void;
  variant?: "police" | "tribunal";
}

export function DossierCard({ dossier, onClick, variant = "police" }: DossierCardProps) {
  return (
    <button
      onClick={onClick}
      className="stat-card w-full text-left group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-mono text-muted-foreground">{dossier.numero}</span>
        </div>
        <div className="flex gap-1.5">
          <PrioriteBadge priorite={dossier.priorite} />
          <StatusBadge statut={dossier.statut} />
        </div>
      </div>

      <h3 className="font-heading font-semibold text-sm text-foreground mb-2 group-hover:text-primary transition-colors">
        {dossier.titre}
      </h3>

      <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{dossier.description}</p>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <User className="h-3 w-3" />
          {variant === "police" ? dossier.officier : dossier.jugeAssigne || "Non attribué"}
        </span>
        <span className="flex items-center gap-1">
          <Paperclip className="h-3 w-3" />
          {dossier.piecesJointes}
        </span>
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {dossier.dateCreation}
        </span>
      </div>
    </button>
  );
}

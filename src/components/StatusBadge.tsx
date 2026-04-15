import { statutLabels, statutColors, prioriteColors, type DossierStatus } from "@/lib/mock-data";

export function StatusBadge({ statut }: { statut: DossierStatus }) {
  return (
    <span className={`badge-status ${statutColors[statut]}`}>
      {statutLabels[statut]}
    </span>
  );
}

export function PrioriteBadge({ priorite }: { priorite: "haute" | "moyenne" | "basse" }) {
  return (
    <span className={`badge-status ${prioriteColors[priorite]}`}>
      {priorite.charAt(0).toUpperCase() + priorite.slice(1)}
    </span>
  );
}

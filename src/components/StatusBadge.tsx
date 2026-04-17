import {
  statutLabels,
  statutColors,
  prioriteColors,
  prioriteLabels,
  type DossierStatus,
} from "@/lib/dossier-helpers";

export function StatusBadge({ statut }: { statut: DossierStatus }) {
  return (
    <span className={`badge-status ${statutColors[statut]}`}>
      {statutLabels[statut]}
    </span>
  );
}

export function PrioriteBadge({ priorite }: { priorite: string }) {
  const key = priorite || "normale";
  return (
    <span className={`badge-status ${prioriteColors[key] ?? prioriteColors.normale}`}>
      {prioriteLabels[key] ?? key}
    </span>
  );
}

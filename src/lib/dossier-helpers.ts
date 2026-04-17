import type { Database } from "@/integrations/supabase/types";

export type DossierRow = Database["public"]["Tables"]["dossiers"]["Row"];
export type DossierStatus = Database["public"]["Enums"]["dossier_status"];
export type Priority = "haute" | "normale" | "basse";

export const statutLabels: Record<DossierStatus, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  transmis: "Transmis",
  audience_programmee: "Audience programmée",
  juge: "Jugé",
  classe: "Classé",
  archive: "Archivé",
};

export const statutColors: Record<DossierStatus, string> = {
  nouveau: "bg-info/15 text-info",
  en_cours: "bg-warning/15 text-warning",
  transmis: "bg-accent/15 text-accent-foreground",
  audience_programmee: "bg-success/15 text-success",
  juge: "bg-success/20 text-success",
  classe: "bg-muted text-muted-foreground",
  archive: "bg-muted text-muted-foreground",
};

export const prioriteColors: Record<string, string> = {
  haute: "bg-destructive/15 text-destructive",
  normale: "bg-warning/15 text-warning",
  basse: "bg-muted text-muted-foreground",
};

export const prioriteLabels: Record<string, string> = {
  haute: "Haute",
  normale: "Normale",
  basse: "Basse",
};

export function generateReference() {
  const year = new Date().getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `JL-${year}-${rand}`;
}

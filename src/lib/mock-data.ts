export type DossierStatus = 
  | "nouveau" 
  | "en_cours" 
  | "transmis" 
  | "recu" 
  | "attribue" 
  | "audience_planifiee" 
  | "juge" 
  | "classe";

export type UserRole = "police" | "juge" | "procureur" | "greffier";

export interface Dossier {
  id: string;
  numero: string;
  titre: string;
  typeInfraction: string;
  statut: DossierStatus;
  dateCreation: string;
  dateTransmission?: string;
  plaignant: string;
  suspect: string;
  officier: string;
  jugeAssigne?: string;
  dateAudience?: string;
  piecesJointes: number;
  description: string;
  priorite: "haute" | "moyenne" | "basse";
}

export interface Activite {
  id: string;
  dossierId: string;
  action: string;
  auteur: string;
  role: UserRole;
  date: string;
}

export const mockDossiers: Dossier[] = [
  {
    id: "1",
    numero: "JL-2026-00142",
    titre: "Vol à main armée — Quartier Matonge",
    typeInfraction: "Vol aggravé",
    statut: "transmis",
    dateCreation: "2026-04-10",
    dateTransmission: "2026-04-11",
    plaignant: "Jean-Pierre Mukendi",
    suspect: "Inconnu",
    officier: "Cpt. Sarah Kabila",
    piecesJointes: 4,
    description: "Vol à main armée dans une boutique du quartier Matonge. Deux individus masqués ont menacé le commerçant avec une arme blanche.",
    priorite: "haute",
  },
  {
    id: "2",
    numero: "JL-2026-00143",
    titre: "Escroquerie — Faux documents bancaires",
    typeInfraction: "Escroquerie",
    statut: "attribue",
    dateCreation: "2026-04-08",
    dateTransmission: "2026-04-09",
    plaignant: "Marie Tshilombo",
    suspect: "Patrick Mwamba",
    officier: "Lt. David Kasongo",
    jugeAssigne: "Juge Honoré Lukusa",
    piecesJointes: 7,
    description: "Utilisation de faux documents bancaires pour détourner des fonds. Montant estimé : 15 000 USD.",
    priorite: "haute",
  },
  {
    id: "3",
    numero: "JL-2026-00144",
    titre: "Coups et blessures volontaires",
    typeInfraction: "Violence physique",
    statut: "en_cours",
    dateCreation: "2026-04-12",
    plaignant: "Albert Nzuzi",
    suspect: "François Kabongo",
    officier: "Cpt. Sarah Kabila",
    piecesJointes: 2,
    description: "Altercation dans un bar ayant entraîné des blessures nécessitant 21 jours d'ITT.",
    priorite: "moyenne",
  },
  {
    id: "4",
    numero: "JL-2026-00145",
    titre: "Abus de confiance — Entreprise SARL",
    typeInfraction: "Abus de confiance",
    statut: "audience_planifiee",
    dateCreation: "2026-04-05",
    dateTransmission: "2026-04-06",
    plaignant: "Société MKG SARL",
    suspect: "Claude Ilunga",
    officier: "Lt. David Kasongo",
    jugeAssigne: "Juge Marie Kalala",
    dateAudience: "2026-04-22",
    piecesJointes: 12,
    description: "Détournement de fonds de la société par un employé de confiance. Montant : 42 000 USD.",
    priorite: "haute",
  },
  {
    id: "5",
    numero: "JL-2026-00146",
    titre: "Trouble à l'ordre public",
    typeInfraction: "Trouble public",
    statut: "nouveau",
    dateCreation: "2026-04-14",
    plaignant: "Commissariat central",
    suspect: "Groupe non identifié",
    officier: "Cpt. Sarah Kabila",
    piecesJointes: 1,
    description: "Manifestation non autorisée ayant dégénéré. Dégâts matériels constatés sur la voie publique.",
    priorite: "basse",
  },
  {
    id: "6",
    numero: "JL-2026-00147",
    titre: "Faux et usage de faux",
    typeInfraction: "Faux",
    statut: "juge",
    dateCreation: "2026-03-20",
    dateTransmission: "2026-03-22",
    plaignant: "Administration fiscale",
    suspect: "Robert Mbuyi",
    officier: "Lt. David Kasongo",
    jugeAssigne: "Juge Honoré Lukusa",
    dateAudience: "2026-04-10",
    piecesJointes: 9,
    description: "Falsification de documents fiscaux. Condamné à 18 mois avec sursis.",
    priorite: "moyenne",
  },
];

export const mockActivites: Activite[] = [
  { id: "1", dossierId: "1", action: "Dossier créé et enregistré", auteur: "Cpt. Sarah Kabila", role: "police", date: "2026-04-10 09:15" },
  { id: "2", dossierId: "1", action: "4 pièces jointes ajoutées", auteur: "Cpt. Sarah Kabila", role: "police", date: "2026-04-10 10:30" },
  { id: "3", dossierId: "1", action: "Dossier transmis au tribunal", auteur: "Cpt. Sarah Kabila", role: "police", date: "2026-04-11 08:00" },
  { id: "4", dossierId: "2", action: "Dossier réceptionné par le greffe", auteur: "Greffier Mwangi", role: "greffier", date: "2026-04-09 14:00" },
  { id: "5", dossierId: "2", action: "Attribué au Juge Honoré Lukusa", auteur: "Procureur Bemba", role: "procureur", date: "2026-04-10 09:00" },
  { id: "6", dossierId: "4", action: "Audience planifiée pour le 22/04/2026", auteur: "Juge Marie Kalala", role: "juge", date: "2026-04-12 11:00" },
  { id: "7", dossierId: "5", action: "Nouveau dossier enregistré", auteur: "Cpt. Sarah Kabila", role: "police", date: "2026-04-14 16:45" },
];

export const statutLabels: Record<DossierStatus, string> = {
  nouveau: "Nouveau",
  en_cours: "En cours",
  transmis: "Transmis",
  recu: "Reçu",
  attribue: "Attribué",
  audience_planifiee: "Audience planifiée",
  juge: "Jugé",
  classe: "Classé",
};

export const statutColors: Record<DossierStatus, string> = {
  nouveau: "bg-info/15 text-info",
  en_cours: "bg-warning/15 text-warning",
  transmis: "bg-accent/15 text-accent-foreground",
  recu: "bg-info/15 text-info",
  attribue: "bg-primary/15 text-primary",
  audience_planifiee: "bg-success/15 text-success",
  juge: "bg-success/20 text-success",
  classe: "bg-muted text-muted-foreground",
};

export const prioriteColors: Record<string, string> = {
  haute: "bg-destructive/15 text-destructive",
  moyenne: "bg-warning/15 text-warning",
  basse: "bg-muted text-muted-foreground",
};

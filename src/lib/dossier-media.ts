import { supabase } from "@/integrations/supabase/client";

export type BiometricKey =
  | "mis_en_cause_photo_face"
  | "mis_en_cause_photo_gauche"
  | "mis_en_cause_photo_droite"
  | "mis_en_cause_empreinte_gauche"
  | "mis_en_cause_empreinte_droite";

export const BIOMETRIC_LABELS: Record<BiometricKey, string> = {
  mis_en_cause_photo_face: "Photo de face",
  mis_en_cause_photo_gauche: "Profil gauche",
  mis_en_cause_photo_droite: "Profil droit",
  mis_en_cause_empreinte_gauche: "Empreintes main gauche",
  mis_en_cause_empreinte_droite: "Empreintes main droite",
};

const BUCKET = "dossier-files";
const ONE_HOUR = 60 * 60;

/**
 * Génère une URL signée temporaire pour un chemin de fichier
 * stocké dans le bucket `dossier-files`.
 */
export async function getSignedUrl(
  path: string | null | undefined,
  expiresIn = ONE_HOUR
): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data) return null;
  return data.signedUrl;
}

/**
 * Récupère toutes les URLs signées pour les pièces biométriques
 * d'un dossier (photos + empreintes).
 */
export async function getDossierMediaUrls(dossier: {
  mis_en_cause_photo_face?: string | null;
  mis_en_cause_photo_gauche?: string | null;
  mis_en_cause_photo_droite?: string | null;
  mis_en_cause_empreinte_gauche?: string | null;
  mis_en_cause_empreinte_droite?: string | null;
}): Promise<Partial<Record<BiometricKey, string>>> {
  const keys: BiometricKey[] = [
    "mis_en_cause_photo_face",
    "mis_en_cause_photo_gauche",
    "mis_en_cause_photo_droite",
    "mis_en_cause_empreinte_gauche",
    "mis_en_cause_empreinte_droite",
  ];
  const entries = await Promise.all(
    keys.map(async (k) => [k, await getSignedUrl(dossier[k])] as const)
  );
  const out: Partial<Record<BiometricKey, string>> = {};
  for (const [k, url] of entries) if (url) out[k] = url;
  return out;
}

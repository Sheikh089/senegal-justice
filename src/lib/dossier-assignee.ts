import { supabase } from "@/integrations/supabase/client";
import type { DossierRow } from "./dossier-helpers";

export async function enrichDossiersWithAssignee(dossiers: DossierRow[]) {
  const ids = Array.from(new Set(dossiers.map((d) => d.assigned_to).filter(Boolean))) as string[];
  if (ids.length === 0) return dossiers.map((d) => ({ ...d, assigned_name: null, assigned_role: null }));

  const [{ data: profiles }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("user_id, full_name").in("user_id", ids),
    supabase.from("user_roles").select("user_id, role").in("user_id", ids),
  ]);

  const nameMap = new Map((profiles ?? []).map((p) => [p.user_id, p.full_name]));
  const roleMap = new Map<string, string>();
  (roles ?? []).forEach((r) => {
    if (r.role === "juge" || r.role === "greffier") roleMap.set(r.user_id, r.role);
  });

  return dossiers.map((d) => ({
    ...d,
    assigned_name: d.assigned_to ? nameMap.get(d.assigned_to) ?? null : null,
    assigned_role: d.assigned_to ? roleMap.get(d.assigned_to) ?? null : null,
  }));
}

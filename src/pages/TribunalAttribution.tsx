import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import type { DossierRow } from "@/lib/dossier-helpers";
import { statutLabels, statutColors, prioriteColors, prioriteLabels } from "@/lib/dossier-helpers";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { UserCheck, Loader2 } from "lucide-react";

interface AssignableUser {
  user_id: string;
  full_name: string;
  role: "juge" | "greffier";
  department: string | null;
}

export default function TribunalAttribution() {
  const { role } = useAuth();
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [users, setUsers] = useState<AssignableUser[]>([]);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isProcureur = role === "procureur";

  const loadData = async () => {
    setLoading(true);
    const [{ data: dossierData }, { data: rolesData }] = await Promise.all([
      supabase
        .from("dossiers")
        .select("*")
        .eq("status", "transmis")
        .order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role").in("role", ["juge", "greffier"]),
    ]);

    const userIds = (rolesData ?? []).map((r) => r.user_id);
    let profiles: { user_id: string; full_name: string; department: string | null }[] = [];
    if (userIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("user_id, full_name, department")
        .in("user_id", userIds);
      profiles = profileData ?? [];
    }

    const merged: AssignableUser[] = (rolesData ?? []).map((r) => {
      const p = profiles.find((pr) => pr.user_id === r.user_id);
      return {
        user_id: r.user_id,
        role: r.role as "juge" | "greffier",
        full_name: p?.full_name ?? "Utilisateur",
        department: p?.department ?? null,
      };
    });

    setDossiers(dossierData ?? []);
    setUsers(merged);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAssign = async (dossierId: string) => {
    const assigneeId = selections[dossierId];
    if (!assigneeId) {
      toast({ title: "Sélection requise", description: "Choisissez un juge ou greffier.", variant: "destructive" });
      return;
    }
    setSavingId(dossierId);
    const { error } = await supabase
      .from("dossiers")
      .update({ assigned_to: assigneeId })
      .eq("id", dossierId);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSavingId(null);
      return;
    }

    const assignee = users.find((u) => u.user_id === assigneeId);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("activites").insert({
        dossier_id: dossierId,
        user_id: user.id,
        action: "Attribution",
        details: `Dossier attribué à ${assignee?.full_name} (${assignee?.role})`,
      });
    }

    toast({ title: "Dossier attribué", description: `Assigné à ${assignee?.full_name}.` });
    setSavingId(null);
    await loadData();
  };

  return (
    <DashboardLayout variant="tribunal" title="Attribution des dossiers">
      <div className="space-y-4 animate-fade-in">
        {!isProcureur && (
          <Card className="p-4 bg-warning/10 border-warning/30">
            <p className="text-sm text-foreground">
              Seul le procureur peut attribuer des dossiers. Vous êtes en consultation.
            </p>
          </Card>
        )}

        {loading && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
          </div>
        )}

        {!loading && users.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Aucun juge ou greffier enregistré. Demandez à l'administrateur d'en créer.
            </p>
          </Card>
        )}

        {!loading && dossiers.length === 0 && (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">Aucun dossier en attente d'attribution.</p>
          </Card>
        )}

        <div className="space-y-3">
          {dossiers.map((d) => {
            const priority = (d.priority ?? "normale") as keyof typeof prioriteLabels;
            return (
              <Card key={d.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono text-muted-foreground">{d.reference}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${statutColors[d.status]}`}>
                        {statutLabels[d.status]}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${prioriteColors[priority]}`}>
                        {prioriteLabels[priority]}
                      </span>
                    </div>
                    <h3 className="font-medium text-sm text-foreground truncate">{d.titre}</h3>
                    {d.type_infraction && (
                      <p className="text-xs text-muted-foreground mt-0.5">{d.type_infraction}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 lg:w-auto w-full">
                    <Select
                      value={selections[d.id] ?? ""}
                      onValueChange={(v) => setSelections((s) => ({ ...s, [d.id]: v }))}
                      disabled={!isProcureur || users.length === 0}
                    >
                      <SelectTrigger className="w-full lg:w-64 h-9 text-xs">
                        <SelectValue placeholder="Choisir un destinataire" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((u) => (
                          <SelectItem key={u.user_id} value={u.user_id} className="text-xs">
                            {u.full_name} — {u.role === "juge" ? "Juge" : "Greffier"}
                            {u.department ? ` (${u.department})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      onClick={() => handleAssign(d.id)}
                      disabled={!isProcureur || savingId === d.id || !selections[d.id]}
                      className="h-9 gap-1.5"
                    >
                      {savingId === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      Attribuer
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}

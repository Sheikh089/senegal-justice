import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DossierRow } from "@/lib/dossier-helpers";
import { enrichDossiersWithAssignee } from "@/lib/dossier-assignee";
import {
  Search, Filter, FileText, Pencil, Trash2, Send, Archive,
  MapPin, Calendar, Paperclip, UserCheck,
} from "lucide-react";
import { StatusBadge, PrioriteBadge } from "@/components/StatusBadge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type EnrichedDossier = DossierRow & { assigned_name?: string | null; assigned_role?: string | null };
type Procureur = { user_id: string; full_name: string };

export default function PoliceDossiers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [dossiers, setDossiers] = useState<EnrichedDossier[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<EnrichedDossier | null>(null);
  const [transmitTarget, setTransmitTarget] = useState<EnrichedDossier | null>(null);
  const [procureurs, setProcureurs] = useState<Procureur[]>([]);
  const [selectedProcureur, setSelectedProcureur] = useState<string>("");
  const [actionLoading, setActionLoading] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("dossiers")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    const enriched = await enrichDossiersWithAssignee(data ?? []);
    setDossiers(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const openTransmit = async (d: EnrichedDossier) => {
    setTransmitTarget(d);
    setSelectedProcureur(d.assigned_to ?? "");
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "procureur");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length === 0) { setProcureurs([]); return; }
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", ids);
    setProcureurs((profs ?? []) as Procureur[]);
  };

  const confirmTransmit = async () => {
    if (!user || !transmitTarget || !selectedProcureur) {
      toast({ title: "Sélectionnez un procureur", variant: "destructive" });
      return;
    }
    setActionLoading(true);
    const { error } = await supabase
      .from("dossiers")
      .update({ status: "transmis", assigned_to: selectedProcureur })
      .eq("id", transmitTarget.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setActionLoading(false);
      return;
    }
    const proc = procureurs.find((p) => p.user_id === selectedProcureur);
    await supabase.from("activites").insert({
      dossier_id: transmitTarget.id,
      user_id: user.id,
      action: "Dossier transmis au procureur",
      details: proc?.full_name ?? null,
    });
    toast({ title: "Dossier transmis", description: proc ? `Assigné à ${proc.full_name}` : undefined });
    setTransmitTarget(null);
    setSelectedProcureur("");
    setActionLoading(false);
    load();
  };

  const confirmDelete = async () => {
    if (!user || !deleteTarget) return;
    setActionLoading(true);
    const { error } = await supabase
      .from("dossiers")
      .update({ status: "archive" })
      .eq("id", deleteTarget.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setActionLoading(false);
      return;
    }
    await supabase.from("activites").insert({
      dossier_id: deleteTarget.id,
      user_id: user.id,
      action: "Dossier archivé",
    });
    toast({ title: "Dossier archivé" });
    setDeleteTarget(null);
    setActionLoading(false);
    load();
  };

  const filtered = dossiers.filter(
    (d) =>
      d.titre.toLowerCase().includes(search.toLowerCase()) ||
      d.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout variant="police" title="Mes dossiers">
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
          {filtered.map((d) => {
            const canTransmit = d.status === "nouveau" || d.status === "en_cours";
            const isArchived = d.status === "archive";
            return (
              <div key={d.id} className="stat-card">
                <div
                  className="cursor-pointer"
                  onClick={() => navigate(`/police/dossiers/${d.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-xs font-mono text-muted-foreground">{d.reference}</span>
                    </div>
                    <div className="flex gap-1.5">
                      {columns.priority && <PrioriteBadge priorite={d.priority ?? "normale"} />}
                      {columns.status && <StatusBadge statut={d.status} />}
                    </div>
                  </div>
                  {columns.titre && (
                    <h3 className="font-heading font-semibold text-sm text-foreground mb-2 hover:text-primary transition-colors">
                      {d.titre}
                    </h3>
                  )}
                  {d.description && (
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{d.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                    {d.type_infraction && (
                      <span className="flex items-center gap-1">
                        <Paperclip className="h-3 w-3" />{d.type_infraction}
                      </span>
                    )}
                    {d.lieu && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />{d.lieu}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(d.created_at).toLocaleDateString("fr-FR")}
                    </span>
                    {columns.assignee && d.assigned_name && (
                      <span className="flex items-center gap-1 text-primary">
                        <UserCheck className="h-3 w-3" />
                        {d.assigned_name}
                        {d.assigned_role && (
                          <span className="text-muted-foreground"> ({d.assigned_role})</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-border/50">
                  {canTransmit && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openTransmit(d); }}
                      className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors flex items-center gap-1.5"
                    >
                      <Send className="h-3 w-3" /> Transmettre
                    </button>
                  )}
                  {!isArchived && (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/police/dossiers/${d.id}/editer`); }}
                      className="px-3 py-1.5 text-xs rounded-md border border-input bg-card text-foreground hover:bg-muted transition-colors flex items-center gap-1.5"
                    >
                      <Pencil className="h-3 w-3" /> Modifier
                    </button>
                  )}
                  {!isArchived && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(d); }}
                      className="px-3 py-1.5 text-xs rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors flex items-center gap-1.5 ml-auto"
                    >
                      <Trash2 className="h-3 w-3" /> Supprimer
                    </button>
                  )}
                  {isArchived && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1.5 ml-auto">
                      <Archive className="h-3 w-3" /> Dossier archivé
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={!!transmitTarget} onOpenChange={(open) => { if (!open) { setTransmitTarget(null); setSelectedProcureur(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transmettre au procureur</DialogTitle>
            <DialogDescription>
              Sélectionnez le procureur à qui assigner le dossier <span className="font-mono">{transmitTarget?.reference}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-xs font-medium text-foreground">Procureur</label>
            {procureurs.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun procureur disponible. Contactez l'administrateur.</p>
            ) : (
              <select
                value={selectedProcureur}
                onChange={(e) => setSelectedProcureur(e.target.value)}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Sélectionner un procureur...</option>
                {procureurs.map((p) => (
                  <option key={p.user_id} value={p.user_id}>{p.full_name}</option>
                ))}
              </select>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => { setTransmitTarget(null); setSelectedProcureur(""); }}
              className="px-4 py-2 text-sm rounded-lg border border-input hover:bg-muted transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={confirmTransmit}
              disabled={actionLoading || !selectedProcureur}
              className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="h-4 w-4" /> Confirmer
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archiver ce dossier ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le dossier <span className="font-mono">{deleteTarget?.reference}</span> sera archivé. Il ne sera plus modifiable mais restera consultable pour préserver la traçabilité judiciaire.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={actionLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
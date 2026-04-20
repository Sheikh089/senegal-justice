import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Gavel, FileText, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { DossierRow } from "@/lib/dossier-helpers";

type Verdict = "relaxe" | "condamnation" | "acquittement" | "renvoi" | "classement";

const verdictLabels: Record<Verdict, string> = {
  relaxe: "Relaxe",
  condamnation: "Condamnation",
  acquittement: "Acquittement",
  renvoi: "Renvoi",
  classement: "Classement sans suite",
};

const verdictColors: Record<Verdict, string> = {
  relaxe: "bg-success/15 text-success",
  condamnation: "bg-destructive/15 text-destructive",
  acquittement: "bg-success/15 text-success",
  renvoi: "bg-warning/15 text-warning",
  classement: "bg-muted text-muted-foreground",
};

interface DecisionRow {
  id: string;
  dossier_id: string;
  juge_id: string;
  verdict: Verdict;
  peine: string | null;
  motivation: string | null;
  date_decision: string;
}

export default function TribunalDecisions() {
  const { user, role } = useAuth();
  const [pending, setPending] = useState<DossierRow[]>([]);
  const [decided, setDecided] = useState<(DossierRow & { decision: DecisionRow })[]>([]);
  const [loading, setLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<DossierRow | null>(null);
  const [verdict, setVerdict] = useState<Verdict>("condamnation");
  const [peine, setPeine] = useState("");
  const [motivation, setMotivation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingDecision, setEditingDecision] = useState<DecisionRow | null>(null);

  const isJuge = role === "juge";

  const load = async () => {
    setLoading(true);
    const [{ data: pendingD }, { data: decidedD }, { data: decisionsD }] = await Promise.all([
      supabase
        .from("dossiers")
        .select("*")
        .eq("status", "audience_programmee")
        .order("updated_at", { ascending: false }),
      supabase
        .from("dossiers")
        .select("*")
        .eq("status", "juge")
        .order("updated_at", { ascending: false }),
      supabase.from("decisions").select("*"),
    ]);

    const decisionMap = new Map((decisionsD ?? []).map((d) => [d.dossier_id, d as DecisionRow]));
    setPending(pendingD ?? []);
    setDecided(
      (decidedD ?? [])
        .filter((d) => decisionMap.has(d.id))
        .map((d) => ({ ...d, decision: decisionMap.get(d.id)! })),
    );
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openDialog = (d: DossierRow) => {
    setSelected(d);
    setEditingDecision(null);
    setVerdict("condamnation");
    setPeine("");
    setMotivation("");
    setOpen(true);
  };

  const openEditDialog = (d: DossierRow, decision: DecisionRow) => {
    setSelected(d);
    setEditingDecision(decision);
    setVerdict(decision.verdict);
    setPeine(decision.peine ?? "");
    setMotivation(decision.motivation ?? "");
    setOpen(true);
  };

  const handleSubmit = async () => {
    if (!selected || !user) return;
    if (!motivation.trim()) {
      toast.error("La motivation est requise");
      return;
    }
    setSubmitting(true);

    if (editingDecision) {
      const { error: upErr } = await supabase
        .from("decisions")
        .update({
          verdict,
          peine: peine || null,
          motivation,
        })
        .eq("id", editingDecision.id);

      if (upErr) {
        toast.error("Erreur : " + upErr.message);
        setSubmitting(false);
        return;
      }

      await supabase.from("activites").insert({
        dossier_id: selected.id,
        user_id: user.id,
        action: "Décision modifiée",
        details: `${verdictLabels[verdict]}${peine ? ` — ${peine}` : ""}`,
      });

      toast.success("Décision mise à jour");
      setOpen(false);
      setSubmitting(false);
      load();
      return;
    }

    const { error: decErr } = await supabase.from("decisions").insert({
      dossier_id: selected.id,
      juge_id: user.id,
      verdict,
      peine: peine || null,
      motivation,
    });

    if (decErr) {
      toast.error("Erreur : " + decErr.message);
      setSubmitting(false);
      return;
    }

    const { error: dErr } = await supabase
      .from("dossiers")
      .update({ status: "juge" })
      .eq("id", selected.id);

    if (dErr) {
      toast.error("Erreur dossier : " + dErr.message);
      setSubmitting(false);
      return;
    }

    await supabase.from("activites").insert({
      dossier_id: selected.id,
      user_id: user.id,
      action: "Décision rendue",
      details: `${verdictLabels[verdict]}${peine ? ` — ${peine}` : ""}`,
    });

    toast.success("Décision enregistrée");
    setOpen(false);
    setSubmitting(false);
    load();
  };

  return (
    <DashboardLayout variant="tribunal" title="Décisions">
      <div className="space-y-6 animate-fade-in">
        {/* En attente de jugement */}
        <section>
          <h2 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-warning" />
            En attente de jugement {pending.length > 0 && <span className="text-muted-foreground">({pending.length})</span>}
          </h2>

          {loading && <p className="text-xs text-muted-foreground">Chargement...</p>}
          {!loading && pending.length === 0 && (
            <div className="stat-card text-center py-8">
              <Gavel className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Aucun dossier en attente</p>
            </div>
          )}

          <div className="space-y-3">
            {pending.map((d) => (
              <div key={d.id} className="stat-card flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-mono text-muted-foreground">{d.reference}</p>
                  <h3 className="font-heading font-semibold text-sm text-foreground truncate">{d.titre}</h3>
                  {d.type_infraction && (
                    <p className="text-xs text-muted-foreground mt-1">{d.type_infraction}</p>
                  )}
                </div>
                {isJuge && d.assigned_to === user?.id ? (
                  <Button size="sm" onClick={() => openDialog(d)}>
                    <Gavel className="h-4 w-4" /> Rendre la décision
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground self-center">
                    {isJuge ? "Non assigné à vous" : "Réservé au juge assigné"}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Jugés */}
        <section>
          <h2 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            Décisions rendues {decided.length > 0 && <span className="text-muted-foreground">({decided.length})</span>}
          </h2>

          {!loading && decided.length === 0 && (
            <p className="text-xs text-muted-foreground">Aucune décision rendue.</p>
          )}

          <div className="space-y-3">
            {decided.map((d) => (
              <div key={d.id} className="stat-card">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-muted-foreground">{d.reference}</p>
                    <h3 className="font-heading font-semibold text-sm text-foreground truncate">{d.titre}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`badge-status ${verdictColors[d.decision.verdict]}`}>
                      {verdictLabels[d.decision.verdict]}
                    </span>
                    {isJuge && d.decision.juge_id === user?.id && (
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(d, d.decision)}>
                        <Pencil className="h-3 w-3" /> Modifier
                      </Button>
                    )}
                  </div>
                </div>
                {d.decision.peine && (
                  <p className="text-sm text-foreground mb-2">
                    <strong className="text-muted-foreground text-xs uppercase tracking-wider">Peine : </strong>
                    {d.decision.peine}
                  </p>
                )}
                {d.decision.motivation && (
                  <p className="text-xs text-muted-foreground line-clamp-3">{d.decision.motivation}</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  Rendue le {format(new Date(d.decision.date_decision), "dd MMMM yyyy", { locale: fr })}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDecision ? "Modifier la décision" : "Rendre une décision"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                <span className="font-mono">{selected.reference}</span> — {selected.titre}
              </div>

              <div className="space-y-2">
                <Label>Verdict</Label>
                <Select value={verdict} onValueChange={(v) => setVerdict(v as Verdict)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(verdictLabels) as Verdict[]).map((v) => (
                      <SelectItem key={v} value={v}>
                        {verdictLabels[v]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {verdict === "condamnation" && (
                <div className="space-y-2">
                  <Label>Peine</Label>
                  <Input
                    value={peine}
                    onChange={(e) => setPeine(e.target.value)}
                    placeholder="ex : 6 mois de prison ferme + 500 000 FCFA d'amende"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Motivation *</Label>
                <Textarea
                  value={motivation}
                  onChange={(e) => setMotivation(e.target.value)}
                  placeholder="Exposé des motifs de la décision..."
                  rows={5}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? "Enregistrement..."
                : editingDecision
                  ? "Mettre à jour"
                  : "Enregistrer la décision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

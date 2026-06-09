import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { DossierRow } from "@/lib/dossier-helpers";
import { StatusBadge, PrioriteBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Send, Search, FileText, Calendar, MapPin, CheckCircle2, Clock, ArrowRight, Inbox } from "lucide-react";

type Procureur = { user_id: string; full_name: string };

export default function PoliceTransmettre() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [procureurs, setProcureurs] = useState<Procureur[]>([]);
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<DossierRow | null>(null);
  const [selectedProcureur, setSelectedProcureur] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("dossiers")
      .select("*")
      .eq("created_by", user.id)
      .order("created_at", { ascending: false });
    setDossiers((data ?? []) as DossierRow[]);

    const { data: roles } = await supabase
      .from("user_roles").select("user_id").eq("role", "procureur");
    const ids = (roles ?? []).map((r) => r.user_id);
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("user_id, full_name").in("user_id", ids);
      setProcureurs((profs ?? []) as Procureur[]);
    } else {
      setProcureurs([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return dossiers;
    return dossiers.filter((d) =>
      d.titre?.toLowerCase().includes(q) ||
      d.reference?.toLowerCase().includes(q) ||
      d.lieu?.toLowerCase().includes(q),
    );
  }, [dossiers, search]);

  const aTransmettre = filtered.filter((d) => d.status === "nouveau" || d.status === "en_cours");
  const transmis = filtered.filter((d) =>
    d.status === "transmis" || d.status === "audience_programmee" || d.status === "juge",
  );

  const procureurName = (id?: string | null) =>
    procureurs.find((p) => p.user_id === id)?.full_name ?? "—";

  const openTransmit = (d: DossierRow) => {
    setTarget(d);
    setSelectedProcureur(d.assigned_to ?? "");
    setNote("");
  };

  const confirmTransmit = async () => {
    if (!user || !target) return;
    if (!selectedProcureur) {
      toast({ title: "Sélectionnez un procureur", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase
      .from("dossiers")
      .update({ status: "transmis", assigned_to: selectedProcureur })
      .eq("id", target.id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }
    const proc = procureurs.find((p) => p.user_id === selectedProcureur);
    await supabase.from("activites").insert({
      dossier_id: target.id,
      user_id: user.id,
      action: "Dossier transmis au procureur",
      details: [proc?.full_name, note].filter(Boolean).join(" — ") || null,
    });
    toast({ title: "Dossier transmis", description: proc ? `Assigné à ${proc.full_name}` : undefined });
    setTarget(null);
    setSelectedProcureur("");
    setNote("");
    setSubmitting(false);
    load();
  };

  const stats = {
    pending: dossiers.filter((d) => d.status === "nouveau" || d.status === "en_cours").length,
    transmitted: dossiers.filter((d) => d.status === "transmis").length,
    judged: dossiers.filter((d) => d.status === "juge" || d.status === "audience_programmee").length,
  };

  return (
    <DashboardLayout variant="police" title="Transmettre">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatTile icon={Inbox} label="À transmettre" value={stats.pending} tone="warning" />
          <StatTile icon={Send} label="Transmis" value={stats.transmitted} tone="info" />
          <StatTile icon={CheckCircle2} label="Audience / Jugés" value={stats.judged} tone="success" />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
              <div>
                <CardTitle className="text-lg">Transmission au tribunal</CardTitle>
                <CardDescription>Sélectionnez un dossier prêt et assignez-le à un procureur.</CardDescription>
              </div>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Rechercher (titre, réf, lieu)"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="pending">
              <TabsList>
                <TabsTrigger value="pending">
                  À transmettre <Badge variant="secondary" className="ml-2">{aTransmettre.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="history">
                  Historique <Badge variant="secondary" className="ml-2">{transmis.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pending" className="mt-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>
                ) : aTransmettre.length === 0 ? (
                  <EmptyState text="Aucun dossier prêt à transmettre." />
                ) : (
                  <div className="space-y-3">
                    {aTransmettre.map((d) => (
                      <DossierLine
                        key={d.id}
                        d={d}
                        actionLabel="Transmettre"
                        actionIcon={Send}
                        onAction={() => openTransmit(d)}
                        onOpen={() => navigate(`/police/dossiers/${d.id}`)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                {loading ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">Chargement…</p>
                ) : transmis.length === 0 ? (
                  <EmptyState text="Aucun dossier transmis pour le moment." />
                ) : (
                  <div className="space-y-3">
                    {transmis.map((d) => (
                      <DossierLine
                        key={d.id}
                        d={d}
                        meta={`Procureur : ${procureurName(d.assigned_to)}`}
                        actionLabel="Voir le dossier"
                        actionIcon={ArrowRight}
                        onAction={() => navigate(`/police/dossiers/${d.id}`)}
                        onOpen={() => navigate(`/police/dossiers/${d.id}`)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Dialog open={!!target} onOpenChange={(o) => { if (!o) { setTarget(null); setSelectedProcureur(""); setNote(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transmettre au procureur</DialogTitle>
            <DialogDescription>
              Dossier <span className="font-mono">{target?.reference}</span> — {target?.titre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Procureur destinataire</Label>
              {procureurs.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Aucun procureur disponible. Contactez l'administrateur.
                </p>
              ) : (
                <select
                  value={selectedProcureur}
                  onChange={(e) => setSelectedProcureur(e.target.value)}
                  className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="">Sélectionner un procureur…</option>
                  {procureurs.map((p) => (
                    <option key={p.user_id} value={p.user_id}>{p.full_name}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="space-y-2">
              <Label>Note de transmission (optionnel)</Label>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Éléments à signaler au procureur…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Annuler</Button>
            <Button
              onClick={confirmTransmit}
              disabled={submitting || !selectedProcureur || procureurs.length === 0}
            >
              <Send className="h-4 w-4" />
              {submitting ? "Transmission…" : "Confirmer la transmission"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function StatTile({
  icon: Icon, label, value, tone,
}: { icon: any; label: string; value: number; tone: "warning" | "info" | "success" }) {
  const toneCls = tone === "warning"
    ? "bg-warning/10 text-warning"
    : tone === "info"
      ? "bg-info/10 text-info"
      : "bg-success/10 text-success";
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-4">
        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${toneCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-heading font-semibold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function DossierLine({
  d, onAction, onOpen, actionLabel, actionIcon: Icon, meta,
}: {
  d: DossierRow;
  onAction: () => void;
  onOpen: () => void;
  actionLabel: string;
  actionIcon: any;
  meta?: string;
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4 p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
      <div className="h-10 w-10 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <FileText className="h-5 w-5" />
      </div>
      <button onClick={onOpen} className="flex-1 text-left min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium truncate">{d.titre}</p>
          <span className="text-xs font-mono text-muted-foreground">{d.reference}</span>
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
          {d.lieu && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{d.lieu}</span>}
          <span className="inline-flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {new Date(d.created_at).toLocaleDateString("fr-FR")}
          </span>
          {meta && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{meta}</span>}
        </div>
      </button>
      <div className="flex items-center gap-2">
        <PrioriteBadge priorite={(d.priority as any) ?? "normale"} />
        <StatusBadge statut={d.status} />
        <Button size="sm" onClick={onAction}>
          <Icon className="h-4 w-4" />
          {actionLabel}
        </Button>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="py-12 text-center text-sm text-muted-foreground">
      <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
      {text}
    </div>
  );
}
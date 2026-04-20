import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarIcon, ArrowLeft, MapPin, FileText, Gavel, User, Scale } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatusBadge, PrioriteBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DossierRow } from "@/lib/dossier-helpers";
import { PiecesJointes } from "@/components/PiecesJointes";

interface AudienceRow {
  id: string;
  date_audience: string;
  salle: string | null;
  status: string;
}

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
  verdict: Verdict;
  peine: string | null;
  motivation: string | null;
  date_decision: string;
  juge_id: string;
}

interface Props {
  variant: "police" | "tribunal";
}

export default function DossierDetail({ variant }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();

  const [dossier, setDossier] = useState<DossierRow | null>(null);
  const [audience, setAudience] = useState<AudienceRow | null>(null);
  const [decision, setDecision] = useState<DecisionRow | null>(null);
  const [jugeName, setJugeName] = useState<string | null>(null);
  const [assignedName, setAssignedName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form state
  const [date, setDate] = useState<Date | undefined>();
  const [time, setTime] = useState("09:00");
  const [salle, setSalle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSchedule =
    !!dossier &&
    (role === "juge" || role === "greffier") &&
    dossier.assigned_to === user?.id &&
    (dossier.status === "transmis" || dossier.status === "audience_programmee");

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: d }, { data: a }, { data: dec }] = await Promise.all([
        supabase.from("dossiers").select("*").eq("id", id).maybeSingle(),
        supabase
          .from("audiences")
          .select("id, date_audience, salle, status")
          .eq("dossier_id", id)
          .order("date_audience", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("decisions")
          .select("id, verdict, peine, motivation, date_decision, juge_id")
          .eq("dossier_id", id)
          .order("date_decision", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      setDossier(d);
      setAudience(a);
      setDecision(dec as DecisionRow | null);
      if (d?.assigned_to) {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", d.assigned_to)
          .maybeSingle();
        setAssignedName(p?.full_name ?? null);
      }
      if (dec?.juge_id) {
        const { data: jp } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", dec.juge_id)
          .maybeSingle();
        setJugeName(jp?.full_name ?? null);
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSchedule = async () => {
    if (!dossier || !user || !date) {
      toast.error("Veuillez choisir une date");
      return;
    }
    setSubmitting(true);
    const [h, m] = time.split(":").map(Number);
    const dateAudience = new Date(date);
    dateAudience.setHours(h ?? 9, m ?? 0, 0, 0);

    const audiencePayload = {
      dossier_id: dossier.id,
      date_audience: dateAudience.toISOString(),
      salle: salle || null,
      status: "programmee",
      ...(role === "juge" ? { juge_id: user.id } : { greffier_id: user.id }),
    };

    const { error: aErr } = audience
      ? await supabase.from("audiences").update(audiencePayload).eq("id", audience.id)
      : await supabase.from("audiences").insert(audiencePayload);

    if (aErr) {
      toast.error("Erreur audience: " + aErr.message);
      setSubmitting(false);
      return;
    }

    const { error: dErr } = await supabase
      .from("dossiers")
      .update({ status: "audience_programmee" })
      .eq("id", dossier.id);

    if (dErr) {
      toast.error("Erreur dossier: " + dErr.message);
      setSubmitting(false);
      return;
    }

    await supabase.from("activites").insert({
      dossier_id: dossier.id,
      user_id: user.id,
      action: "Audience programmée",
      details: `Le ${format(dateAudience, "dd/MM/yyyy 'à' HH:mm", { locale: fr })}${salle ? ` — ${salle}` : ""}`,
    });

    toast.success("Audience programmée");
    setDossier({ ...dossier, status: "audience_programmee" });
    const { data: refreshed } = await supabase
      .from("audiences")
      .select("id, date_audience, salle, status")
      .eq("dossier_id", dossier.id)
      .order("date_audience", { ascending: false })
      .limit(1)
      .maybeSingle();
    setAudience(refreshed);
    setSubmitting(false);
  };

  const backTo = variant === "police" ? "/police/dossiers" : "/tribunal/dossiers";

  return (
    <DashboardLayout variant={variant} title="Détail du dossier">
      <div className="space-y-6 animate-fade-in max-w-4xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(backTo)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Retour
        </Button>

        {loading && <p className="text-sm text-muted-foreground">Chargement...</p>}

        {!loading && !dossier && (
          <p className="text-sm text-muted-foreground">Dossier introuvable.</p>
        )}

        {dossier && (
          <>
            <div className="stat-card space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-mono text-muted-foreground mb-1">{dossier.reference}</p>
                  <h2 className="font-heading text-xl font-semibold text-foreground">{dossier.titre}</h2>
                </div>
                <div className="flex gap-2">
                  <PrioriteBadge priorite={dossier.priority ?? "normale"} />
                  <StatusBadge statut={dossier.status} />
                </div>
              </div>

              {dossier.description && (
                <p className="text-sm text-muted-foreground">{dossier.description}</p>
              )}

              <div className="grid sm:grid-cols-2 gap-3 text-xs text-muted-foreground pt-2 border-t border-border/50">
                {dossier.type_infraction && (
                  <span className="flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5" /> {dossier.type_infraction}
                  </span>
                )}
                {dossier.lieu && (
                  <span className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" /> {dossier.lieu}
                  </span>
                )}
                {assignedName && (
                  <span className="flex items-center gap-2 text-primary">
                    <User className="h-3.5 w-3.5" /> Assigné à {assignedName}
                  </span>
                )}
              </div>
            </div>

            <PiecesJointes dossierId={dossier.id} />

            {decision && (
              <div className="stat-card space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
                    <Scale className="h-4 w-4 text-primary" /> Décision rendue
                  </h3>
                  <span className={`badge-status ${verdictColors[decision.verdict]}`}>
                    {verdictLabels[decision.verdict]}
                  </span>
                </div>
                {decision.peine && (
                  <div className="text-sm text-foreground">
                    <span className="text-muted-foreground text-xs uppercase tracking-wider">Peine : </span>
                    {decision.peine}
                  </div>
                )}
                {decision.motivation && (
                  <div>
                    <p className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Motivation</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{decision.motivation}</p>
                  </div>
                )}
                <p className="text-[10px] text-muted-foreground flex items-center gap-1 pt-2 border-t border-border/50">
                  <FileText className="h-3 w-3" />
                  Rendue le {format(new Date(decision.date_decision), "dd MMMM yyyy", { locale: fr })}
                  {jugeName && ` par ${jugeName}`}
                </p>
              </div>
            )}

            {audience && (
              <div className="stat-card">
                <h3 className="font-heading text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Gavel className="h-4 w-4 text-accent-foreground" /> Audience programmée
                </h3>
                <div className="text-sm text-foreground">
                  {format(new Date(audience.date_audience), "EEEE dd MMMM yyyy 'à' HH:mm", { locale: fr })}
                </div>
                {audience.salle && (
                  <div className="text-xs text-muted-foreground mt-1">Salle : {audience.salle}</div>
                )}
              </div>
            )}

            {canSchedule && (
              <div className="stat-card space-y-4">
                <h3 className="font-heading text-sm font-semibold text-foreground flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary" />
                  {audience ? "Modifier l'audience" : "Programmer une audience"}
                </h3>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !date && "text-muted-foreground",
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, "PPP", { locale: fr }) : "Choisir une date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setDate}
                          disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Heure</Label>
                    <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
                  </div>

                  <div className="space-y-2 sm:col-span-2">
                    <Label className="text-xs">Salle</Label>
                    <Input
                      placeholder="ex : Salle A, Chambre 2..."
                      value={salle}
                      onChange={(e) => setSalle(e.target.value)}
                    />
                  </div>
                </div>

                <Button onClick={handleSchedule} disabled={submitting || !date} className="w-full sm:w-auto">
                  {submitting ? "Enregistrement..." : audience ? "Mettre à jour l'audience" : "Programmer l'audience"}
                </Button>
              </div>
            )}

            {!canSchedule && (role === "juge" || role === "greffier") && dossier.assigned_to !== user?.id && (
              <p className="text-xs text-muted-foreground">
                Seul le juge ou greffier assigné à ce dossier peut programmer l'audience.
              </p>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

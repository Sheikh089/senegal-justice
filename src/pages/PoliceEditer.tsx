import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { Save, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useParams } from "react-router-dom";

export default function PoliceEditer() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    titre: "",
    type_infraction: "",
    lieu: "",
    description: "",
    priority: "normale",
    mis_en_cause_prenom: "",
    mis_en_cause_nom: "",
    mis_en_cause_date_naissance: "",
    mis_en_cause_lieu_naissance: "",
    mis_en_cause_profession: "",
    mis_en_cause_telephone: "",
    mis_en_cause_adresse: "",
  });

  useEffect(() => {
    if (!id) return;
    supabase
      .from("dossiers")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          toast({ title: "Dossier introuvable", variant: "destructive" });
          navigate("/police/dossiers");
          return;
        }
        setFormData({
          titre: data.titre ?? "",
          type_infraction: data.type_infraction ?? "",
          lieu: data.lieu ?? "",
          description: data.description ?? "",
          priority: data.priority ?? "normale",
          mis_en_cause_prenom: data.mis_en_cause_prenom ?? "",
          mis_en_cause_nom: data.mis_en_cause_nom ?? "",
          mis_en_cause_date_naissance: data.mis_en_cause_date_naissance ?? "",
          mis_en_cause_lieu_naissance: data.mis_en_cause_lieu_naissance ?? "",
          mis_en_cause_profession: data.mis_en_cause_profession ?? "",
          mis_en_cause_telephone: data.mis_en_cause_telephone ?? "",
          mis_en_cause_adresse: data.mis_en_cause_adresse ?? "",
        });
        setLoading(false);
      });
  }, [id, navigate, toast]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const save = async () => {
    if (!user || !id) return;
    if (!formData.titre || !formData.type_infraction) {
      toast({ title: "Champs requis", description: "Titre et type d'infraction obligatoires.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("dossiers")
      .update({
        titre: formData.titre,
        type_infraction: formData.type_infraction,
        lieu: formData.lieu || null,
        description: formData.description || null,
        priority: formData.priority,
        mis_en_cause_prenom: formData.mis_en_cause_prenom || null,
        mis_en_cause_nom: formData.mis_en_cause_nom || null,
        mis_en_cause_date_naissance: formData.mis_en_cause_date_naissance || null,
        mis_en_cause_lieu_naissance: formData.mis_en_cause_lieu_naissance || null,
        mis_en_cause_profession: formData.mis_en_cause_profession || null,
        mis_en_cause_telephone: formData.mis_en_cause_telephone || null,
        mis_en_cause_adresse: formData.mis_en_cause_adresse || null,
      })
      .eq("id", id);

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    await supabase.from("activites").insert({
      dossier_id: id,
      user_id: user.id,
      action: "Dossier modifié",
    });

    toast({ title: "Dossier mis à jour" });
    navigate("/police/dossiers");
  };

  if (loading) {
    return (
      <DashboardLayout variant="police" title="Modifier le dossier">
        <p className="text-xs text-muted-foreground">Chargement...</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout variant="police" title="Modifier le dossier">
      <div className="max-w-2xl animate-fade-in">
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="h-3 w-3" /> Retour
        </button>
        <div className="stat-card space-y-6">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Titre du dossier</label>
            <input
              name="titre"
              value={formData.titre}
              onChange={handleChange}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Type d'infraction</label>
              <select
                name="type_infraction"
                value={formData.type_infraction}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Sélectionner...</option>
                <option value="Vol">Vol</option>
                <option value="Vol aggravé">Vol aggravé</option>
                <option value="Escroquerie">Escroquerie</option>
                <option value="Violence physique">Violence physique</option>
                <option value="Abus de confiance">Abus de confiance</option>
                <option value="Faux et usage de faux">Faux et usage de faux</option>
                <option value="Trouble à l'ordre public">Trouble à l'ordre public</option>
                <option value="Autre">Autre</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Priorité</label>
              <select
                name="priority"
                value={formData.priority}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Lieu</label>
            <input
              name="lieu"
              value={formData.lieu}
              onChange={handleChange}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="pt-4 border-t border-border/50 space-y-4">
            <h3 className="font-heading text-sm font-semibold text-foreground">Mis en cause</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Prénom</label>
                <input name="mis_en_cause_prenom" value={formData.mis_en_cause_prenom} onChange={handleChange} className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nom</label>
                <input name="mis_en_cause_nom" value={formData.mis_en_cause_nom} onChange={handleChange} className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Date de naissance</label>
                <input type="date" name="mis_en_cause_date_naissance" value={formData.mis_en_cause_date_naissance} onChange={handleChange} className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Lieu de naissance</label>
                <input name="mis_en_cause_lieu_naissance" value={formData.mis_en_cause_lieu_naissance} onChange={handleChange} className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Profession</label>
                <input name="mis_en_cause_profession" value={formData.mis_en_cause_profession} onChange={handleChange} className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Téléphone</label>
                <input type="tel" name="mis_en_cause_telephone" value={formData.mis_en_cause_telephone} onChange={handleChange} className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground">Adresse</label>
                <input name="mis_en_cause_adresse" value={formData.mis_en_cause_adresse} onChange={handleChange} className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20" />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Description des faits</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            />
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Save className="h-4 w-4" /> {saving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
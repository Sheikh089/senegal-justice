import { DashboardLayout } from "@/components/DashboardLayout";
import { useState, useRef } from "react";
import { FilePlus, Send, Camera, Upload, X, Fingerprint } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { generateReference } from "@/lib/dossier-helpers";

type CaptureKey =
  | "photo_face"
  | "photo_gauche"
  | "photo_droite"
  | "empreinte_gauche"
  | "empreinte_droite";

const CAPTURES: { key: CaptureKey; label: string; icon: "camera" | "finger" }[] = [
  { key: "photo_face", label: "Photo de face", icon: "camera" },
  { key: "photo_gauche", label: "Profil gauche", icon: "camera" },
  { key: "photo_droite", label: "Profil droit", icon: "camera" },
  { key: "empreinte_gauche", label: "Empreintes main gauche", icon: "finger" },
  { key: "empreinte_droite", label: "Empreintes main droite", icon: "finger" },
];

export default function PoliceNouveau() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [captures, setCaptures] = useState<Record<CaptureKey, File | null>>({
    photo_face: null,
    photo_gauche: null,
    photo_droite: null,
    empreinte_gauche: null,
    empreinte_droite: null,
  });
  const [previews, setPreviews] = useState<Record<CaptureKey, string | null>>({
    photo_face: null,
    photo_gauche: null,
    photo_droite: null,
    empreinte_gauche: null,
    empreinte_droite: null,
  });
  const inputRefs = useRef<Record<CaptureKey, HTMLInputElement | null>>({
    photo_face: null,
    photo_gauche: null,
    photo_droite: null,
    empreinte_gauche: null,
    empreinte_droite: null,
  });

  const handleCapture = (key: CaptureKey, file: File | null) => {
    if (previews[key]) URL.revokeObjectURL(previews[key]!);
    setCaptures((c) => ({ ...c, [key]: file }));
    setPreviews((p) => ({ ...p, [key]: file ? URL.createObjectURL(file) : null }));
  };

  const removeCapture = (key: CaptureKey) => {
    handleCapture(key, null);
    if (inputRefs.current[key]) inputRefs.current[key]!.value = "";
  };

  const uploadCaptures = async (dossierId: string) => {
    const urls: Partial<Record<CaptureKey, string>> = {};
    for (const { key } of CAPTURES) {
      const file = captures[key];
      if (!file) continue;
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${dossierId}/${key}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("dossier-files")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      urls[key] = path;
    }
    return urls;
  };

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

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const save = async (transmettre: boolean) => {
    if (!user) return;
    if (!formData.titre || !formData.type_infraction) {
      toast({
        title: "Champs requis",
        description: "Renseigne au moins le titre et le type d'infraction.",
        variant: "destructive",
      });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("dossiers")
      .insert({
        reference: generateReference(),
        titre: formData.titre,
        type_infraction: formData.type_infraction,
        lieu: formData.lieu || null,
        description: formData.description || null,
        priority: formData.priority,
        status: transmettre ? "transmis" : "nouveau",
        created_by: user.id,
        mis_en_cause_prenom: formData.mis_en_cause_prenom || null,
        mis_en_cause_nom: formData.mis_en_cause_nom || null,
        mis_en_cause_date_naissance: formData.mis_en_cause_date_naissance || null,
        mis_en_cause_lieu_naissance: formData.mis_en_cause_lieu_naissance || null,
        mis_en_cause_profession: formData.mis_en_cause_profession || null,
        mis_en_cause_telephone: formData.mis_en_cause_telephone || null,
        mis_en_cause_adresse: formData.mis_en_cause_adresse || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    if (data) {
      try {
        const urls = await uploadCaptures(data.id);
        if (Object.keys(urls).length > 0) {
          await supabase
            .from("dossiers")
            .update({
              mis_en_cause_photo_face: urls.photo_face ?? null,
              mis_en_cause_photo_gauche: urls.photo_gauche ?? null,
              mis_en_cause_photo_droite: urls.photo_droite ?? null,
              mis_en_cause_empreinte_gauche: urls.empreinte_gauche ?? null,
              mis_en_cause_empreinte_droite: urls.empreinte_droite ?? null,
            })
            .eq("id", data.id);
        }
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Erreur inconnue";
        toast({ title: "Téléversement partiel", description: msg, variant: "destructive" });
      }

      await supabase.from("activites").insert({
        dossier_id: data.id,
        user_id: user.id,
        action: transmettre ? "Dossier créé et transmis" : "Dossier créé",
        details: data.reference,
      });
    }

    toast({
      title: "Dossier enregistré",
      description: `Référence ${data?.reference}`,
    });
    navigate("/police/dossiers");
  };

  return (
    <DashboardLayout variant="police" title="Nouveau dossier">
      <div className="max-w-2xl animate-fade-in">
        <div className="stat-card space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-border/50">
            <div className="p-2 rounded-lg bg-primary/10">
              <FilePlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-heading font-semibold text-foreground">Enregistrer une plainte</h2>
              <p className="text-xs text-muted-foreground">Une référence unique sera générée automatiquement</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Titre du dossier</label>
            <input
              name="titre"
              value={formData.titre}
              onChange={handleChange}
              placeholder="Ex: Vol à main armée — Quartier Plateau"
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
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
              placeholder="Quartier, ville..."
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
            />
          </div>

          <div className="pt-4 border-t border-border/50 space-y-4">
            <h3 className="font-heading text-sm font-semibold text-foreground">Mis en cause</h3>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Prénom</label>
                <input
                  name="mis_en_cause_prenom"
                  value={formData.mis_en_cause_prenom}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Nom</label>
                <input
                  name="mis_en_cause_nom"
                  value={formData.mis_en_cause_nom}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Date de naissance</label>
                <input
                  type="date"
                  name="mis_en_cause_date_naissance"
                  value={formData.mis_en_cause_date_naissance}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Lieu de naissance</label>
                <input
                  name="mis_en_cause_lieu_naissance"
                  value={formData.mis_en_cause_lieu_naissance}
                  onChange={handleChange}
                  placeholder="Ville, pays"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Profession</label>
                <input
                  name="mis_en_cause_profession"
                  value={formData.mis_en_cause_profession}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Téléphone</label>
                <input
                  type="tel"
                  name="mis_en_cause_telephone"
                  value={formData.mis_en_cause_telephone}
                  onChange={handleChange}
                  placeholder="+221 ..."
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <label className="text-xs font-medium text-foreground">Adresse</label>
                <input
                  name="mis_en_cause_adresse"
                  value={formData.mis_en_cause_adresse}
                  onChange={handleChange}
                  placeholder="Numéro, rue, quartier, ville"
                  className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-border/50 space-y-3">
              <div>
                <h4 className="text-xs font-semibold text-foreground">Photos & empreintes</h4>
                <p className="text-[11px] text-muted-foreground">
                  Capturez avec la caméra ou importez depuis l'appareil
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {CAPTURES.map(({ key, label, icon }) => {
                  const accept = icon === "finger" ? "image/*" : "image/*";
                  return (
                    <div key={key} className="space-y-1.5">
                      <label className="text-[11px] font-medium text-foreground flex items-center gap-1">
                        {icon === "finger" ? (
                          <Fingerprint className="h-3 w-3 text-muted-foreground" />
                        ) : (
                          <Camera className="h-3 w-3 text-muted-foreground" />
                        )}
                        {label}
                      </label>
                      <input
                        ref={(el) => (inputRefs.current[key] = el)}
                        type="file"
                        accept={accept}
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleCapture(key, e.target.files?.[0] ?? null)}
                      />
                      {previews[key] ? (
                        <div className="relative group rounded-lg overflow-hidden border border-input bg-background aspect-square">
                          <img
                            src={previews[key]!}
                            alt={label}
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeCapture(key)}
                            className="absolute top-1 right-1 p-1 rounded-md bg-destructive/90 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Supprimer"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => inputRefs.current[key]?.click()}
                            className="absolute bottom-1 right-1 p-1 rounded-md bg-background/90 text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Remplacer"
                          >
                            <Upload className="h-3 w-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => inputRefs.current[key]?.click()}
                          className="w-full aspect-square rounded-lg border-2 border-dashed border-input hover:border-primary/50 hover:bg-muted/30 transition-colors flex flex-col items-center justify-center gap-1 text-muted-foreground"
                        >
                          {icon === "finger" ? (
                            <Fingerprint className="h-5 w-5" />
                          ) : (
                            <Camera className="h-5 w-5" />
                          )}
                          <span className="text-[10px]">Capturer / Importer</span>
                        </button>
                      )}
                    </div>
                  );
                })}
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
              placeholder="Décrivez les circonstances de l'infraction..."
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <FilePlus className="h-4 w-4" /> Enregistrer
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg border border-input text-muted-foreground text-sm hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> Enregistrer et transmettre
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

import { DashboardLayout } from "@/components/DashboardLayout";
import { useState } from "react";
import { FilePlus, Upload, Send } from "lucide-react";

export default function PoliceNouveau() {
  const [formData, setFormData] = useState({
    typeInfraction: "",
    plaignant: "",
    suspect: "",
    description: "",
    priorite: "moyenne",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
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
              <p className="text-xs text-muted-foreground">Un numéro unique sera généré automatiquement</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Type d'infraction</label>
              <select
                name="typeInfraction"
                value={formData.typeInfraction}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="">Sélectionner...</option>
                <option value="vol">Vol</option>
                <option value="vol_aggrave">Vol aggravé</option>
                <option value="escroquerie">Escroquerie</option>
                <option value="violence">Violence physique</option>
                <option value="abus_confiance">Abus de confiance</option>
                <option value="faux">Faux et usage de faux</option>
                <option value="trouble">Trouble à l'ordre public</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Priorité</label>
              <select
                name="priorite"
                value={formData.priorite}
                onChange={handleChange}
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              >
                <option value="basse">Basse</option>
                <option value="moyenne">Moyenne</option>
                <option value="haute">Haute</option>
              </select>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Plaignant</label>
              <input
                name="plaignant"
                value={formData.plaignant}
                onChange={handleChange}
                placeholder="Nom complet du plaignant"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">Suspect</label>
              <input
                name="suspect"
                value={formData.suspect}
                onChange={handleChange}
                placeholder="Nom ou 'Inconnu'"
                className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
              />
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

          {/* Upload zone */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Pièces jointes</label>
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/30 transition-colors cursor-pointer">
              <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Photos, vidéos, documents PDF</p>
              <p className="text-[10px] text-muted-foreground mt-1">Glissez-déposez ou cliquez pour sélectionner</p>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2">
              <FilePlus className="h-4 w-4" /> Enregistrer le dossier
            </button>
            <button className="px-4 py-2.5 rounded-lg border border-input text-muted-foreground text-sm hover:bg-muted transition-colors flex items-center gap-2">
              <Send className="h-4 w-4" /> Enregistrer et transmettre
            </button>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

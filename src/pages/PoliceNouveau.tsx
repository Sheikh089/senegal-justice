import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useMemo, useState } from "react";
import {
  FilePlus,
  Send,
  AlertCircle,
  Loader2,
  Sparkles,
  ExternalLink,
  History,
  Eye,
  Pencil,
  Check,
  X,
  RefreshCw,
  Wand2,
  Plus,
  Trash2,
  GitCompare,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { generateReference } from "@/lib/dossier-helpers";
import {
  type Article,
  buildArticleUrl,
  diffLines,
  hasChanges,
  normalizeArticleNumber,
  suggestedArticlesFor,
  validateArticles,
} from "@/lib/penal-code";

type GenerationResult = {
  description: string;
  articles: Article[];
  warnings: string[];
  model: string;
  version: string;
  prompt: string;
};
type HistoryRow = {
  id: string;
  created_at: string;
  titre: string | null;
  type_infraction: string | null;
  lieu: string | null;
  prompt: string;
  model: string;
  version: string;
  description: string;
  articles: Article[];
  warnings: string[];
};

export default function PoliceNouveau() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<GenerationResult | null>(null);
  const [previewMode, setPreviewMode] = useState<"preview" | "edit">("preview");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedArticles, setEditedArticles] = useState<Article[]>([]);
  const [articlesEditMode, setArticlesEditMode] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [correcting, setCorrecting] = useState(false);

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

  const generateDescription = async (
    opts?: { expected?: string[]; missing?: string[]; invalid?: string[]; correction?: boolean }
  ) => {
    if (!formData.titre && !formData.type_infraction) {
      toast({
        title: "Titre requis",
        description: "Renseigne d'abord le titre ou le type d'infraction.",
        variant: "destructive",
      });
      return;
    }
    if (opts?.correction) setCorrecting(true);
    else setGenerating(true);
    setErrorMsg(null);
    const { data, error } = await supabase.functions.invoke("generate-description", {
      body: {
        titre: formData.titre,
        type_infraction: formData.type_infraction,
        lieu: formData.lieu,
        expected_articles: opts?.expected,
        missing_articles: opts?.missing,
        invalid_articles: opts?.invalid,
      },
    });
    setGenerating(false);
    setCorrecting(false);
    if (error || (data as any)?.error) {
      const msg = data?.error || error?.message || "Erreur IA";
      setErrorMsg(msg);
      toast({ title: "Génération impossible", description: msg, variant: "destructive" });
      return;
    }
    const result = data as GenerationResult;
    if (!result?.description) {
      toast({ title: "Réponse vide", description: "L'IA n'a rien renvoyé.", variant: "destructive" });
      return;
    }
    setPreview(result);
    setEditedDescription(result.description);
    setEditedArticles(result.articles ?? []);
    setArticlesEditMode(false);
    setShowDiff(false);
    setPreviewMode("preview");

    // Historique : on enregistre chaque génération et on garde l'id
    // pour synchroniser les éditions ultérieures (articles, description).
    if (user) {
      const { data: inserted, error: histErr } = await (supabase as any)
        .from("ai_generations")
        .insert({
          user_id: user.id,
          titre: formData.titre || null,
          type_infraction: formData.type_infraction || null,
          lieu: formData.lieu || null,
          prompt: result.prompt,
          model: result.model,
          version: result.version,
          description: result.description,
          articles: result.articles,
          warnings: result.warnings,
        })
        .select("id")
        .single();
      if (histErr) console.error("Historique IA :", histErr);
      setGenerationId((inserted as { id: string } | null)?.id ?? null);
    }
  };

  // Sauvegarde automatique des éditions manuelles (articles / description)
  // dans la ligne ai_generations, pour qu'une réutilisation ultérieure
  // restaure exactement la sélection de l'utilisateur.
  useEffect(() => {
    if (!generationId || !preview) return;
    const t = setTimeout(async () => {
      const { error: updErr } = await (supabase as any)
        .from("ai_generations")
        .update({
          description: editedDescription,
          articles: editedArticles,
          warnings: liveValidation.warnings,
        })
        .eq("id", generationId);
      if (updErr) console.error("Sync génération :", updErr);
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedDescription, editedArticles, generationId]);

  const buildArticlesBlock = (articles: Article[]) =>
    articles.length
      ? "\n\nQualification pénale :\n" +
        articles.map((a) => `- Article ${a.numero} du Code pénal : ${a.libelle}`).join("\n")
      : "";

  const candidateDescription = useMemo(
    () => editedDescription + buildArticlesBlock(editedArticles),
    [editedDescription, editedArticles]
  );

  const liveValidation = useMemo(
    () => validateArticles(formData.type_infraction, editedArticles),
    [formData.type_infraction, editedArticles]
  );

  const diff = useMemo(
    () => diffLines(formData.description, candidateDescription),
    [formData.description, candidateDescription]
  );
  const diffChanged = hasChanges(diff);

  const applyPreview = () => {
    if (!preview) return;
    setFormData((prev) => ({ ...prev, description: candidateDescription }));
    setPreview(null);
    setGenerationId(null);
    toast({ title: "Description appliquée", description: "Tu peux encore l'éditer dans le formulaire." });
  };

  const correctWithAI = () => {
    void generateDescription({
      expected: liveValidation.expected,
      missing: liveValidation.missingExpected,
      invalid: liveValidation.invalidArticles,
      correction: true,
    });
  };

  const autoFixArticles = () => {
    const suggested = suggestedArticlesFor(formData.type_infraction);
    if (!suggested.length) {
      toast({
        title: "Auto-correction indisponible",
        description: "Aucune liste d'articles de référence pour ce type d'infraction.",
        variant: "destructive",
      });
      return;
    }
    setEditedArticles(suggested);
    setArticlesEditMode(false);
    toast({ title: "Articles corrigés", description: `${suggested.length} article(s) mis à jour.` });
  };

  const updateArticle = (i: number, patch: Partial<Article>) => {
    setEditedArticles((prev) =>
      prev.map((a, idx) => {
        if (idx !== i) return a;
        const next = { ...a, ...patch };
        if (patch.numero !== undefined) {
          next.numero = patch.numero;
          const n = normalizeArticleNumber(patch.numero);
          if (n) next.url = buildArticleUrl(n);
        }
        return next;
      })
    );
  };
  const removeArticle = (i: number) =>
    setEditedArticles((prev) => prev.filter((_, idx) => idx !== i));
  const addArticle = () =>
    setEditedArticles((prev) => [...prev, { numero: "", libelle: "", url: undefined }]);

  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    const { data, error } = await (supabase as any)
      .from("ai_generations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setLoadingHistory(false);
    if (error) {
      toast({ title: "Erreur historique", description: error.message, variant: "destructive" });
      return;
    }
    setHistory((data as HistoryRow[]) ?? []);
  };

  useEffect(() => {
    if (showHistory) loadHistory();
  }, [showHistory]);

  const reuseHistory = (row: HistoryRow) => {
    setPreview({
      description: row.description,
      articles: row.articles ?? [],
      warnings: row.warnings ?? [],
      model: row.model,
      version: row.version,
      prompt: row.prompt,
    });
    setEditedDescription(row.description);
    setEditedArticles(row.articles ?? []);
    setArticlesEditMode(false);
    setShowDiff(false);
    setPreviewMode("preview");
    setShowHistory(false);
  };

  const save = async (transmettre: boolean) => {
    if (!user) return;
    setErrorMsg(null);
    if (!formData.titre || !formData.type_infraction) {
      setErrorMsg("Renseigne au moins le titre et le type d'infraction.");
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
      setErrorMsg(error.message);
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    if (data) {
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
      <div className="w-full max-w-5xl mx-auto animate-fade-in px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
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
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-foreground">Description des faits</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHistory((v) => !v)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border border-input text-muted-foreground hover:bg-muted transition-colors"
                >
                  <History className="h-3.5 w-3.5" />
                  Historique
                </button>
                <button
                  type="button"
                  onClick={() => generateDescription()}
                  disabled={generating}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/15 transition-colors disabled:opacity-50"
                >
                  {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  {generating ? "Génération..." : "Générer avec l'IA"}
                </button>
              </div>
            </div>

            {preview && (
              <div className="mt-2 rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary">
                    <Sparkles className="h-3.5 w-3.5" />
                    Prévisualisation IA · {preview.model} · {preview.version}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPreviewMode("preview")}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        previewMode === "preview" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Eye className="h-3 w-3" /> Aperçu
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewMode("edit")}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        previewMode === "edit" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Pencil className="h-3 w-3" /> Éditer
                    </button>
                  </div>
                </div>

                {(liveValidation.warnings.length > 0 ||
                  liveValidation.invalidArticles.length > 0 ||
                  liveValidation.missingExpected.length > 0) && (
                  <div className="rounded-md border border-warning/30 bg-warning/10 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-warning">
                        <AlertCircle className="h-3.5 w-3.5" />
                        Validation des articles
                      </div>
                      <div className="flex items-center gap-1">
                        {liveValidation.expected.length > 0 && (
                          <button
                            type="button"
                            onClick={autoFixArticles}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-warning/20 text-warning hover:bg-warning/30"
                          >
                            <Wand2 className="h-3 w-3" /> Auto-corriger
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => generateDescription()}
                          disabled={generating}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-warning/30 text-warning hover:bg-warning/10 disabled:opacity-50"
                        >
                          <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} /> Régénérer
                        </button>
                      </div>
                    </div>
                    <ul className="text-xs text-foreground/80 list-disc pl-4 space-y-0.5">
                      {liveValidation.warnings.map((w, i) => (
                        <li key={i}>{w}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {previewMode === "preview" ? (
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {editedDescription}
                  </div>
                ) : (
                  <textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={8}
                    className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
                  />
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-foreground uppercase tracking-wide">
                      Sources — Code pénal du Sénégal
                    </div>
                    <button
                      type="button"
                      onClick={() => setArticlesEditMode((v) => !v)}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-input text-muted-foreground hover:bg-muted"
                    >
                      {articlesEditMode ? (
                        <>
                          <Eye className="h-3 w-3" /> Aperçu articles
                        </>
                      ) : (
                        <>
                          <Pencil className="h-3 w-3" /> Éditer articles
                        </>
                      )}
                    </button>
                  </div>
                  {editedArticles.length === 0 && !articlesEditMode && (
                    <div className="text-xs text-muted-foreground italic">Aucun article cité.</div>
                  )}
                  <ul className="space-y-1.5">
                    {editedArticles.map((a, i) => {
                      const n = normalizeArticleNumber(a.numero);
                      const invalid =
                        liveValidation.invalidArticles.includes(n) ||
                        liveValidation.invalidFormat.includes(a.numero);
                      return (
                        <li
                          key={i}
                          className={`flex items-start justify-between gap-3 rounded-md border px-3 py-2 ${
                            invalid
                              ? "border-warning/40 bg-warning/5"
                              : "border-border/60 bg-background"
                          }`}
                        >
                          {articlesEditMode ? (
                            <div className="flex-1 grid grid-cols-[90px_1fr_auto] gap-2 items-center">
                              <input
                                value={a.numero}
                                onChange={(e) => updateArticle(i, { numero: e.target.value })}
                                placeholder="N°"
                                className="px-2 py-1 text-sm rounded border border-input bg-background"
                              />
                              <input
                                value={a.libelle}
                                onChange={(e) => updateArticle(i, { libelle: e.target.value })}
                                placeholder="Libellé"
                                className="px-2 py-1 text-sm rounded border border-input bg-background"
                              />
                              <button
                                type="button"
                                onClick={() => removeArticle(i)}
                                className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                aria-label="Supprimer l'article"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="text-sm flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-foreground">Article {a.numero}</span>
                              <span className="text-muted-foreground"> — {a.libelle}</span>
                              {invalid ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-warning/15 text-warning text-[10px] font-medium">
                                  <AlertCircle className="h-3 w-3" /> Hors périmètre
                                </span>
                              ) : liveValidation.expected.length ? (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-success/15 text-success text-[10px] font-medium">
                                  <Check className="h-3 w-3" /> Cohérent
                                </span>
                              ) : null}
                            </div>
                          )}
                          {!articlesEditMode && a.url && (
                            <a
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline shrink-0"
                            >
                              Ouvrir <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {articlesEditMode && (
                    <button
                      type="button"
                      onClick={addArticle}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs border border-dashed border-input text-muted-foreground hover:bg-muted"
                    >
                      <Plus className="h-3 w-3" /> Ajouter un article
                    </button>
                  )}
                </div>

                {formData.description && diffChanged && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowDiff((v) => !v)}
                      className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border border-input text-muted-foreground hover:bg-muted"
                    >
                      <GitCompare className="h-3.5 w-3.5" />
                      {showDiff ? "Masquer la comparaison" : "Comparer avec la description actuelle"}
                    </button>
                    {showDiff && (
                      <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/30 p-3 text-xs font-mono whitespace-pre-wrap">
                        {diff.map((d, i) => (
                          <div
                            key={i}
                            className={
                              d.type === "add"
                                ? "bg-success/10 text-success"
                                : d.type === "rm"
                                ? "bg-destructive/10 text-destructive line-through"
                                : "text-foreground/70"
                            }
                          >
                            <span className="select-none opacity-60 mr-1">
                              {d.type === "add" ? "+" : d.type === "rm" ? "-" : " "}
                            </span>
                            {d.line || "\u00A0"}
                          </div>
                        ))}
                      </pre>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2 border-t border-primary/20">
                  <button
                    type="button"
                    onClick={applyPreview}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90"
                  >
                    <Check className="h-3.5 w-3.5" />
                    Utiliser cette description
                  </button>
                  <button
                    type="button"
                    onClick={() => generateDescription()}
                    disabled={generating}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${generating ? "animate-spin" : ""}`} />
                    Régénérer
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreview(null)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-3.5 w-3.5" />
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {showHistory && (
              <div className="mt-2 rounded-lg border border-border bg-muted/30 p-4 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-foreground uppercase tracking-wide">Historique des générations IA</div>
                  <button type="button" onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground">
                    <X className="h-4 w-4" />
                  </button>
                </div>
                {loadingHistory ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Chargement…
                  </div>
                ) : history.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Aucune génération enregistrée pour le moment.</div>
                ) : (
                  <ul className="space-y-2 max-h-80 overflow-y-auto">
                    {history.map((h) => (
                      <li key={h.id} className="rounded-md border border-border bg-background p-3 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">
                            {h.titre || h.type_infraction || "(sans titre)"}
                          </span>
                          <span className="text-muted-foreground">
                            {new Date(h.created_at).toLocaleString("fr-FR")}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{h.description}</div>
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-[10px] text-muted-foreground">{h.model} · {h.version}</span>
                          <button
                            type="button"
                            onClick={() => reuseHistory(h)}
                            className="ml-auto text-xs text-primary hover:underline"
                          >
                            Réutiliser
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={8}
              placeholder="Décrivez les circonstances de l'infraction..."
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20 resize-none"
            />
            <p className="text-[11px] text-muted-foreground">
              L'IA propose une description et cite les articles du Code pénal sénégalais à titre indicatif. Vérifie toujours la qualification juridique.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => save(false)}
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <FilePlus className="h-4 w-4" />}
              {saving ? "Enregistrement..." : "Enregistrer"}
            </button>
            <button
              onClick={() => save(true)}
              disabled={saving}
              className="px-4 py-2.5 rounded-lg border border-input text-muted-foreground text-sm hover:bg-muted transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {saving ? "Transmission..." : "Enregistrer et transmettre"}
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {saving && !errorMsg && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-input bg-muted/50 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Enregistrement du dossier en cours, veuillez patienter…</span>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

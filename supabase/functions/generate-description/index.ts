// Génère une description des faits + articles du Code pénal sénégalais (structuré)
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VERSION = "v2";
const MODEL = "google/gemini-3-flash-preview";

// Articles indicatifs du Code pénal sénégalais (Loi n° 65-60) par type d'infraction
const EXPECTED_ARTICLES: Record<string, string[]> = {
  "Vol": ["364", "365"],
  "Vol aggravé": ["364", "366", "367"],
  "Escroquerie": ["379"],
  "Violence physique": ["294", "295", "297"],
  "Abus de confiance": ["383"],
  "Faux et usage de faux": ["132", "137"],
  "Trouble à l'ordre public": ["96", "97"],
};

type Article = { numero: string; libelle: string; url?: string };

function buildUrl(numero: string) {
  // Référence indicative : lien vers le portail juridique du Sénégal (recherche)
  return `https://www.google.com/search?q=Code+p%C3%A9nal+S%C3%A9n%C3%A9gal+article+${encodeURIComponent(numero)}`;
}

function validateArticles(type_infraction: string | undefined, articles: Article[]) {
  const warnings: string[] = [];
  if (!articles.length) {
    warnings.push("Aucun article du Code pénal n'a été cité par l'IA.");
    return warnings;
  }
  const expected = type_infraction ? EXPECTED_ARTICLES[type_infraction] : undefined;
  if (expected && expected.length) {
    const cited = articles.map((a) => String(a.numero).replace(/[^\d]/g, ""));
    const hasMatch = expected.some((e) => cited.includes(e));
    if (!hasMatch) {
      warnings.push(
        `Les articles cités (${cited.join(", ")}) ne correspondent pas aux articles habituellement retenus pour "${type_infraction}" (attendus : ${expected.join(", ")}). À vérifier manuellement.`
      );
    }
  }
  for (const a of articles) {
    const n = String(a.numero).replace(/[^\d]/g, "");
    if (!n) warnings.push(`Numéro d'article invalide : "${a.numero}"`);
  }
  return warnings;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { titre, type_infraction, lieu } = await req.json();
    if (!titre && !type_infraction) {
      return new Response(JSON.stringify({ error: "titre ou type_infraction requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY manquant" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `Tu es un assistant juridique pour la Police Nationale du Sénégal. Tu rédiges une description factuelle et professionnelle des faits pour un procès-verbal, en français, à partir d'un titre de dossier et d'un type d'infraction.

Consignes :
- Rédige un paragraphe clair, neutre, à la 3e personne (2 à 4 phrases).
- Reste plausible et générique : n'invente pas d'identités, de dates précises, ni de montants.
- Cite 1 à 3 articles pertinents du Code pénal sénégalais (Loi n° 65-60 du 21 juillet 1965 et modifications).
- Réponds STRICTEMENT en JSON valide, sans texte hors JSON, sans balises Markdown, au format :
{
  "description": "paragraphe des faits (2 à 4 phrases)",
  "articles": [
    { "numero": "364", "libelle": "Vol simple" }
  ]
}`;

    const userPrompt = `Titre du dossier : ${titre ?? "(non précisé)"}
Type d'infraction : ${type_infraction ?? "(non précisé)"}
Lieu : ${lieu ?? "(non précisé)"}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "Limite de requêtes atteinte, réessaie dans quelques instants." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "Crédits IA épuisés. Ajoute des crédits dans l'espace de travail." }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: `Erreur IA: ${t}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw: string = data?.choices?.[0]?.message?.content ?? "";
    let description = "";
    let articles: Article[] = [];
    try {
      const cleaned = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const parsed = JSON.parse(cleaned);
      description = String(parsed.description ?? "").trim();
      if (Array.isArray(parsed.articles)) {
        articles = parsed.articles
          .filter((a: any) => a && (a.numero ?? a.number))
          .map((a: any) => ({
            numero: String(a.numero ?? a.number),
            libelle: String(a.libelle ?? a.label ?? ""),
          }));
      }
    } catch {
      description = raw.trim();
    }
    articles = articles.map((a) => ({ ...a, url: buildUrl(a.numero) }));
    const warnings = validateArticles(type_infraction, articles);

    return new Response(
      JSON.stringify({
        description,
        articles,
        warnings,
        model: MODEL,
        version: VERSION,
        prompt: userPrompt,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
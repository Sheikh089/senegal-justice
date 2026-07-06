// Génère une description des faits + articles du Code pénal sénégalais
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
- Termine par une section "Qualification pénale :" listant 1 à 3 articles pertinents du Code pénal sénégalais (Loi n° 65-60 du 21 juillet 1965 et ses modifications) avec numéro d'article et intitulé bref.
- Format de sortie STRICT :

<description>
... paragraphe ...

Qualification pénale :
- Article X du Code pénal : ...
- Article Y du Code pénal : ...
</description>`;

    const user = `Titre du dossier : ${titre ?? "(non précisé)"}
Type d'infraction : ${type_infraction ?? "(non précisé)"}
Lieu : ${lieu ?? "(non précisé)"}`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": LOVABLE_API_KEY,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
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
    let content: string = data?.choices?.[0]?.message?.content ?? "";
    const m = content.match(/<description>([\s\S]*?)<\/description>/i);
    if (m) content = m[1].trim();

    return new Response(JSON.stringify({ description: content }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
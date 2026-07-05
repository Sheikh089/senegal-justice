import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "search_dossiers",
  title: "Rechercher des dossiers",
  description:
    "Recherche des dossiers par mot-clé sur la référence, le titre ou la description.",
  inputSchema: {
    query: z.string().min(1).describe("Terme de recherche."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Non authentifié" }], isError: true };
    }
    const pattern = `%${query}%`;
    const { data, error } = await supabaseForUser(ctx)
      .from("dossiers")
      .select("id, reference, titre, status, type_infraction, created_at")
      .or(
        `reference.ilike.${pattern},titre.ilike.${pattern},description.ilike.${pattern}`,
      )
      .order("updated_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});

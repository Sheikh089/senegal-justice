import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listDossiers from "./tools/list-dossiers";
import getDossier from "./tools/get-dossier";
import searchDossiers from "./tools/search-dossiers";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "justicelink-mcp",
  title: "JusticeLink MCP",
  version: "0.1.0",
  instructions:
    "Outils MCP JusticeLink pour consulter et rechercher les dossiers judiciaires de l'utilisateur connecté. Utilise `list_dossiers` pour lister, `search_dossiers` pour rechercher, et `get_dossier` pour obtenir le détail complet.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listDossiers, searchDossiers, getDossier],
});

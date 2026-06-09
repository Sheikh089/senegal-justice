// Edge function: chiffre/déchiffre des templates biométriques côté serveur.
// Accès restreint aux utilisateurs ayant le rôle `police` ou `admin`.
// Clé maître: secret `BIOMETRIC_MASTER_KEY` (base64 ou texte). Dérivée via HKDF-SHA256.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const enc = new TextEncoder();

function b64encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function deriveKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("BIOMETRIC_MASTER_KEY");
  if (!raw) throw new Error("BIOMETRIC_MASTER_KEY non configuré");
  // Try base64 first, fallback to utf8 bytes
  let material: Uint8Array;
  try {
    material = b64decode(raw);
    if (material.length < 16) throw new Error("too short");
  } catch {
    material = enc.encode(raw);
  }
  const baseKey = await crypto.subtle.importKey("raw", material, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: enc.encode("justicelink.biometrics.v1"),
      info: enc.encode("aes-gcm-256"),
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

async function authorize(req: Request): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const token = authHeader.replace("Bearer ", "");
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  const userId = data.claims.sub as string;

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", userId);
  const allowed = (roles ?? []).some((r) => r.role === "police" || r.role === "admin");
  if (!allowed) {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
  return { userId };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = await authorize(req);
    if (auth instanceof Response) return auth;

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;
    const key = await deriveKey();

    if (action === "encrypt") {
      const plaintextB64 = body?.template as string;
      if (!plaintextB64 || typeof plaintextB64 !== "string") {
        return new Response(JSON.stringify({ error: "template requis (base64)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const plaintext = b64decode(plaintextB64);
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext));
      const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", plaintext));
      return new Response(
        JSON.stringify({
          template_encrypted: b64encode(ct),
          template_iv: b64encode(iv),
          template_hash: Array.from(hash).map((b) => b.toString(16).padStart(2, "0")).join(""),
          template_algo: "AES-GCM-256",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "decrypt") {
      const ctB64 = body?.template_encrypted as string;
      const ivB64 = body?.template_iv as string;
      if (!ctB64 || !ivB64) {
        return new Response(JSON.stringify({ error: "template_encrypted et template_iv requis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64decode(ivB64) }, key, b64decode(ctB64)));
      return new Response(JSON.stringify({ template: b64encode(pt) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "action invalide" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

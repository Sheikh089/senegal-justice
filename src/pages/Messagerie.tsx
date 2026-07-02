import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Search } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { DossierRow } from "@/lib/dossier-helpers";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

interface Props {
  variant: "police" | "tribunal";
}

interface ConversationItem {
  dossier: DossierRow;
  lastMessage?: string | null;
  lastAt?: string | null;
  peerName?: string | null;
}

export default function Messagerie({ variant }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<ConversationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!user) return;
    (async () => {
      const query =
        variant === "police"
          ? supabase.from("dossiers").select("*").eq("created_by", user.id)
          : supabase
              .from("dossiers")
              .select("*")
              .in("status", ["transmis", "audience_programmee", "juge", "classe"]);
      const { data: dossiers } = await query.order("created_at", { ascending: false });
      const list = dossiers ?? [];

      const enriched: ConversationItem[] = await Promise.all(
        list.map(async (d) => {
          const { data: msg } = await supabase
            .from("messages")
            .select("content, kind, created_at")
            .eq("dossier_id", d.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          const peerId = variant === "police" ? d.assigned_to : d.created_by;
          let peerName: string | null = null;
          if (peerId) {
            const { data: p } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("user_id", peerId)
              .maybeSingle();
            peerName = p?.full_name ?? null;
          }

          return {
            dossier: d,
            lastMessage: msg?.content ?? (msg?.kind && msg.kind !== "text" ? `[${msg.kind}]` : null),
            lastAt: msg?.created_at ?? null,
            peerName,
          };
        })
      );

      enriched.sort((a, b) => {
        const ta = a.lastAt ? new Date(a.lastAt).getTime() : 0;
        const tb = b.lastAt ? new Date(b.lastAt).getTime() : 0;
        return tb - ta;
      });
      setItems(enriched);
      setLoading(false);
    })();
  }, [user, variant]);

  const filtered = items.filter((it) => {
    const q = search.toLowerCase();
    return (
      !q ||
      it.dossier.titre.toLowerCase().includes(q) ||
      it.dossier.reference.toLowerCase().includes(q) ||
      (it.peerName ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <DashboardLayout variant={variant} title="Messagerie">
      <div className="space-y-4 animate-fade-in max-w-4xl">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Rechercher une conversation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg border border-input bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/20"
          />
        </div>

        {loading && <p className="text-xs text-muted-foreground">Chargement...</p>}
        {!loading && filtered.length === 0 && (
          <div className="stat-card text-center py-10">
            <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Aucune conversation.</p>
          </div>
        )}

        <div className="space-y-2">
          {filtered.map((it) => {
            const to =
              variant === "police"
                ? `/police/dossiers/${it.dossier.id}/chat`
                : `/tribunal/dossiers/${it.dossier.id}/chat`;
            return (
              <button
                key={it.dossier.id}
                onClick={() => navigate(to)}
                className="w-full text-left stat-card hover:border-primary/40 transition-colors flex items-start gap-3"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">
                      {it.peerName ?? (variant === "police" ? "Procureur (non assigné)" : "Officier")}
                    </p>
                    {it.lastAt && (
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(it.lastAt), { addSuffix: true, locale: fr })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    {it.dossier.reference} · {it.dossier.titre}
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {it.lastMessage ?? "Aucun message"}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
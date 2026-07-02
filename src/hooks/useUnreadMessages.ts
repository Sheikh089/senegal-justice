import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UnreadRow {
  id: string;
  dossier_id: string;
  sender_id: string;
  read_at: string | null;
}

/**
 * Live count of unread messages accessible to the current user.
 * Returns a per-dossier map and the total.
 */
export function useUnreadMessages() {
  const { user } = useAuth();
  const [rows, setRows] = useState<UnreadRow[]>([]);

  useEffect(() => {
    if (!user) {
      setRows([]);
      return;
    }
    let mounted = true;

    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, dossier_id, sender_id, read_at")
        .is("read_at", null)
        .neq("sender_id", user.id);
      if (mounted) setRows((data ?? []) as UnreadRow[]);
    };
    load();

    const channel = supabase
      .channel("unread-messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as UnreadRow;
          if (!m || m.sender_id === user.id || m.read_at) return;
          setRows((prev) => (prev.some((r) => r.id === m.id) ? prev : [...prev, m]));
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as UnreadRow;
          if (!m) return;
          setRows((prev) => {
            const filtered = prev.filter((r) => r.id !== m.id);
            if (m.sender_id !== user.id && !m.read_at) filtered.push(m);
            return filtered;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.old as { id?: string };
          if (!m?.id) return;
          setRows((prev) => prev.filter((r) => r.id !== m.id));
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const perDossier: Record<string, number> = {};
  for (const r of rows) {
    perDossier[r.dossier_id] = (perDossier[r.dossier_id] ?? 0) + 1;
  }
  return { total: rows.length, perDossier };
}
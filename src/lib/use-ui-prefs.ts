import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type TabKey = string;

interface UiPrefs {
  tab_labels: Record<string, string>;
  tab_order: TabKey[];
}

export function useUiPrefs(clientId: string | null) {
  const [prefs, setPrefs] = useState<UiPrefs>({ tab_labels: {}, tab_order: [] });
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!clientId) { setPrefs({ tab_labels: {}, tab_order: [] }); setLoaded(true); return; }
    const { data } = await supabase
      .from("client_ui_prefs" as never)
      .select("tab_labels, tab_order")
      .eq("client_id", clientId)
      .maybeSingle();
    const row = (data as unknown) as UiPrefs | null;
    setPrefs({
      tab_labels: (row?.tab_labels ?? {}) as Record<string, string>,
      tab_order: (row?.tab_order ?? []) as TabKey[],
    });
    setLoaded(true);
  }, [clientId]);

  useEffect(() => {
    refresh();
    if (!clientId) return;
    const ch = supabase
      .channel(`ui-prefs-${clientId}-${Math.random().toString(36).slice(2, 8)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "client_ui_prefs", filter: `client_id=eq.${clientId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId, refresh]);

  const saveLabels = useCallback(async (labels: Record<string, string>) => {
    if (!clientId) return;
    setPrefs((p) => ({ ...p, tab_labels: labels }));
    await supabase.from("client_ui_prefs" as never).upsert({
      client_id: clientId, tab_labels: labels, tab_order: prefs.tab_order, updated_at: new Date().toISOString(),
    } as never, { onConflict: "client_id" });
  }, [clientId, prefs.tab_order]);

  const saveOrder = useCallback(async (order: TabKey[]) => {
    if (!clientId) return;
    setPrefs((p) => ({ ...p, tab_order: order }));
    await supabase.from("client_ui_prefs" as never).upsert({
      client_id: clientId, tab_labels: prefs.tab_labels, tab_order: order, updated_at: new Date().toISOString(),
    } as never, { onConflict: "client_id" });
  }, [clientId, prefs.tab_labels]);

  return { prefs, loaded, saveLabels, saveOrder };
}

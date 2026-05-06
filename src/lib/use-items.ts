import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CHECKLIST, type Category, type ChecklistItem } from "./checklist-data";

export interface CustomItemRow {
  id: string;
  client_id: string;
  category: Category;
  title: string;
  weight: number;
  norma: string | null;
  risco: string | null;
}

export function useItems(clientId: string | null) {
  const [custom, setCustom] = useState<CustomItemRow[]>([]);
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!clientId) {
      setCustom([]);
      setDisabled(new Set());
      setLoaded(true);
      return;
    }
    const [c, d] = await Promise.all([
      supabase.from("custom_items").select("*").eq("client_id", clientId),
      supabase.from("disabled_items").select("item_id").eq("client_id", clientId),
    ]);
    setCustom((c.data ?? []) as CustomItemRow[]);
    setDisabled(new Set((d.data ?? []).map((r: { item_id: string }) => r.item_id)));
    setLoaded(true);
  }, [clientId]);

  useEffect(() => {
    refresh();
    if (!clientId) return;
    const ch = supabase
      .channel(`items-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_items", filter: `client_id=eq.${clientId}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "disabled_items", filter: `client_id=eq.${clientId}` }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clientId, refresh]);

  const items: ChecklistItem[] = [
    ...CHECKLIST.filter((i) => !disabled.has(i.id)),
    ...custom.map<ChecklistItem>((c) => ({
      id: `c_${c.id}`,
      category: c.category,
      title: c.title,
      description: "",
      weight: c.weight,
      norma: c.norma ?? undefined,
      risco: c.risco ?? undefined,
    })),
  ];

  return { items, custom, disabled, loaded, refresh };
}

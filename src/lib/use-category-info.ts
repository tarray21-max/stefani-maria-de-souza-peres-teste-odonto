import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ServiceCategory } from "@/lib/use-service-matrix-items";

export interface CategoryInfo {
  norma: string;
  observacao: string;
}

interface Row {
  category: string;
  norma: string | null;
  observacao: string | null;
}

export function useCategoryInfo(clientId: string | null) {
  const [map, setMap] = useState<Record<string, CategoryInfo>>({});

  const refresh = useCallback(async () => {
    if (!clientId) { setMap({}); return; }
    const { data, error } = await (supabase as any)
      .from("service_category_info")
      .select("category,norma,observacao")
      .eq("client_id", clientId);
    if (error) return;
    const next: Record<string, CategoryInfo> = {};
    for (const r of (data ?? []) as Row[]) {
      next[r.category] = { norma: r.norma ?? "", observacao: r.observacao ?? "" };
    }
    setMap(next);
  }, [clientId]);

  useEffect(() => {
    refresh();
    if (!clientId) return;
    const ch = supabase
      .channel(`service-category-info-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_category_info", filter: `client_id=eq.${clientId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId, refresh]);

  const save = useCallback(async (category: ServiceCategory, info: CategoryInfo) => {
    if (!clientId) throw new Error("Cadastre uma clínica.");
    const { error } = await (supabase as any)
      .from("service_category_info")
      .upsert({ client_id: clientId, category, norma: info.norma, observacao: info.observacao }, { onConflict: "client_id,category" });
    if (error) throw error;
    await refresh();
  }, [clientId, refresh]);

  const get = useCallback((category: ServiceCategory): CategoryInfo => map[category] ?? { norma: "", observacao: "" }, [map]);

  return { get, save };
}

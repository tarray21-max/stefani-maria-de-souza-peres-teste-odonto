import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ServiceItemImage {
  id: string;
  itemId: string;
  path: string;
  url: string;
}

interface Row { id: string; item_id: string; path: string }

const publicUrl = (path: string) => supabase.storage.from("checklist-images").getPublicUrl(path).data.publicUrl;

export function useServiceItemImages(clientId: string | null) {
  const [byItem, setByItem] = useState<Record<string, ServiceItemImage[]>>({});

  const refresh = useCallback(async () => {
    if (!clientId) { setByItem({}); return; }
    const { data, error } = await (supabase as any)
      .from("service_matrix_item_images")
      .select("id,item_id,path")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (error) return;
    const next: Record<string, ServiceItemImage[]> = {};
    for (const r of (data ?? []) as Row[]) {
      const item: ServiceItemImage = { id: r.id, itemId: r.item_id, path: r.path, url: publicUrl(r.path) };
      (next[r.item_id] ??= []).push(item);
    }
    setByItem(next);
  }, [clientId]);

  useEffect(() => {
    refresh();
    if (!clientId) return;
    const ch = supabase
      .channel(`service-item-images-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "service_matrix_item_images", filter: `client_id=eq.${clientId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId, refresh]);

  const upload = useCallback(async (itemId: string, file: File) => {
    if (!clientId) throw new Error("Cadastre uma clínica.");
    const ext = file.name.split(".").pop() || "bin";
    const path = `${clientId}/service-items/${itemId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const up = await supabase.storage.from("checklist-images").upload(path, file, { upsert: false, contentType: file.type });
    if (up.error) throw up.error;
    const ins = await (supabase as any).from("service_matrix_item_images").insert({ client_id: clientId, item_id: itemId, path });
    if (ins.error) throw ins.error;
    await refresh();
  }, [clientId, refresh]);

  const remove = useCallback(async (image: ServiceItemImage) => {
    if (!clientId) return;
    await supabase.storage.from("checklist-images").remove([image.path]).catch(() => undefined);
    const { error } = await (supabase as any).from("service_matrix_item_images").delete().eq("id", image.id);
    if (error) throw error;
    await refresh();
  }, [clientId, refresh]);

  const get = useCallback((itemId: string): ServiceItemImage[] => byItem[itemId] ?? [], [byItem]);

  return { get, upload, remove };
}

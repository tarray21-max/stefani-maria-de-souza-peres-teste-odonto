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
  observacao: string | null;
  penalidade: string | null;
  risco: string | null;
}

export interface ItemOverrideRow {
  client_id: string;
  item_id: string;
  title: string | null;
  weight: number | null;
  norma: string | null;
  observacao: string | null;
  penalidade: string | null;
  risco: string | null;
}

export interface ItemImageRow {
  id: string;
  client_id: string;
  item_id: string;
  path: string;
}

const PUBLIC_URL = (path: string) => supabase.storage.from("checklist-images").getPublicUrl(path).data.publicUrl;

export function useItems(clientId: string | null) {
  const [custom, setCustom] = useState<CustomItemRow[]>([]);
  const [overrides, setOverrides] = useState<Record<string, ItemOverrideRow>>({});
  const [images, setImages] = useState<Record<string, ItemImageRow[]>>({});
  const [disabled, setDisabled] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!clientId) {
      setCustom([]); setDisabled(new Set()); setOverrides({}); setImages({}); setLoaded(true);
      return;
    }
    const [c, d, o, im] = await Promise.all([
      supabase.from("custom_items").select("*").eq("client_id", clientId),
      supabase.from("disabled_items").select("item_id").eq("client_id", clientId),
      supabase.from("item_overrides").select("*").eq("client_id", clientId),
      supabase.from("item_images").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
    ]);
    setCustom((c.data ?? []) as unknown as CustomItemRow[]);
    setDisabled(new Set((d.data ?? []).map((r: { item_id: string }) => r.item_id)));
    const ov: Record<string, ItemOverrideRow> = {};
    for (const row of (o.data ?? []) as unknown as ItemOverrideRow[]) ov[row.item_id] = row;
    setOverrides(ov);
    const imap: Record<string, ItemImageRow[]> = {};
    for (const row of (im.data ?? []) as ItemImageRow[]) {
      imap[row.item_id] = imap[row.item_id] ?? [];
      imap[row.item_id].push(row);
    }
    setImages(imap);
    setLoaded(true);
  }, [clientId]);

  useEffect(() => {
    refresh();
    if (!clientId) return;
    const ch = supabase
      .channel(`items-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_items", filter: `client_id=eq.${clientId}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "disabled_items", filter: `client_id=eq.${clientId}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "item_overrides", filter: `client_id=eq.${clientId}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "item_images", filter: `client_id=eq.${clientId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [clientId, refresh]);

  const applyOverride = (it: ChecklistItem): ChecklistItem => {
    const ov = overrides[it.id];
    if (!ov) return it;
    return {
      ...it,
      title: ov.title ?? it.title,
      weight: ov.weight ?? it.weight,
      norma: ov.norma ?? it.norma,
      observacao: ov.observacao ?? it.observacao,
      penalidade: ov.penalidade ?? it.penalidade,
      risco: ov.risco ?? it.risco,
    };
  };

  const items: ChecklistItem[] = [
    ...CHECKLIST.filter((i) => !disabled.has(i.id)).map(applyOverride),
    ...custom.map<ChecklistItem>((c) => ({
      id: `c_${c.id}`,
      category: c.category,
      title: c.title,
      description: "",
      weight: c.weight,
      norma: c.norma ?? undefined,
      observacao: c.observacao ?? undefined,
      penalidade: c.penalidade ?? undefined,
      risco: c.risco ?? undefined,
    })),
  ];

  const imageUrlsFor = (itemId: string): { id: string; url: string; path: string }[] =>
    (images[itemId] ?? []).map((r) => ({ id: r.id, path: r.path, url: PUBLIC_URL(r.path) }));

  return { items, custom, disabled, overrides, images, loaded, refresh, imageUrlsFor };
}

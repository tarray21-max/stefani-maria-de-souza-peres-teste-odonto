import { useCallback, useEffect, useState } from "react";
import type { Category } from "./checklist-data";
import { supabase } from "@/integrations/supabase/client";

export interface Block {
  id: string;
  name: string;
  itemIds: string[];
}

const storageKey = (clientId: string, category: Category) => `blocks:v6:${clientId}:${category}`;
const blockId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
// Remove caches antigos (v2..v5) que podem conter IDs de blocos pertencentes a outras categorias
// e causar vazamento entre seções (ex.: TCLE×POP "matriz" vs. "fora da matriz").
const purgeLegacyCaches = (clientId: string, category: Category) => {
  if (typeof window === "undefined") return;
  for (const v of ["v2", "v3", "v4", "v5"]) {
    try { localStorage.removeItem(`blocks:${v}:${clientId}:${category}`); } catch { /* ignore */ }
  }
};

interface BlockRow { id: string; name: string; item_ids: string[]; position: number }

export function useBlocks(clientId: string | null, category: Category, categoryItemIds: string[]) {
  const key = clientId ? storageKey(clientId, category) : null;
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const loadFromDb = useCallback(async () => {
    if (!clientId || !key) return false;
    const { data, error } = await (supabase as any)
      .from("checklist_blocks")
      .select("id,name,item_ids,position")
      .eq("client_id", clientId)
      .eq("category", category)
      .order("position", { ascending: true });
    if (!error && data && data.length > 0) {
      const next = (data as BlockRow[]).map((r) => ({ id: r.id, name: r.name, itemIds: r.item_ids ?? [] }));
      setBlocks(next);
      localStorage.setItem(key, JSON.stringify(next));
      setHydrated(true);
      return true;
    }
    return false;
  }, [clientId, category, key]);

  // 1) Carrega do banco; localStorage fica apenas como fallback/migração local.
  useEffect(() => {
    if (!key) { setBlocks([]); setHydrated(false); return; }
    let cancelled = false;
    setHydrated(false);
    void (async () => {
      const ok = await loadFromDb();
      if (cancelled || ok) return;
      const raw = typeof window !== "undefined"
        ? localStorage.getItem(key) ?? legacyStorageKeys(clientId!, category).map((k) => localStorage.getItem(k)).find(Boolean) ?? null
        : null;
      if (raw) {
        try {
          const next = normalizeBlocks(JSON.parse(raw) as Block[]);
          setBlocks(next);
          localStorage.setItem(key, JSON.stringify(next));
          if (next.length) void (supabase as any).from("checklist_blocks").upsert(next.map((b, position) => ({ id: b.id, client_id: clientId, category, name: b.name, item_ids: b.itemIds, position })), { onConflict: "id" });
          setHydrated(true);
          return;
        } catch { /* ignore */ }
      }
      setBlocks([]);
      setHydrated(false);
    })();
    return () => { cancelled = true; };
  }, [key, clientId, category, loadFromDb]);

  // Realtime: recarrega quando outro membro altera blocos da mesma clínica/categoria
  useEffect(() => {
    if (!clientId) return;
    const suffix = Math.random().toString(36).slice(2, 8);
    const ch = (supabase as any).channel(`checklist_blocks-${clientId}-${category}-${suffix}`);
    ch.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "checklist_blocks", filter: `client_id=eq.${clientId}` },
      () => { void loadFromDb(); },
    );
    ch.subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [clientId, category, loadFromDb]);


  // 2) Semeia uma única vez quando os itens carregam e não há nada salvo
  useEffect(() => {
    if (!key || hydrated) return;
    if (categoryItemIds.length === 0) return;
    const seed: Block[] = category === "documentacao"
      ? [{
          id: blockId(),
          name: "Bloco 1",
          itemIds: categoryItemIds.slice(0, 8),
        }]
      : [];
    setBlocks(seed);
    if (seed.length) {
      localStorage.setItem(key, JSON.stringify(seed));
      void (supabase as any).from("checklist_blocks").upsert(seed.map((b, position) => ({ id: b.id, client_id: clientId, category, name: b.name, item_ids: b.itemIds, position })), { onConflict: "id" });
    }
    setHydrated(true);
  }, [key, hydrated, categoryItemIds, category, clientId]);

  const persist = useCallback((next: Block[]) => {
    setBlocks(next);
    if (key) localStorage.setItem(key, JSON.stringify(next));
    if (clientId) {
      void (async () => {
        await (supabase as any).from("checklist_blocks").delete().eq("client_id", clientId).eq("category", category).not("id", "in", `(${next.map((b) => b.id).join(",") || "00000000-0000-0000-0000-000000000000"})`);
        if (next.length) await (supabase as any).from("checklist_blocks").upsert(next.map((b, position) => ({ id: b.id, client_id: clientId, category, name: b.name, item_ids: b.itemIds, position })), { onConflict: "id" });
      })();
    }
  }, [key, clientId, category]);

  const addBlock = useCallback((name = "Novo bloco"): string => {
    const id = blockId();
    persist([...blocks, { id, name, itemIds: [] }]);
    return id;
  }, [blocks, persist]);

  const renameBlock = useCallback((id: string, name: string) => {
    persist(blocks.map((b) => (b.id === id ? { ...b, name } : b)));
  }, [blocks, persist]);

  const deleteBlock = useCallback((id: string) => {
    persist(blocks.filter((b) => b.id !== id));
  }, [blocks, persist]);

  const moveBlock = useCallback((id: string, direction: -1 | 1) => {
    const idx = blocks.findIndex((b) => b.id === id);
    const to = idx + direction;
    if (idx < 0 || to < 0 || to >= blocks.length) return;
    const next = [...blocks];
    const [moved] = next.splice(idx, 1);
    next.splice(to, 0, moved);
    persist(next);
  }, [blocks, persist]);

  const moveItemToBlock = useCallback((itemId: string, blockId: string | null) => {
    const cleaned = blocks.map((b) => ({ ...b, itemIds: b.itemIds.filter((id) => id !== itemId) }));
    if (!blockId) return persist(cleaned);
    persist(cleaned.map((b) => (b.id === blockId ? { ...b, itemIds: [...b.itemIds, itemId] } : b)));
  }, [blocks, persist]);

  const blockOfItem = useCallback((itemId: string): Block | null => {
    return blocks.find((b) => b.itemIds.includes(itemId)) ?? null;
  }, [blocks]);

  return { blocks, addBlock, renameBlock, deleteBlock, moveBlock, moveItemToBlock, blockOfItem };
}

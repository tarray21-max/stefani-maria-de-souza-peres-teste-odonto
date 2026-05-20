import { useCallback, useEffect, useState } from "react";
import type { Category } from "./checklist-data";

export interface Block {
  id: string;
  name: string;
  itemIds: string[];
}

// v2: a semente agora respeita a ordem atual do usuário (não a ordem original).
const storageKey = (clientId: string, category: Category) => `blocks:v2:${clientId}:${category}`;

export function useBlocks(clientId: string | null, category: Category, categoryItemIds: string[]) {
  const key = clientId ? storageKey(clientId, category) : null;
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // 1) Carrega do localStorage quando muda chave
  useEffect(() => {
    if (!key) { setBlocks([]); setHydrated(false); return; }
    const raw = typeof window !== "undefined" ? localStorage.getItem(key) : null;
    if (raw) {
      try { setBlocks(JSON.parse(raw) as Block[]); setHydrated(true); return; } catch { /* ignore */ }
    }
    setBlocks([]);
    setHydrated(false);
  }, [key]);

  // 2) Semeia uma única vez quando os itens carregam e não há nada salvo
  useEffect(() => {
    if (!key || hydrated) return;
    if (categoryItemIds.length === 0) return;
    const seed: Block[] = category === "documentacao"
      ? [{
          id: `b_${Date.now()}`,
          name: "Bloco 1",
          itemIds: categoryItemIds.slice(0, 8),
        }]
      : [];
    setBlocks(seed);
    if (seed.length) localStorage.setItem(key, JSON.stringify(seed));
    setHydrated(true);
  }, [key, hydrated, categoryItemIds, category]);

  const persist = useCallback((next: Block[]) => {
    setBlocks(next);
    if (key) localStorage.setItem(key, JSON.stringify(next));
  }, [key]);

  const addBlock = useCallback((name = "Novo bloco"): string => {
    const id = `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    persist([...blocks, { id, name, itemIds: [] }]);
    return id;
  }, [blocks, persist]);

  const renameBlock = useCallback((id: string, name: string) => {
    persist(blocks.map((b) => (b.id === id ? { ...b, name } : b)));
  }, [blocks, persist]);

  const deleteBlock = useCallback((id: string) => {
    persist(blocks.filter((b) => b.id !== id));
  }, [blocks, persist]);

  const moveItemToBlock = useCallback((itemId: string, blockId: string | null) => {
    const cleaned = blocks.map((b) => ({ ...b, itemIds: b.itemIds.filter((id) => id !== itemId) }));
    if (!blockId) return persist(cleaned);
    persist(cleaned.map((b) => (b.id === blockId ? { ...b, itemIds: [...b.itemIds, itemId] } : b)));
  }, [blocks, persist]);

  const blockOfItem = useCallback((itemId: string): Block | null => {
    return blocks.find((b) => b.itemIds.includes(itemId)) ?? null;
  }, [blocks]);

  return { blocks, addBlock, renameBlock, deleteBlock, moveItemToBlock, blockOfItem };
}

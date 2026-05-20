import { useCallback, useEffect, useState } from "react";
import type { Category } from "./checklist-data";

export interface Block {
  id: string;
  name: string;
  itemIds: string[];
}

const storageKey = (clientId: string, category: Category) => `blocks:${clientId}:${category}`;

// Sementes automáticas para categorias com agrupamento sugerido
function defaultBlocks(category: Category): Block[] {
  if (category === "documentacao") {
    return [
      {
        id: `b_${Date.now()}`,
        name: "Bloco 1",
        itemIds: ["doc1", "doc2", "doc3", "doc4", "doc5", "doc6", "doc7", "doc8"],
      },
    ];
  }
  return [];
}

export function useBlocks(clientId: string | null, category: Category) {
  const key = clientId ? storageKey(clientId, category) : null;

  const [blocks, setBlocks] = useState<Block[]>(() => {
    if (typeof window === "undefined" || !key) return [];
    const raw = localStorage.getItem(key);
    if (raw) {
      try { return JSON.parse(raw) as Block[]; } catch { /* ignore */ }
    }
    return defaultBlocks(category);
  });

  // Garante seed quando muda de cliente/categoria
  useEffect(() => {
    if (!key) { setBlocks([]); return; }
    const raw = localStorage.getItem(key);
    if (raw) {
      try { setBlocks(JSON.parse(raw) as Block[]); return; } catch { /* ignore */ }
    }
    const seed = defaultBlocks(category);
    setBlocks(seed);
    if (seed.length) localStorage.setItem(key, JSON.stringify(seed));
  }, [key, category]);

  const persist = useCallback((next: Block[]) => {
    setBlocks(next);
    if (key) localStorage.setItem(key, JSON.stringify(next));
  }, [key]);

  const addBlock = useCallback((name = "Novo bloco") => {
    const b: Block = { id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name, itemIds: [] };
    persist([...blocks, b]);
  }, [blocks, persist]);

  const renameBlock = useCallback((id: string, name: string) => {
    persist(blocks.map((b) => (b.id === id ? { ...b, name } : b)));
  }, [blocks, persist]);

  const deleteBlock = useCallback((id: string) => {
    persist(blocks.filter((b) => b.id !== id));
  }, [blocks, persist]);

  /** Move um item para `blockId` (ou null = sem bloco). Remove de qualquer outro bloco. */
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

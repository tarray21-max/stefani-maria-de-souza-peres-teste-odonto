import { useEffect, useMemo, useRef, useState } from "react";
import type { Answer, Category, ChecklistItem, Quality, ResponseMap } from "@/lib/checklist-data";
import { getValidityStatus, type ValidityStatus } from "@/lib/checklist-data";
import { Check, X, MinusCircle, Search, MessageSquare, Image as ImageIcon, Plus, Trash2, Pencil, Upload, Eraser, GripVertical, MoreVertical, FolderPlus, FolderInput, ArrowUp, ArrowDown, CalendarClock, Infinity as InfinityIcon, Copy } from "lucide-react";
import { CopyDestinationDialog } from "@/components/CopyDestinationDialog";
import { copyChecklistBlock, copyChecklistItem } from "@/lib/copy-utils";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useBlocks, type Block } from "@/lib/use-blocks";

type FilterKind = "all" | "answered" | "unanswered" | "nao" | "sim" | "na";

const FILTERS: { value: FilterKind; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "unanswered", label: "Pendentes" },
  { value: "answered", label: "Respondidos" },
  { value: "sim", label: "Conformes" },
  { value: "nao", label: "Não conformes" },
  { value: "na", label: "N/A" },
];

interface ImageEntry { id: string; url: string; path: string }

interface Props {
  category: Category;
  items: ChecklistItem[];
  answers: ResponseMap;
  setAnswer: (id: string, value: Answer) => void;
  setQuality?: (id: string, quality: Quality) => void;
  setJustification?: (id: string, value: string) => void;
  setValidity?: (id: string, validity: { date: string | null; indeterminate: boolean }) => void;
  clientId: string | null;
  onItemsChange?: () => void;
  imageUrlsFor?: (itemId: string) => ImageEntry[];
  positions?: Record<string, number>;
  reorderCategory?: (orderedItems: ChecklistItem[]) => Promise<void> | void;
  readOnly?: boolean;
}

const OPTIONS: { value: Exclude<Answer, null>; label: string; icon: typeof Check; activeClass: string }[] = [
  { value: "sim", label: "Sim", icon: Check, activeClass: "bg-success text-white border-success" },
  { value: "nao", label: "Não", icon: X, activeClass: "bg-danger text-white border-danger" },
  { value: "na", label: "N/A", icon: MinusCircle, activeClass: "bg-muted-foreground text-white border-muted-foreground" },
];

export function ChecklistSection({ category, items: allItems, answers, setAnswer, setQuality, setJustification, setValidity, clientId, onItemsChange, imageUrlsFor, positions, reorderCategory, readOnly }: Props) {
  const [renameBlockId, setRenameBlockId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [imageItem, setImageItem] = useState<ChecklistItem | null>(null);
  const [editItem, setEditItem] = useState<ChecklistItem | null>(null);
  /** undefined = não está adicionando; null = sem bloco; string = id do bloco alvo */
    const [addInBlockId, setAddInBlockId] = useState<string | null | undefined>(undefined);
    const [deleteItem, setDeleteItem] = useState<ChecklistItem | null>(null);
    const [dragId, setDragId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
    const [copyItem, setCopyItem] = useState<ChecklistItem | null>(null);
    const [copyBlockId, setCopyBlockId] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKind>("all");

  const items = useMemo(() => allItems.filter((i) => i.category === category), [allItems, category]);

  // IDs ordenados conforme a ordem natural (posições manuais quando existem, senão ordem original)
  const naturalOrderedIds = useMemo(() => {
    if (positions && items.some((i) => i.id in positions)) {
      return [...items].sort((a, b) => (positions[a.id] ?? 1e9) - (positions[b.id] ?? 1e9)).map((i) => i.id);
    }
    return items.map((i) => i.id);
  }, [items, positions]);

  const { blocks, addBlock, renameBlock, deleteBlock, moveBlock, moveItemToBlock, blockOfItem } = useBlocks(clientId, category, naturalOrderedIds);

  // Se houver qualquer posição manual nesta categoria, respeita-a;
  // caso contrário, aplica a ordenação automática (Não no topo, N/A no fim).
  const hasManual = useMemo(
    () => items.some((i) => positions && i.id in positions),
    [items, positions],
  );

  const matchesFilter = (it: ChecklistItem): boolean => {
    const a = answers[it.id]?.answer;
    switch (filter) {
      case "answered": return !!a;
      case "unanswered": return !a;
      case "sim": return a === "sim";
      case "nao": return a === "nao";
      case "na": return a === "na";
      default: return true;
    }
  };

  const ordered = useMemo(() => {
    const base = items.filter(matchesFilter);
    const filtered = query ? base.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())) : base;
    if (hasManual && positions) {
      const POS = (id: string) => (id in positions ? positions[id] : Number.MAX_SAFE_INTEGER);
      return [...filtered].sort((a, b) => {
        const pa = POS(a.id);
        const pb = POS(b.id);
        if (pa !== pb) return pa - pb;
        return a.title.localeCompare(b.title, "pt-BR");
      });
    }
    const rank = (a: Answer | undefined) => {
      if (a === "nao") return 0;
      if (a === "na") return 2;
      return 1;
    };
    return [...filtered].sort((a, b) => {
      const ra = rank(answers[a.id]?.answer);
      const rb = rank(answers[b.id]?.answer);
      if (ra !== rb) return ra - rb;
      if (ra === 0) return b.weight - a.weight;
      return a.title.localeCompare(b.title, "pt-BR");
    });
  }, [items, answers, query, hasManual, positions]);

  const answered = items.filter((i) => answers[i.id]?.answer).length;
  const naoCount = items.filter((i) => answers[i.id]?.answer === "nao").length;

  const handleClickOption = (id: string, value: Exclude<Answer, null>) => {
    const current = answers[id]?.answer;
    setAnswer(id, current === value ? null : value);
  };

  const handleClear = (id: string) => {
    setAnswer(id, null);
  };

  const confirmDelete = async () => {
    if (!deleteItem || !clientId) return;
    const item = deleteItem;
    setDeleteItem(null);
    if (item.id.startsWith("c_")) {
      const { error } = await supabase.from("custom_items").delete().eq("id", item.id.slice(2));
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("disabled_items").insert({ client_id: clientId, item_id: item.id });
      if (error) return toast.error(error.message);
    }
    await supabase.from("responses").delete().eq("client_id", clientId).eq("item_id", item.id);
    toast.success("Pergunta excluída");
    onItemsChange?.();
  };

  const handleDrop = async (targetId: string) => {
    if (!dragId || !reorderCategory || dragId === targetId) {
      setDragId(null); setOverId(null); return;
    }
    // Reordena na base da lista completa (não filtrada) para preservar busca.
    const full = hasManual && positions
      ? [...items].sort((a, b) => (positions[a.id] ?? 1e9) - (positions[b.id] ?? 1e9))
      : ordered;
    const ids = full.map((i) => i.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) { setDragId(null); setOverId(null); return; }
    const next = [...full];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null); setOverId(null);
    try {
      await reorderCategory(next);
    } catch {
      toast.error("Não foi possível salvar a nova ordem. Tente novamente.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-2 text-xs">
        <div className="text-muted-foreground">
          {items.length} itens • <span className="font-medium text-foreground">{answered} respondidos</span>
          {naoCount > 0 && <span className="ml-2 text-danger font-medium">• {naoCount} não conformes</span>}
          {hasManual && <span className="ml-2 text-primary">• ordem personalizada</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 rounded-md bg-primary/5 border border-primary/15 p-0.5">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFilter(f.value)}
                className={cn(
                  "px-2 h-7 rounded text-[11px] font-medium transition-colors",
                  filter === f.value
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-primary",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar item…" className="h-8 pl-7 text-xs" />
          </div>
          {!readOnly && clientId && (
            <Button size="sm" variant="outline" className="h-8" onClick={() => addBlock(`Bloco ${blocks.length + 1}`)} title="Criar novo bloco">
              <FolderPlus className="w-3 h-3 mr-1" /> Novo bloco
            </Button>
          )}
        </div>
      </div>

      {(() => {
        // Particiona `ordered` em blocos + leftover preservando ordem original dentro do bloco
        const groups: { block: Block | null; items: ChecklistItem[] }[] = [];
        const usedIds = new Set<string>();

        for (const b of blocks) {
          const blockSet = new Set(b.itemIds);
          // Respeita a ordem global (`ordered`) também dentro do bloco,
          // para que o drag-and-drop com reorderCategory tenha efeito visível.
          const items = ordered.filter((i) => blockSet.has(i.id));
          items.forEach((i) => usedIds.add(i.id));
          groups.push({ block: b, items });
        }
        const leftover = ordered.filter((i) => !usedIds.has(i.id));
        if (blocks.length === 0) {
          groups.push({ block: null, items: leftover });
        } else if (leftover.length) {
          groups.push({ block: null, items: leftover });
        }

        let runningIdx = 0;
        return (
          <div className="space-y-4">
            {groups.map((g, gi) => {
              const isLeftover = !g.block;
              return (
                <div key={g.block?.id ?? `__leftover_${gi}`} className="rounded-lg border border-border/60 bg-card overflow-hidden">
                  {(g.block || !readOnly) && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border/60">
                      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{isLeftover ? "Sem bloco" : "Bloco"}</span>
                      <span className="font-semibold text-sm text-foreground flex-1 truncate">
                        {isLeftover ? "Demais perguntas" : g.block!.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground">{g.items.length} itens</span>
                      {g.block && !readOnly && (
                        <>
                          <button
                            type="button"
                            title="Mover bloco para cima"
                            onClick={() => moveBlock(g.block!.id, -1)}
                            disabled={gi === 0}
                            className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Mover bloco para baixo"
                            onClick={() => moveBlock(g.block!.id, 1)}
                            disabled={gi >= blocks.length - 1}
                            className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Renomear bloco"
                            onClick={() => { setRenameBlockId(g.block!.id); setRenameDraft(g.block!.name); }}
                            className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Copiar bloco para outra clínica/painel"
                            onClick={() => setCopyBlockId(g.block!.id)}
                            className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Excluir bloco (mantém as perguntas)"
                            onClick={() => setDeleteBlockId(g.block!.id)}
                            className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-danger hover:bg-danger/10"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                      {!readOnly && clientId && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 ml-1"
                          onClick={() => setAddInBlockId(g.block ? g.block.id : null)}
                          title={g.block ? `Adicionar pergunta em "${g.block.name}"` : "Adicionar pergunta"}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Novo
                        </Button>
                      )}
                    </div>
                  )}
                  <ul className="divide-y divide-border/60">
                    {g.items.length === 0 ? (
                      <li className="px-3 py-4 text-center text-xs text-muted-foreground italic">Nenhuma pergunta neste bloco. Use o menu de cada item para movê-la para cá.</li>
                    ) : g.items.map((item) => {
                      const idx = runningIdx++;
                      const resp = answers[item.id];
                      const current = resp?.answer ?? null;
                      const quality = resp?.quality ?? null;
                      const isNa = current === "na";
                      const isNao = current === "nao";
                      const isSim = current === "sim";
                      const isOpen = openId === item.id;
                      const imgs = imageUrlsFor?.(item.id) ?? [];
                      const isDragging = dragId === item.id;
                      const isOver = overId === item.id && dragId && dragId !== item.id;
                      const canDrag = !readOnly && !!reorderCategory && !!clientId;
                      const currentBlock = blockOfItem(item.id);
                      return (
                        <li
                          key={item.id}
                          onDragEnter={(e) => {
                            if (!canDrag) return;
                            e.preventDefault();
                            if (dragId && dragId !== item.id) setOverId(item.id);
                          }}
                          onDragOver={(e) => { if (canDrag && dragId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
                          onDragLeave={() => { if (overId === item.id) setOverId(null); }}
                          onDrop={(e) => { if (canDrag) { e.preventDefault(); handleDrop(item.id); } }}
                          onDragEnd={() => { setDragId(null); setOverId(null); }}
                          className={cn(
                            "transition-all duration-200 ease-out",
                            isNa && "opacity-40 hover:opacity-100",
                            isNao && "bg-danger/5",
                            isDragging && "opacity-50",
                            isOver && "bg-primary/10 outline outline-1 outline-primary/40",
                          )}
                        >
                          <div className="flex items-center gap-1.5 px-2 py-1.5">
                            {canDrag && (
                              <span
                                title="Arrastar para reordenar"
                                draggable
                                onDragStart={(e) => {
                                  setDragId(item.id);
                                  e.dataTransfer.effectAllowed = "move";
                                  e.dataTransfer.setData("text/plain", item.id);
                                }}
                                onDragEnd={() => { setDragId(null); setOverId(null); }}
                                className="flex-shrink-0 w-5 h-6 inline-flex items-center justify-center text-muted-foreground hover:text-primary cursor-grab active:cursor-grabbing select-none"
                              >
                                <GripVertical className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <span
                              className={cn(
                                "flex-shrink-0 w-6 h-5 rounded font-semibold flex items-center justify-center text-[10px]",
                                isNao ? "bg-danger text-white" : "bg-primary/10 text-primary",
                              )}
                              title="Posição neste grupo"
                            >
                              {idx + 1}
                            </span>

                            {!readOnly && clientId ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <button
                                    type="button"
                                    title="Ações"
                                    className="flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10"
                                  >
                                    <MoreVertical className="w-3.5 h-3.5" />
                                  </button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-52">
                                  <DropdownMenuItem onClick={() => setEditItem(item)}>
                                    <Pencil className="w-3.5 h-3.5 mr-2" /> Editar pergunta
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleClear(item.id)} disabled={!current}>
                                    <Eraser className="w-3.5 h-3.5 mr-2" /> Limpar resposta
                                  </DropdownMenuItem>
                                  <DropdownMenuSub>
                                    <DropdownMenuSubTrigger>
                                      <FolderInput className="w-3.5 h-3.5 mr-2" /> Mover para bloco
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuSubContent>
                                      <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Blocos</DropdownMenuLabel>
                                      {blocks.length === 0 && (
                                        <DropdownMenuItem disabled>Nenhum bloco criado</DropdownMenuItem>
                                      )}
                                      {blocks.map((b) => (
                                        <DropdownMenuItem
                                          key={b.id}
                                          onClick={() => moveItemToBlock(item.id, b.id)}
                                          disabled={currentBlock?.id === b.id}
                                        >
                                          {b.name}{currentBlock?.id === b.id ? " ✓" : ""}
                                        </DropdownMenuItem>
                                      ))}
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={() => moveItemToBlock(item.id, null)} disabled={!currentBlock}>
                                        Remover do bloco
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => addBlock(`Bloco ${blocks.length + 1}`)}>
                                        <FolderPlus className="w-3.5 h-3.5 mr-2" /> Novo bloco…
                                      </DropdownMenuItem>
                                    </DropdownMenuSubContent>
                                  </DropdownMenuSub>
                                  <DropdownMenuItem onClick={() => setCopyItem(item)}>
                                    <Copy className="w-3.5 h-3.5 mr-2" /> Copiar para…
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => setDeleteItem(item)} className="text-danger focus:text-danger">
                                    <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir pergunta
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}

                            <button type="button" onClick={() => setImageItem(item)} className="flex-1 min-w-0 text-sm text-foreground leading-tight truncate text-left hover:text-primary pl-1" title={item.title}>
                              {item.title}
                            </button>

                            {isSim && setQuality && (
                              <button
                                type="button"
                                title={quality === "ruim" ? "Marcado como Ruim — pontua 50%. Clique para voltar a Bom." : "Marcar implementação como Ruim (pontua 50%)"}
                                onClick={() => setQuality(item.id, quality === "ruim" ? "bom" : "ruim")}
                                className={cn(
                                  "flex-shrink-0 inline-flex items-center px-1.5 h-6 rounded text-[10px] font-semibold transition-colors",
                                  quality === "ruim" ? "bg-amber-500 text-white" : "text-muted-foreground hover:bg-muted",
                                )}
                              >
                                {quality === "ruim" ? "Ruim 50%" : "Bom"}
                              </button>
                            )}

                            {setValidity && (
                              <ValidityControl
                                value={{ date: resp?.validity_date ?? null, indeterminate: resp?.validity_indeterminate ?? false }}
                                onChange={(v) => setValidity(item.id, v)}
                                readOnly={readOnly}
                              />
                            )}

                            {setJustification && (
                              <button type="button" title="Justificativa" onClick={() => setOpenId(isOpen ? null : item.id)}
                                className={cn("flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary", isOpen && "bg-primary text-white", resp?.justification && !isOpen && "text-primary")}>
                                <MessageSquare className="w-3 h-3" />
                              </button>
                            )}

                            <div className="flex gap-1 flex-shrink-0 ml-1">
                              {OPTIONS.map((opt) => {
                                const Icon = opt.icon;
                                const active = current === opt.value;
                                return (
                                  <button key={opt.value} type="button" onClick={() => !readOnly && handleClickOption(item.id, opt.value)}
                                    title={active ? `${opt.label} (clique para desmarcar)` : opt.label}
                                    className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium transition-all border-border bg-background hover:border-primary/40", active && opt.activeClass)}>
                                    <Icon className="w-3 h-3" />
                                    {opt.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {isOpen && setJustification && (
                            <div className="px-3 pb-3 pt-1">
                              <Textarea value={resp?.justification ?? ""} onChange={(e) => setJustification(item.id, e.target.value)} placeholder="Descreva como o item está implementado, evidências, pendências…" className="text-xs min-h-[60px]" />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            {ordered.length === 0 && <div className="rounded-lg border border-border/60 bg-card px-3 py-6 text-center text-sm text-muted-foreground">Nenhum item encontrado.</div>}
          </div>
        );
      })()}

      <ItemImageDialog item={imageItem} onClose={() => setImageItem(null)} clientId={clientId} images={imageItem ? imageUrlsFor?.(imageItem.id) ?? [] : []} readOnly={readOnly} onImageClick={setLightboxUrl} onEdit={(it) => { setImageItem(null); setEditItem(it); }} />
      <ItemFormDialog
        open={addInBlockId !== undefined}
        onClose={() => setAddInBlockId(undefined)}
        category={category}
        clientId={clientId}
        onSaved={(newId) => {
          if (newId && addInBlockId) {
            moveItemToBlock(`c_${newId}`, addInBlockId);
          }
          setAddInBlockId(undefined);
          onItemsChange?.();
        }}
      />
      <ItemFormDialog open={!!editItem} onClose={() => setEditItem(null)} category={category} clientId={clientId} item={editItem} onSaved={() => { setEditItem(null); onItemsChange?.(); }} />

      <Dialog open={!!renameBlockId} onOpenChange={(o) => !o && setRenameBlockId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renomear bloco</DialogTitle></DialogHeader>
          <Input value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} placeholder="Nome do bloco" autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameBlockId(null)}>Cancelar</Button>
            <Button onClick={() => {
              if (renameBlockId && renameDraft.trim()) renameBlock(renameBlockId, renameDraft.trim());
              setRenameBlockId(null);
            }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteBlockId} onOpenChange={(o) => !o && setDeleteBlockId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloco?</AlertDialogTitle>
            <AlertDialogDescription>
              O bloco será removido, mas as perguntas continuam no checklist (em "Demais perguntas").
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteBlockId) deleteBlock(deleteBlockId); setDeleteBlockId(null); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir pergunta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir permanentemente esta pergunta do seu checklist? Esta ação não pode ser desfeita.
              <br /><br />
              <span className="font-medium text-foreground">{deleteItem?.title}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-danger text-white hover:bg-danger/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {lightboxUrl && (
        <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="Ampliado" className="max-w-full max-h-full object-contain rounded shadow-2xl" />
        </div>
      )}
      {clientId && (
        <CopyDestinationDialog
          open={!!copyItem}
          onClose={() => setCopyItem(null)}
          title="Copiar pergunta"
          description={copyItem ? `“${copyItem.title}” será copiada para o destino (com norma, observação, penalidade e imagens).` : undefined}
          category={category}
          sourceClientId={clientId}
          onConfirm={async (targetClientId, targetBlockId) => {
            if (!copyItem) return;
            await copyChecklistItem({
              sourceItemId: copyItem.id,
              sourceClientId: clientId,
              targetClientId,
              category,
              targetBlockId,
            });
          }}
        />
      )}
      {clientId && (
        <CopyDestinationDialog
          open={!!copyBlockId}
          onClose={() => setCopyBlockId(null)}
          title="Copiar bloco"
          description="Um novo bloco será criado no destino com todas as perguntas duplicadas."
          category={category}
          sourceClientId={clientId}
          allowBlockPick={false}
          onConfirm={async (targetClientId) => {
            if (!copyBlockId) return;
            await copyChecklistBlock({
              sourceBlockId: copyBlockId,
              sourceClientId: clientId,
              targetClientId,
              category,
            });
          }}
        />
      )}
    </div>
  );
}


function ItemImageDialog({ item, onClose, clientId, images, readOnly, onEdit, onImageClick }: {
  item: ChecklistItem | null; onClose: () => void; clientId: string | null; images: ImageEntry[]; readOnly?: boolean; onEdit?: (it: ChecklistItem) => void; onImageClick?: (url: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!clientId || !item) return;
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${clientId}/${item.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("checklist-images").upload(path, file, { upsert: false });
    if (error) { setBusy(false); return toast.error(error.message); }
    const { error: dbErr } = await supabase.from("item_images").insert({ client_id: clientId, item_id: item.id, path });
    setBusy(false);
    if (dbErr) return toast.error(dbErr.message);
    toast.success("Imagem enviada");
  };

  const remove = async (img: ImageEntry) => {
    await supabase.storage.from("checklist-images").remove([img.path]);
    await supabase.from("item_images").delete().eq("id", img.id);
    toast.success("Imagem removida");
  };

  const renderField = (label: string, value: string | undefined, tone: "default" | "danger" = "default") => (
    <div className="rounded-md border border-border/60 bg-muted/30 p-3">
      <div className={cn("text-[10px] font-semibold uppercase tracking-wider mb-1", tone === "danger" ? "text-danger" : "text-primary")}>{label}</div>
      {value ? (
        <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{value}</p>
      ) : (
        <p className="text-xs italic text-muted-foreground">Não preenchido — clique em "Editar detalhes" para adicionar.</p>
      )}
    </div>
  );

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="pr-8">{item?.title}</DialogTitle></DialogHeader>
        {images.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((img) => (
              <div key={img.id} className="relative group aspect-video rounded-lg overflow-hidden border border-border bg-muted cursor-zoom-in" onClick={() => onImageClick?.(img.url)}>
                <img src={img.url} alt="Referência" className="w-full h-full object-cover" />
                {!readOnly && clientId && (
                  <button type="button" onClick={(e) => { e.stopPropagation(); remove(img); }} title="Remover" className="absolute top-2 right-2 w-7 h-7 rounded-full bg-background/90 text-destructive opacity-0 group-hover:opacity-100 flex items-center justify-center shadow-sm">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/40 aspect-video flex flex-col items-center justify-center text-center p-6">
            <ImageIcon className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma imagem de referência ainda.</p>
            {item?.referencia && <p className="text-xs text-muted-foreground mt-2 italic max-w-md">{item.referencia}</p>}
          </div>
        )}
        <div className="space-y-2 mt-2">
          {renderField("Norma técnica", item?.norma)}
          {renderField("Observação", item?.observacao)}
          {renderField("Penalidade", item?.penalidade, "danger")}
          {item?.risco && renderField("Consequência", item.risco, "danger")}
        </div>
        {!readOnly && clientId && (
          <DialogFooter className="gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            {onEdit && item && (
              <Button variant="outline" onClick={() => onEdit(item)}>
                <Pencil className="w-3.5 h-3.5 mr-1" /> Editar detalhes
              </Button>
            )}
            <Button onClick={() => fileRef.current?.click()} disabled={busy}>
              <Upload className="w-3.5 h-3.5 mr-1" /> {busy ? "Enviando…" : "Adicionar imagem"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}


function ItemFormDialog({ open, onClose, category, clientId, item, onSaved }: {
  open: boolean; onClose: () => void; category: Category; clientId: string | null; item?: ChecklistItem | null; onSaved: (newId?: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [weight, setWeight] = useState(6);
  const [norma, setNorma] = useState("");
  const [observacao, setObservacao] = useState("");
  const [penalidade, setPenalidade] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(item?.title ?? "");
      setWeight(item?.weight ?? 6);
      setNorma(item?.norma ?? "");
      setObservacao(item?.observacao ?? "");
      setPenalidade(item?.penalidade ?? "");
    }
  }, [open, item]);

  const save = async () => {
    if (!clientId) return toast.error("Cadastre uma clínica.");
    if (!title.trim()) return toast.error("Informe o título.");
    setBusy(true);
    let createdId: string | undefined;
    if (!item) {
      const { data, error } = await supabase
        .from("custom_items")
        .insert({ client_id: clientId, category, title, weight, norma: norma || null, observacao: observacao || null, penalidade: penalidade || null })
        .select("id")
        .single();
      if (error) { setBusy(false); return toast.error(error.message); }
      createdId = (data as { id: string } | null)?.id;
    } else if (item.id.startsWith("c_")) {
      const { error } = await supabase.from("custom_items").update({ title, weight, norma: norma || null, observacao: observacao || null, penalidade: penalidade || null }).eq("id", item.id.slice(2));
      if (error) { setBusy(false); return toast.error(error.message); }
    } else {
      const { error } = await supabase.from("item_overrides").upsert({
        client_id: clientId, item_id: item.id, title, weight, norma: norma || null, observacao: observacao || null, penalidade: penalidade || null,
      }, { onConflict: "client_id,item_id" });
      if (error) { setBusy(false); return toast.error(error.message); }
    }
    setBusy(false);
    toast.success("Salvo");
    onSaved(createdId);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "Editar requisito" : "Novo requisito"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Descrição</Label><Textarea value={title} onChange={(e) => setTitle(e.target.value)} rows={2} /></div>
          <div><Label>Peso (1-10)</Label><Input type="number" min={1} max={10} value={weight} onChange={(e) => setWeight(Number(e.target.value))} /></div>
          <div><Label>Norma</Label><Textarea value={norma} onChange={(e) => setNorma(e.target.value)} rows={2} /></div>
          <div><Label>Observação</Label><Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={2} /></div>
          <div><Label>Penalidade</Label><Textarea value={penalidade} onChange={(e) => setPenalidade(e.target.value)} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ValidityControl({ value, onChange, readOnly }: {
  value: { date: string | null; indeterminate: boolean };
  onChange: (v: { date: string | null; indeterminate: boolean }) => void;
  readOnly?: boolean;
}) {
  const { status, days } = getValidityStatus({ validity_date: value.date, validity_indeterminate: value.indeterminate });
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState(value.date ?? "");
  const [draftInd, setDraftInd] = useState(value.indeterminate);

  useEffect(() => {
    if (open) {
      setDraftDate(value.date ?? "");
      setDraftInd(value.indeterminate);
    }
  }, [open, value.date, value.indeterminate]);

  const styles: Record<ValidityStatus, { cls: string; label: string; title: string }> = {
    none: { cls: "border-dashed border-border text-muted-foreground", label: "Validade", title: "Definir validade" },
    indeterminate: { cls: "border-border text-foreground bg-muted", label: "∞", title: "Validade indeterminada" },
    expired: { cls: "border-danger bg-danger text-white", label: days != null ? `Vencido ${Math.abs(days)}d` : "Vencido", title: "Vencido" },
    d15: { cls: "border-danger text-danger bg-danger/10", label: `${days}d`, title: "Vence em até 15 dias" },
    d30: { cls: "border-amber-500 text-amber-700 dark:text-amber-400 bg-amber-500/10", label: `${days}d`, title: "Vence em até 30 dias" },
    d60: { cls: "border-warning text-warning bg-warning/10", label: `${days}d`, title: "Vence em até 60 dias" },
    ok: { cls: "border-success/40 text-success bg-success/5", label: value.date ? formatBR(value.date) : "OK", title: "Em dia" },
  };
  const s = styles[status];

  const apply = () => {
    if (draftInd) onChange({ date: null, indeterminate: true });
    else onChange({ date: draftDate || null, indeterminate: false });
    setOpen(false);
  };
  const clear = () => {
    onChange({ date: null, indeterminate: false });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={readOnly ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={s.title}
          disabled={readOnly}
          className={cn(
            "flex-shrink-0 inline-flex items-center gap-1 h-6 px-1.5 rounded border text-[10px] font-semibold transition-colors",
            s.cls,
          )}
        >
          {status === "indeterminate" ? <InfinityIcon className="w-3 h-3" /> : <CalendarClock className="w-3 h-3" />}
          <span className="whitespace-nowrap">{s.label}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-3 space-y-3">
        <div className="text-xs font-semibold text-foreground">Validade do documento</div>
        <div className="space-y-1.5">
          <Label className="text-[11px] text-muted-foreground">Data de validade</Label>
          <Input
            type="date"
            value={draftDate}
            onChange={(e) => { setDraftDate(e.target.value); if (e.target.value) setDraftInd(false); }}
            disabled={draftInd}
            className="h-8 text-xs"
          />
        </div>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox checked={draftInd} onCheckedChange={(c) => { setDraftInd(!!c); if (c) setDraftDate(""); }} />
          <span>Indeterminado (sem validade)</span>
        </label>
        <div className="flex items-center justify-between gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" className="h-7 text-xs" onClick={clear}>Limpar</Button>
          <Button type="button" size="sm" className="h-7 text-xs" onClick={apply}>Salvar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function formatBR(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y.slice(2)}`;
}

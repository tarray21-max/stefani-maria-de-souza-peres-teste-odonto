import { useEffect, useMemo, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDown, ArrowUp, FileSignature, FileText, FolderInput, FolderPlus, GripVertical, MoreVertical, Pencil, Plus, Search, Tags, Trash2 } from "lucide-react";
import type { Answer, ResponseMap } from "@/lib/checklist-data";
import { cn } from "@/lib/utils";
import { useBlocks, type Block } from "@/lib/use-blocks";
import {
  serviceAnswerId,
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_OPTIONS,
  type ServiceCategory,
  type ServiceMatrixItem,
  useServiceMatrixItems,
} from "@/lib/use-service-matrix-items";
import { useCategoryInfo, type CategoryInfo } from "@/lib/use-category-info";
import { toast } from "sonner";

interface Props {
  answers: ResponseMap;
  setAnswer: (id: string, value: Answer) => void;
  clientId: string | null;
  readOnly?: boolean;
}

const OPTIONS: { value: Exclude<Answer, null>; label: string; tone: string }[] = [
  { value: "sim", label: "Sim", tone: "data-[on=true]:bg-success data-[on=true]:text-white data-[on=true]:border-success" },
  { value: "nao", label: "Não", tone: "data-[on=true]:bg-danger data-[on=true]:text-white data-[on=true]:border-danger" },
  { value: "na", label: "N/A", tone: "data-[on=true]:bg-muted-foreground data-[on=true]:text-white data-[on=true]:border-muted-foreground" },
];

function Cell({ current, onChange, readOnly }: { current: Answer; onChange: (v: Answer) => void; readOnly?: boolean }) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden">
      {OPTIONS.map((o) => {
        const on = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            data-on={on}
            disabled={readOnly}
            onClick={() => onChange(on ? null : o.value)}
            className={cn(
              "px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-70",
              o.tone,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function CategoriesPopover({ item, onOpenCategory }: { item: ServiceMatrixItem; onOpenCategory: (c: ServiceCategory) => void }) {
  const cats = item.categories ?? [];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title={cats.length ? cats.map((c) => SERVICE_CATEGORY_LABELS[c]).join(", ") : "Sem categoria definida"}
          className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10"
        >
          <Tags className="w-3.5 h-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Categorias</div>
        {cats.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma categoria definida.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {cats.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onOpenCategory(c)}
                title="Ver norma e observação"
                className="inline-flex"
              >
                <Badge variant="outline" className="text-xs cursor-pointer hover:bg-primary/10 hover:border-primary/40">
                  {SERVICE_CATEGORY_LABELS[c]}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function CategoryInfoDialog({
  category,
  onClose,
  getInfo,
  onSave,
  readOnly,
}: {
  category: ServiceCategory | null;
  onClose: () => void;
  getInfo: (c: ServiceCategory) => CategoryInfo;
  onSave: (c: ServiceCategory, info: CategoryInfo) => Promise<void>;
  readOnly?: boolean;
}) {
  const [norma, setNorma] = useState("");
  const [observacao, setObservacao] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (category) {
      const info = getInfo(category);
      setNorma(info.norma);
      setObservacao(info.observacao);
      setBusy(false);
    }
  }, [category, getInfo]);

  const save = async () => {
    if (!category) return;
    setBusy(true);
    try { await onSave(category, { norma, observacao }); toast.success("Informações salvas"); onClose(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível salvar."); }
    setBusy(false);
  };

  return (
    <Dialog open={!!category} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? SERVICE_CATEGORY_LABELS[category] : ""}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Norma</Label>
            <Textarea value={norma} onChange={(e) => setNorma(e.target.value)} rows={3} disabled={readOnly} placeholder="Ex.: Resolução CFM nº…" />
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={4} disabled={readOnly} placeholder="Observações sobre esta categoria…" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          {!readOnly && <Button onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function ServiceMatrix({ answers, setAnswer, clientId, readOnly }: Props) {
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategory | "todas">("todas");
  const [editItem, setEditItem] = useState<ServiceMatrixItem | null>(null);
  const [creating, setCreating] = useState<{ blockId: string | null } | null>(null);
  const [deleteItem, setDeleteItem] = useState<ServiceMatrixItem | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [renameBlockId, setRenameBlockId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [deleteBlockId, setDeleteBlockId] = useState<string | null>(null);
  const [infoCategory, setInfoCategory] = useState<ServiceCategory | null>(null);

  const { items, addItem, updateItem, deleteItem: removeItem, reorderItems } = useServiceMatrixItems(clientId);
  const { get: getCategoryInfo, save: saveCategoryInfo } = useCategoryInfo(clientId);

  const allIds = useMemo(() => items.map((i) => i.id), [items]);
  const { blocks, addBlock, renameBlock, deleteBlock, moveBlock, moveItemToBlock, blockOfItem } =
    useBlocks(clientId, "tcle_pop_matrix" as unknown as import("@/lib/checklist-data").Category, allIds);

  const rows = useMemo(() => {
    const normalized = q.trim().toLowerCase();
    const filtered = items.filter((s) => {
      const matchesText = normalized ? s.name.toLowerCase().includes(normalized) : true;
      const matchesCategory = categoryFilter === "todas" ? true : (s.categories ?? []).includes(categoryFilter);
      return matchesText && matchesCategory;
    });
    return filtered.slice().sort((a, b) => {
      if (q || categoryFilter !== "todas") return a.position - b.position;
      const aT = answers[serviceAnswerId("tcle", a)]?.answer ?? null;
      const aP = answers[serviceAnswerId("pop", a)]?.answer ?? null;
      const bT = answers[serviceAnswerId("tcle", b)]?.answer ?? null;
      const bP = answers[serviceAnswerId("pop", b)]?.answer ?? null;
      const aNa = aT === "na" && aP === "na" ? 1 : 0;
      const bNa = bT === "na" && bP === "na" ? 1 : 0;
      if (aNa !== bNa) return aNa - bNa;
      const aNao = aT === "nao" || aP === "nao" ? -1 : 0;
      const bNao = bT === "nao" || bP === "nao" ? -1 : 0;
      if (aNao !== bNao) return aNao - bNao;
      return a.position - b.position;
    });
  }, [q, categoryFilter, items, answers]);

  const totals = useMemo(() => {
    let okT = 0, okP = 0;
    for (const s of items) {
      if (answers[serviceAnswerId("tcle", s)]?.answer === "sim") okT++;
      if (answers[serviceAnswerId("pop", s)]?.answer === "sim") okP++;
    }
    return { okT, okP, total: items.length };
  }, [items, answers]);

  const groups = useMemo(() => {
    const out: { block: Block | null; items: ServiceMatrixItem[] }[] = [];
    const used = new Set<string>();
    for (const b of blocks) {
      const set = new Set(b.itemIds);
      const its = rows.filter((i) => set.has(i.id));
      its.forEach((i) => used.add(i.id));
      out.push({ block: b, items: its });
    }
    const leftover = rows.filter((i) => !used.has(i.id));
    if (blocks.length === 0) out.push({ block: null, items: leftover });
    else if (leftover.length) out.push({ block: null, items: leftover });
    return out;
  }, [blocks, rows]);

  const handleDrop = async (targetId: string) => {
    if (!dragId || dragId === targetId) { setDragId(null); setOverId(null); return; }
    const full = [...items].sort((a, b) => a.position - b.position);
    const from = full.findIndex((i) => i.id === dragId);
    const to = full.findIndex((i) => i.id === targetId);
    if (from === -1 || to === -1) { setDragId(null); setOverId(null); return; }
    const next = [...full];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null); setOverId(null);
    try { await reorderItems(next); } catch { toast.error("Não foi possível salvar a ordem dos procedimentos."); }
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    const target = deleteItem;
    setDeleteItem(null);
    try {
      await removeItem(target);
      setAnswer(serviceAnswerId("tcle", target), null);
      setAnswer(serviceAnswerId("pop", target), null);
      toast.success("Procedimento excluído");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir.");
    }
  };

  return (
    <Card className="p-5 border-border/60 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Matriz TCLE × POP por serviço
          </div>
          <h3 className="text-lg font-bold text-foreground mt-1">Documentação por procedimento</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Indique se cada serviço prestado possui TCLE e POP correspondentes.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap justify-end">
          <span className="inline-flex items-center gap-1.5"><FileSignature className="w-3.5 h-3.5 text-primary" /><strong className="text-foreground">{totals.okT}</strong><span className="text-muted-foreground">/ {totals.total} TCLE</span></span>
          <span className="inline-flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary" /><strong className="text-foreground">{totals.okP}</strong><span className="text-muted-foreground">/ {totals.total} POP</span></span>
          {!readOnly && clientId && (
            <>
              <Button size="sm" variant="outline" className="h-8" onClick={() => addBlock(`Bloco ${blocks.length + 1}`)} title="Criar novo bloco">
                <FolderPlus className="w-3.5 h-3.5 mr-1" /> Novo bloco
              </Button>
              <Button size="sm" className="h-8" onClick={() => setCreating({ blockId: null })}><Plus className="w-3.5 h-3.5 mr-1" /> Novo procedimento</Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-2 mb-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar serviço…" className="pl-9 h-9" />
        </div>
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as ServiceCategory | "todas")}>
          <SelectTrigger className="h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            {SERVICE_CATEGORY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-4">
        {groups.map((g, gi) => {
          const isLeftover = !g.block;
          return (
            <div key={g.block?.id ?? `__leftover_${gi}`} className="rounded-lg border border-border/60 bg-card overflow-hidden">
              {(g.block || !readOnly) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border/60">
                  <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{isLeftover ? "Sem bloco" : "Bloco"}</span>
                  <span className="font-semibold text-sm text-foreground flex-1 truncate">
                    {isLeftover ? "Demais procedimentos" : g.block!.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{g.items.length} itens</span>
                  {g.block && !readOnly && (
                    <>
                      <button type="button" title="Mover bloco para cima" onClick={() => moveBlock(g.block!.id, -1)} disabled={gi === 0}
                        className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-40 disabled:hover:bg-transparent">
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button type="button" title="Mover bloco para baixo" onClick={() => moveBlock(g.block!.id, 1)} disabled={gi >= blocks.length - 1}
                        className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10 disabled:opacity-40 disabled:hover:bg-transparent">
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      <button type="button" title="Renomear bloco" onClick={() => { setRenameBlockId(g.block!.id); setRenameDraft(g.block!.name); }}
                        className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10">
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button type="button" title="Excluir bloco (mantém os procedimentos)" onClick={() => setDeleteBlockId(g.block!.id)}
                        className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-danger hover:bg-danger/10">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                  {!readOnly && clientId && (
                    <Button size="sm" variant="outline" className="h-7 ml-1" onClick={() => setCreating({ blockId: g.block ? g.block.id : null })}
                      title={g.block ? `Adicionar procedimento em "${g.block.name}"` : "Adicionar procedimento"}>
                      <Plus className="w-3 h-3 mr-1" /> Novo
                    </Button>
                  )}
                </div>
              )}
              <div className="grid grid-cols-[1fr_auto_auto] gap-0 text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/30 px-3 py-1.5 border-b border-border/60">
                <div>Serviço</div>
                <div className="px-3 text-center min-w-[150px]">TCLE</div>
                <div className="px-3 text-center min-w-[150px]">POP</div>
              </div>
              <div className="divide-y divide-border/60">
                {g.items.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground italic">Nenhum procedimento neste bloco. Use o menu de cada item para movê-lo para cá.</div>
                ) : g.items.map((s) => {
                  const idT = serviceAnswerId("tcle", s);
                  const idP = serviceAnswerId("pop", s);
                  const aT = answers[idT]?.answer ?? null;
                  const aP = answers[idP]?.answer ?? null;
                  const dim = aT === "na" && aP === "na";
                  const isOver = overId === s.id && dragId && dragId !== s.id;
                  const catTitle = (s.categories ?? []).length
                    ? (s.categories ?? []).map((c) => SERVICE_CATEGORY_LABELS[c]).join(", ")
                    : "Sem categoria definida";
                  const currentBlock = blockOfItem(s.id);
                  return (
                    <div
                      key={s.id}
                      onDragEnter={(e) => { if (!readOnly) { e.preventDefault(); if (dragId && dragId !== s.id) setOverId(s.id); } }}
                      onDragOver={(e) => { if (!readOnly && dragId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
                      onDragLeave={() => { if (overId === s.id) setOverId(null); }}
                      onDrop={(e) => { if (!readOnly) { e.preventDefault(); handleDrop(s.id); } }}
                      onDragEnd={() => { setDragId(null); setOverId(null); }}
                      className={cn("grid grid-cols-[1fr_auto_auto] items-center px-3 py-1.5 transition-all", dim && "opacity-40", isOver && "bg-primary/10 outline outline-1 outline-primary/40")}
                    >
                      <div className="flex items-center gap-2 min-w-0 pr-3">
                        {!readOnly && (
                          <span
                            title="Arrastar para reordenar"
                            draggable={!readOnly}
                            onDragStart={(e) => { setDragId(s.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.id); }}
                            className="w-5 h-6 inline-flex items-center justify-center text-muted-foreground hover:text-primary cursor-grab active:cursor-grabbing flex-shrink-0"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {!readOnly && clientId && (
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button type="button" title="Ações" className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10">
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="start" className="w-52">
                                <DropdownMenuItem onClick={() => setEditItem(s)}>
                                  <Pencil className="w-3.5 h-3.5 mr-2" /> Editar procedimento
                                </DropdownMenuItem>
                                <DropdownMenuSub>
                                  <DropdownMenuSubTrigger>
                                    <FolderInput className="w-3.5 h-3.5 mr-2" /> Mover para bloco
                                  </DropdownMenuSubTrigger>
                                  <DropdownMenuSubContent>
                                    <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Blocos</DropdownMenuLabel>
                                    {blocks.length === 0 && <DropdownMenuItem disabled>Nenhum bloco criado</DropdownMenuItem>}
                                    {blocks.map((b) => (
                                      <DropdownMenuItem key={b.id} onClick={() => moveItemToBlock(s.id, b.id)} disabled={currentBlock?.id === b.id}>
                                        {b.name}{currentBlock?.id === b.id ? " ✓" : ""}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={() => moveItemToBlock(s.id, null)} disabled={!currentBlock}>
                                      Remover do bloco
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => addBlock(`Bloco ${blocks.length + 1}`)}>
                                      <FolderPlus className="w-3.5 h-3.5 mr-2" /> Novo bloco…
                                    </DropdownMenuItem>
                                  </DropdownMenuSubContent>
                                </DropdownMenuSub>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setDeleteItem(s)} className="text-danger focus:text-danger">
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir procedimento
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <CategoriesPopover item={s} onOpenCategory={(c) => setInfoCategory(c)} />
                          </div>
                        )}
                        <span className="text-sm text-foreground truncate" title={`${s.name}\n\nCategorias: ${catTitle}`}>{s.name}</span>
                      </div>
                      <div className="px-3 text-center"><Cell current={aT} onChange={(v) => setAnswer(idT, v)} readOnly={readOnly} /></div>
                      <div className="px-3 text-center"><Cell current={aP} onChange={(v) => setAnswer(idP, v)} readOnly={readOnly} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && <div className="rounded-lg border border-border/60 bg-card px-3 py-6 text-center text-sm text-muted-foreground">Nenhum serviço encontrado{q ? ` para "${q}"` : ""}.</div>}
      </div>

      <ServiceFormDialog
        open={!!creating}
        onClose={() => setCreating(null)}
        onSave={async (name, categories) => {
          await addItem(name, categories);
          const targetBlockId = creating?.blockId ?? null;
          setCreating(null);
          // Move the newly created item into the target block. We identify it as the
          // most recent custom item with the same name (refresh ran inside addItem).
          if (targetBlockId) {
            // Defer to next microtask so items list is up-to-date.
            setTimeout(() => {
              const created = [...items].reverse().find((i) => !i.isDefault && i.name === name);
              if (created) moveItemToBlock(created.id, targetBlockId);
            }, 0);
          }
          toast.success("Procedimento criado");
        }}
      />
      <ServiceFormDialog open={!!editItem} item={editItem} onClose={() => setEditItem(null)} onSave={async (name, categories) => { if (editItem) await updateItem(editItem, name, categories); setEditItem(null); toast.success("Procedimento salvo"); }} />

      <Dialog open={!!renameBlockId} onOpenChange={(o) => !o && setRenameBlockId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Renomear bloco</DialogTitle></DialogHeader>
          <Input value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)} placeholder="Nome do bloco" autoFocus />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRenameBlockId(null)}>Cancelar</Button>
            <Button onClick={() => { if (renameBlockId && renameDraft.trim()) renameBlock(renameBlockId, renameDraft.trim()); setRenameBlockId(null); }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteBlockId} onOpenChange={(o) => !o && setDeleteBlockId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bloco?</AlertDialogTitle>
            <AlertDialogDescription>O bloco será removido, mas os procedimentos continuam na matriz (em "Demais procedimentos").</AlertDialogDescription>
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
            <AlertDialogTitle>Excluir procedimento?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação remove o procedimento da matriz TCLE × POP.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-danger text-white hover:bg-danger/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CategoryInfoDialog
        category={infoCategory}
        onClose={() => setInfoCategory(null)}
        getInfo={getCategoryInfo}
        onSave={saveCategoryInfo}
        readOnly={readOnly}
      />
    </Card>
  );
}

function ServiceFormDialog({ open, item, onClose, onSave }: { open: boolean; item?: ServiceMatrixItem | null; onClose: () => void; onSave: (name: string, categories: ServiceCategory[]) => Promise<void> }) {
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setCategories(item?.categories ?? []);
      setBusy(false);
    }
  }, [open, item]);

  const toggle = (c: ServiceCategory, on: boolean) => {
    setCategories((prev) => on ? Array.from(new Set([...prev, c])) : prev.filter((x) => x !== c));
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Informe o nome do procedimento.");
    setBusy(true);
    try { await onSave(name.trim(), categories); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "Editar procedimento" : "Novo procedimento"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Procedimento</Label><Textarea value={name} onChange={(e) => setName(e.target.value)} rows={2} /></div>
          <div>
            <Label>Categorias (selecione uma ou mais)</Label>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SERVICE_CATEGORY_OPTIONS.map((opt) => {
                const checked = categories.includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer rounded-md border border-border/60 px-2.5 py-1.5 hover:bg-muted/40">
                    <Checkbox checked={checked} onCheckedChange={(v) => toggle(opt.value, Boolean(v))} />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
import { ArrowDown, ArrowUp, FileSignature, FileText, FolderInput, FolderPlus, GripVertical, ImagePlus, MoreVertical, Pencil, Plus, Search, Tags, Trash2, X } from "lucide-react";
import type { Answer, ResponseMap } from "@/lib/checklist-data";
import { cn } from "@/lib/utils";
import { useBlocks, type Block } from "@/lib/use-blocks";
import {
  serviceAnswerId,
  SERVICE_CATEGORY_LABELS,
  SERVICE_CATEGORY_OPTIONS,
  type ServiceCategory,
  type ServiceItemPayload,
  type ServiceMatrixItem,
  useServiceMatrixItems,
} from "@/lib/use-service-matrix-items";
import { useCategoryInfo, type CategoryInfo } from "@/lib/use-category-info";
import { useServiceItemImages, type ServiceItemImage } from "@/lib/use-service-item-images";
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
  const [viewItem, setViewItem] = useState<ServiceMatrixItem | null>(null);

  const { items, addItem, updateItem, ensurePersisted, deleteItem: removeItem, reorderItems } = useServiceMatrixItems(clientId);
  const { get: getCategoryInfo, save: saveCategoryInfo } = useCategoryInfo(clientId);
  const { get: getImages, upload: uploadImage, remove: removeImage } = useServiceItemImages(clientId);

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
                        <button type="button" onClick={() => setViewItem(s)} title={`${s.name}\n\nCategorias: ${catTitle}\n\nClique para ver norma, observação e imagens`} className="text-sm text-foreground truncate text-left hover:text-primary hover:underline cursor-pointer">{s.name}</button>
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
        clientId={clientId}
        ensurePersisted={ensurePersisted}
        getImages={getImages}
        uploadImage={uploadImage}
        removeImage={removeImage}
        onClose={() => setCreating(null)}
        onSave={async (payload, pendingImages) => {
          const newId = await addItem(payload);
          for (const f of pendingImages) {
            try { await uploadImage(newId, f); } catch (e) { console.error(e); }
          }
          const targetBlockId = creating?.blockId ?? null;
          setCreating(null);
          if (targetBlockId) moveItemToBlock(newId, targetBlockId);
          toast.success("Procedimento criado");
        }}
      />
      <ServiceFormDialog
        open={!!editItem}
        item={editItem}
        clientId={clientId}
        ensurePersisted={ensurePersisted}
        getImages={getImages}
        uploadImage={uploadImage}
        removeImage={removeImage}
        onClose={() => setEditItem(null)}
        onSave={async (payload) => {
          if (editItem) await updateItem(editItem, payload);
          setEditItem(null);
          toast.success("Procedimento salvo");
        }}
      />

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

      <ServiceItemViewDialog
        item={viewItem}
        onClose={() => setViewItem(null)}
        getImages={getImages}
        onEdit={(it) => { setViewItem(null); setEditItem(it); }}
      />
    </Card>
  );
}

interface FormProps {
  open: boolean;
  item?: ServiceMatrixItem | null;
  clientId: string | null;
  ensurePersisted: (item: ServiceMatrixItem) => Promise<string>;
  getImages: (itemId: string) => ServiceItemImage[];
  uploadImage: (itemId: string, file: File) => Promise<void>;
  removeImage: (image: ServiceItemImage) => Promise<void>;
  onClose: () => void;
  onSave: (payload: ServiceItemPayload, pendingImages: File[]) => Promise<void>;
}

function ServiceFormDialog({ open, item, clientId, ensurePersisted, getImages, uploadImage, removeImage, onClose, onSave }: FormProps) {
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [norma, setNorma] = useState("");
  const [observacao, setObservacao] = useState("");
  const [pendingImages, setPendingImages] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(item?.name ?? "");
      setCategories(item?.categories ?? []);
      setNorma(item?.norma ?? "");
      setObservacao(item?.observacao ?? "");
      setPendingImages([]);
      setBusy(false);
    }
  }, [open, item]);

  const toggle = (c: ServiceCategory, on: boolean) => {
    setCategories((prev) => on ? Array.from(new Set([...prev, c])) : prev.filter((x) => x !== c));
  };

  const onPickFiles = (files: FileList | null) => {
    if (!files) return;
    setPendingImages((prev) => [...prev, ...Array.from(files)]);
  };

  const handleExistingUpload = async (files: FileList | null) => {
    if (!files || !item) return;
    try {
      const realId = await ensurePersisted(item);
      for (const f of Array.from(files)) await uploadImage(realId, f);
      toast.success("Imagem enviada");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Não foi possível enviar a imagem."); }
  };

  const save = async () => {
    if (!name.trim()) return toast.error("Informe o nome do procedimento.");
    setBusy(true);
    try { await onSave({ name: name.trim(), categories, norma, observacao }, pendingImages); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    setBusy(false);
  };

  const existingImages = item ? getImages(item.id) : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
          <div>
            <Label>Norma</Label>
            <Textarea value={norma} onChange={(e) => setNorma(e.target.value)} rows={3} placeholder="Ex.: Resolução CFM nº…" />
          </div>
          <div>
            <Label>Observação</Label>
            <Textarea value={observacao} onChange={(e) => setObservacao(e.target.value)} rows={3} placeholder="Observações sobre este procedimento…" />
          </div>
          <div>
            <Label>Imagens</Label>
            {item ? (
              <>
                {existingImages.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {existingImages.map((img) => (
                      <div key={img.id} className="relative group rounded-md overflow-hidden border border-border/60 aspect-square bg-muted">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImage(img).catch((e) => toast.error(e instanceof Error ? e.message : "Erro"))}
                          className="absolute top-1 right-1 w-6 h-6 inline-flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-danger transition">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="mt-2 inline-flex items-center gap-2 text-sm cursor-pointer rounded-md border border-dashed border-border px-3 py-2 hover:bg-muted/40">
                  <ImagePlus className="w-4 h-4" /> Adicionar imagem
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { handleExistingUpload(e.target.files); e.target.value = ""; }} />
                </label>
              </>
            ) : (
              <>
                {pendingImages.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {pendingImages.map((f, i) => (
                      <div key={i} className="relative group rounded-md overflow-hidden border border-border/60 aspect-square bg-muted">
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setPendingImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-6 h-6 inline-flex items-center justify-center rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 hover:bg-danger transition">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <label className="mt-2 inline-flex items-center gap-2 text-sm cursor-pointer rounded-md border border-dashed border-border px-3 py-2 hover:bg-muted/40">
                  <ImagePlus className="w-4 h-4" /> Adicionar imagem
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { onPickFiles(e.target.files); e.target.value = ""; }} />
                </label>
                <p className="text-[11px] text-muted-foreground mt-1">As imagens serão enviadas após salvar o procedimento.</p>
              </>
            )}
            {!clientId && <p className="text-[11px] text-muted-foreground mt-1">Cadastre uma clínica para anexar imagens.</p>}
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

function ServiceItemViewDialog({
  item, onClose, getImages, onEdit,
}: {
  item: ServiceMatrixItem | null;
  onClose: () => void;
  getImages: (itemId: string) => ServiceItemImage[];
  onEdit: (item: ServiceMatrixItem) => void;
}) {
  const imgs = item ? getImages(item.id) : [];
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{item?.name}</DialogTitle></DialogHeader>
        {item && (
          <div className="space-y-3">
            {(item.categories ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {item.categories.map((c) => (
                  <Badge key={c} variant="outline" className="text-xs">{SERVICE_CATEGORY_LABELS[c]}</Badge>
                ))}
              </div>
            )}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Norma</div>
              <p className="text-sm whitespace-pre-wrap text-foreground">{item.norma?.trim() || <span className="text-muted-foreground italic">Não informada.</span>}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Observação</div>
              <p className="text-sm whitespace-pre-wrap text-foreground">{item.observacao?.trim() || <span className="text-muted-foreground italic">Sem observações.</span>}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Imagens</div>
              {imgs.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">Nenhuma imagem anexada.</p>
              ) : (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {imgs.map((img) => (
                    <a key={img.id} href={img.url} target="_blank" rel="noreferrer" className="block rounded-md overflow-hidden border border-border/60 aspect-square bg-muted">
                      <img src={img.url} alt="" className="w-full h-full object-cover hover:opacity-90 transition" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          {item && <Button onClick={() => onEdit(item)}><Pencil className="w-3.5 h-3.5 mr-1" /> Editar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

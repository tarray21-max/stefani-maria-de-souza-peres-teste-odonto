import { useEffect, useMemo, useRef, useState } from "react";
import type { Answer, Category, ChecklistItem, Quality, ResponseMap } from "@/lib/checklist-data";
import { Check, X, MinusCircle, Search, MessageSquare, Image as ImageIcon, Plus, Trash2, Pencil, Upload, Eraser, GripVertical, MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export function ChecklistSection({ category, items: allItems, answers, setAnswer, setQuality, setJustification, clientId, onItemsChange, imageUrlsFor, positions, reorderCategory, readOnly }: Props) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [imageItem, setImageItem] = useState<ChecklistItem | null>(null);
  const [editItem, setEditItem] = useState<ChecklistItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ChecklistItem | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterKind>("all");

  const items = useMemo(() => allItems.filter((i) => i.category === category), [allItems, category]);

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
            <Button size="sm" variant="outline" className="h-8" onClick={() => setShowAdd(true)}>
              <Plus className="w-3 h-3 mr-1" /> Novo
            </Button>
          )}
        </div>
      </div>


      <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card overflow-hidden">
        {ordered.map((item, idx) => {
          const resp = answers[item.id];
          const current = resp?.answer ?? null;
          const quality = resp?.quality ?? null;
          const isNa = current === "na";
          const isNao = current === "nao";
          const isSim = current === "sim";
          const isOpen = openId === item.id;
          const isCustom = item.id.startsWith("c_");
          const imgs = imageUrlsFor?.(item.id) ?? [];
          const isDragging = dragId === item.id;
          const isOver = overId === item.id && dragId && dragId !== item.id;
          const canDrag = !readOnly && !!reorderCategory && !!clientId;
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
                {/* AÇÕES À ESQUERDA: drag • número • norma • editar • excluir • limpar */}
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
                    <DropdownMenuContent align="start" className="w-44">
                      <DropdownMenuItem onClick={() => setEditItem(item)}>
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Editar pergunta
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleClear(item.id)} disabled={!current}>
                        <Eraser className="w-3.5 h-3.5 mr-2" /> Limpar resposta
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setDeleteItem(item)} className="text-danger focus:text-danger">
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir pergunta
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}


                {/* TÍTULO */}
                <button type="button" onClick={() => setImageItem(item)} className="flex-1 min-w-0 text-sm text-foreground leading-tight truncate text-left hover:text-primary pl-1" title={item.title}>
                  {item.title}
                </button>

                {/* QUALIDADE compacta (apenas quando "Sim"): toggle único Bom ⇄ Ruim 50% */}
                {isSim && setQuality && (
                  <button
                    type="button"
                    title={quality === "ruim" ? "Marcado como Ruim — pontua 50%. Clique para voltar a Bom." : "Marcar implementação como Ruim (pontua 50%)"}
                    onClick={() => setQuality(item.id, quality === "ruim" ? "bom" : "ruim")}
                    className={cn(
                      "flex-shrink-0 inline-flex items-center px-1.5 h-6 rounded text-[10px] font-semibold transition-colors",
                      quality === "ruim"
                        ? "bg-amber-500 text-white"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {quality === "ruim" ? "Ruim 50%" : "Bom"}
                  </button>
                )}

                {setJustification && (
                  <button type="button" title="Justificativa" onClick={() => setOpenId(isOpen ? null : item.id)}
                    className={cn("flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary", isOpen && "bg-primary text-white", resp?.justification && !isOpen && "text-primary")}>
                    <MessageSquare className="w-3 h-3" />
                  </button>
                )}

                {/* RESPOSTAS À DIREITA */}
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
        {ordered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum item encontrado.</li>}
      </ul>

      <ItemImageDialog item={imageItem} onClose={() => setImageItem(null)} clientId={clientId} images={imageItem ? imageUrlsFor?.(imageItem.id) ?? [] : []} readOnly={readOnly} onEdit={(it) => { setImageItem(null); setEditItem(it); }} />
      <ItemFormDialog open={showAdd} onClose={() => setShowAdd(false)} category={category} clientId={clientId} onSaved={() => { setShowAdd(false); onItemsChange?.(); }} />
      <ItemFormDialog open={!!editItem} onClose={() => setEditItem(null)} category={category} clientId={clientId} item={editItem} onSaved={() => { setEditItem(null); onItemsChange?.(); }} />

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
    </div>
  );
}


function ItemImageDialog({ item, onClose, clientId, images, readOnly, onEdit }: {
  item: ChecklistItem | null; onClose: () => void; clientId: string | null; images: ImageEntry[]; readOnly?: boolean; onEdit?: (it: ChecklistItem) => void;
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
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="pr-8">{item?.title}</DialogTitle></DialogHeader>
        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {images.map((img) => (
              <div key={img.id} className="relative group aspect-video rounded-lg overflow-hidden border border-border bg-muted">
                <img src={img.url} alt="Referência" className="w-full h-full object-cover" />
                {!readOnly && clientId && (
                  <button type="button" onClick={() => remove(img)} title="Remover" className="absolute top-1 right-1 w-6 h-6 rounded-full bg-background/90 text-destructive opacity-0 group-hover:opacity-100 flex items-center justify-center">
                    <Trash2 className="w-3 h-3" />
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
  open: boolean; onClose: () => void; category: Category; clientId: string | null; item?: ChecklistItem | null; onSaved: () => void;
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
    if (!item) {
      const { error } = await supabase.from("custom_items").insert({ client_id: clientId, category, title, weight, norma: norma || null, observacao: observacao || null, penalidade: penalidade || null });
      if (error) { setBusy(false); return toast.error(error.message); }
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
    onSaved();
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

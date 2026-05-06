import { useMemo, useState } from "react";
import type { Answer, Category, ChecklistItem, Quality, ResponseMap } from "@/lib/checklist-data";
import { Check, X, MinusCircle, Search, AlertTriangle, MessageSquare, ThumbsUp, ThumbsDown, Image as ImageIcon, Plus, Trash2, Pencil, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  category: Category;
  items: ChecklistItem[];
  answers: ResponseMap;
  setAnswer: (id: string, value: Answer) => void;
  setQuality?: (id: string, quality: Quality) => void;
  setJustification?: (id: string, value: string) => void;
  clientId: string | null;
  onItemsChange?: () => void;
  readOnly?: boolean;
}

const OPTIONS: { value: Answer; label: string; icon: typeof Check; activeClass: string }[] = [
  { value: "sim", label: "Sim", icon: Check, activeClass: "bg-success text-white border-success" },
  { value: "nao", label: "Não", icon: X, activeClass: "bg-danger text-white border-danger" },
  { value: "na", label: "N/A", icon: MinusCircle, activeClass: "bg-muted-foreground text-white border-muted-foreground" },
];

export function ChecklistSection({ category, items: allItems, answers, setAnswer, setQuality, setJustification, clientId, onItemsChange, readOnly }: Props) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [imageItem, setImageItem] = useState<ChecklistItem | null>(null);
  const [editItem, setEditItem] = useState<ChecklistItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const items = useMemo(() => allItems.filter((i) => i.category === category && !i.matrix), [allItems, category]);

  const ordered = useMemo(() => {
    const filtered = query ? items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())) : items;
    return filtered
      .map((it) => ({ it, isNa: answers[it.id]?.answer === "na" }))
      .sort((a, b) => {
        if (a.isNa !== b.isNa) return a.isNa ? 1 : -1;
        return a.it.title.localeCompare(b.it.title, "pt-BR");
      })
      .map(({ it }) => it);
  }, [items, answers, query]);

  const answered = items.filter((i) => answers[i.id]?.answer).length;

  const handleHide = async (item: ChecklistItem) => {
    if (!clientId) return toast.error("Cadastre uma clínica para personalizar.");
    if (item.id.startsWith("c_")) {
      const { error } = await supabase.from("custom_items").delete().eq("id", item.id.slice(2));
      if (error) return toast.error(error.message);
      toast.success("Item excluído");
    } else {
      const { error } = await supabase.from("disabled_items").insert({ client_id: clientId, item_id: item.id });
      if (error) return toast.error(error.message);
      toast.success("Item ocultado");
    }
    onItemsChange?.();
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="text-muted-foreground">
          {items.length} itens • <span className="font-medium text-foreground">{answered} respondidos</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
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
          const isSim = current === "sim";
          const isOpen = openId === item.id;
          const isCustom = item.id.startsWith("c_");
          return (
            <li key={item.id} className={cn("transition-all", isNa && "opacity-40 hover:opacity-100")}>
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span className="flex-shrink-0 w-5 h-5 rounded bg-primary/10 text-primary font-semibold flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
                <button type="button" onClick={() => setImageItem(item)} className="flex-1 min-w-0 text-sm text-foreground leading-tight truncate text-left hover:text-primary" title={item.title}>
                  {item.title}
                  {isCustom && <span className="ml-2 text-[9px] uppercase text-primary">custom</span>}
                </button>

                {item.norma && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" title="Ver norma e risco" className="flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded text-amber-600 hover:bg-amber-500/10">
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 text-xs space-y-2" side="left">
                      <div>
                        <div className="font-semibold text-foreground mb-1">Norma técnica</div>
                        <p className="text-muted-foreground">{item.norma}</p>
                      </div>
                      {item.risco && (
                        <div>
                          <div className="font-semibold text-danger mb-1">Consequência</div>
                          <p className="text-muted-foreground">{item.risco}</p>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}

                {!readOnly && clientId && (
                  <>
                    {isCustom && (
                      <button type="button" title="Editar" onClick={() => setEditItem(item)} className="flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary">
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    <button type="button" title={isCustom ? "Excluir" : "Ocultar"} onClick={() => handleHide(item)} className="flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-danger">
                      {isCustom ? <Trash2 className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                    </button>
                  </>
                )}

                {isSim && setQuality && (
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button type="button" title="Implementação Boa" onClick={() => setQuality(item.id, "bom")}
                      className={cn("w-6 h-6 inline-flex items-center justify-center rounded border text-[10px] border-border bg-background hover:border-success/50", quality === "bom" && "bg-success text-white border-success")}>
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button type="button" title="Implementação Ruim (50%)" onClick={() => setQuality(item.id, "ruim")}
                      className={cn("w-6 h-6 inline-flex items-center justify-center rounded border text-[10px] border-border bg-background hover:border-amber-500/50", quality === "ruim" && "bg-amber-500 text-white border-amber-500")}>
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {setJustification && (
                  <button type="button" title="Justificativa" onClick={() => setOpenId(isOpen ? null : item.id)}
                    className={cn("flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded border text-[10px] border-border bg-background hover:border-primary/40", isOpen && "bg-primary text-white border-primary", resp?.justification && "border-primary/50 text-primary")}>
                    <MessageSquare className="w-3 h-3" />
                  </button>
                )}

                <div className="flex gap-1 flex-shrink-0">
                  {OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = current === opt.value;
                    return (
                      <button key={opt.value} type="button" onClick={() => setAnswer(item.id, opt.value)}
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

      {/* Reference image modal */}
      <Dialog open={!!imageItem} onOpenChange={(o) => !o && setImageItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{imageItem?.title}</DialogTitle></DialogHeader>
          <div className="rounded-lg border border-dashed border-border bg-muted/40 aspect-video flex flex-col items-center justify-center text-center p-6">
            <ImageIcon className="w-10 h-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">Imagem de referência ainda não cadastrada.</p>
            {imageItem?.referencia && <p className="text-xs text-muted-foreground mt-2 italic max-w-md">{imageItem.referencia}</p>}
          </div>
          {imageItem?.norma && <p className="text-xs text-muted-foreground"><strong>Norma:</strong> {imageItem.norma}</p>}
          {imageItem?.risco && <p className="text-xs text-muted-foreground"><strong>Risco:</strong> {imageItem.risco}</p>}
        </DialogContent>
      </Dialog>

      <ItemFormDialog open={showAdd} onClose={() => setShowAdd(false)} category={category} clientId={clientId} onSaved={() => { setShowAdd(false); onItemsChange?.(); }} />
      <ItemFormDialog open={!!editItem} onClose={() => setEditItem(null)} category={category} clientId={clientId} item={editItem} onSaved={() => { setEditItem(null); onItemsChange?.(); }} />
    </div>
  );
}

function ItemFormDialog({ open, onClose, category, clientId, item, onSaved }: {
  open: boolean; onClose: () => void; category: Category; clientId: string | null; item?: ChecklistItem | null; onSaved: () => void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [weight, setWeight] = useState(item?.weight ?? 5);
  const [norma, setNorma] = useState(item?.norma ?? "");
  const [risco, setRisco] = useState(item?.risco ?? "");
  const [busy, setBusy] = useState(false);

  // reset on open
  useMemo(() => {
    if (open) {
      setTitle(item?.title ?? "");
      setWeight(item?.weight ?? 5);
      setNorma(item?.norma ?? "");
      setRisco(item?.risco ?? "");
    }
  }, [open, item]);

  const save = async () => {
    if (!clientId) return toast.error("Cadastre uma clínica.");
    if (!title.trim()) return toast.error("Informe o título.");
    setBusy(true);
    if (item?.id.startsWith("c_")) {
      const { error } = await supabase.from("custom_items").update({ title, weight, norma: norma || null, risco: risco || null }).eq("id", item.id.slice(2));
      if (error) { setBusy(false); return toast.error(error.message); }
    } else {
      const { error } = await supabase.from("custom_items").insert({ client_id: clientId, category, title, weight, norma: norma || null, risco: risco || null });
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
          <div><Label>Título</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Peso (1-10)</Label><Input type="number" min={1} max={10} value={weight} onChange={(e) => setWeight(Number(e.target.value))} /></div>
          <div><Label>Norma técnica</Label><Input value={norma} onChange={(e) => setNorma(e.target.value)} /></div>
          <div><Label>Risco / consequência</Label><Textarea value={risco} onChange={(e) => setRisco(e.target.value)} rows={3} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={busy}>{busy ? "Salvando…" : "Salvar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

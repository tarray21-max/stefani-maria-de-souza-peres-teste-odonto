import { useEffect, useMemo, useRef, useState } from "react";
import type { Answer, Category, ChecklistItem, Quality, ResponseMap } from "@/lib/checklist-data";
import { Check, X, MinusCircle, Search, AlertTriangle, MessageSquare, ThumbsUp, ThumbsDown, Image as ImageIcon, Plus, Trash2, Pencil, EyeOff, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  readOnly?: boolean;
}

const OPTIONS: { value: Answer; label: string; icon: typeof Check; activeClass: string }[] = [
  { value: "sim", label: "Sim", icon: Check, activeClass: "bg-success text-white border-success" },
  { value: "nao", label: "Não", icon: X, activeClass: "bg-danger text-white border-danger" },
  { value: "na", label: "N/A", icon: MinusCircle, activeClass: "bg-muted-foreground text-white border-muted-foreground" },
];

export function ChecklistSection({ category, items: allItems, answers, setAnswer, setQuality, setJustification, clientId, onItemsChange, imageUrlsFor, readOnly }: Props) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [imageItem, setImageItem] = useState<ChecklistItem | null>(null);
  const [editItem, setEditItem] = useState<ChecklistItem | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const items = useMemo(() => allItems.filter((i) => i.category === category && !i.matrix), [allItems, category]);

  const ordered = useMemo(() => {
    const filtered = query ? items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase())) : items;
    // priority: nao (top), null (middle), sim (middle), na (bottom)
    const rank = (a: Answer | undefined) => {
      if (a === "nao") return 0;
      if (a === "na") return 2;
      return 1;
    };
    return [...filtered].sort((a, b) => {
      const ra = rank(answers[a.id]?.answer);
      const rb = rank(answers[b.id]?.answer);
      if (ra !== rb) return ra - rb;
      if (ra === 0) return b.weight - a.weight; // heavier "Não" first
      return a.title.localeCompare(b.title, "pt-BR");
    });
  }, [items, answers, query]);

  const answered = items.filter((i) => answers[i.id]?.answer).length;
  const naoCount = items.filter((i) => answers[i.id]?.answer === "nao").length;

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
          {naoCount > 0 && <span className="ml-2 text-danger font-medium">• {naoCount} não conformes no topo</span>}
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
          const isNao = current === "nao";
          const isSim = current === "sim";
          const isOpen = openId === item.id;
          const isCustom = item.id.startsWith("c_");
          const imgs = imageUrlsFor?.(item.id) ?? [];
          return (
            <li
              key={item.id}
              className={cn(
                "transition-all duration-300 ease-out",
                isNa && "opacity-40 hover:opacity-100",
                isNao && "bg-danger/5",
              )}
              style={{ order: idx }}
            >
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span
                  className={cn(
                    "flex-shrink-0 w-5 h-5 rounded font-semibold flex items-center justify-center text-[10px]",
                    isNao ? "bg-danger text-white" : "bg-primary/10 text-primary",
                  )}
                >
                  {idx + 1}
                </span>
                <button type="button" onClick={() => setImageItem(item)} className="flex-1 min-w-0 text-sm text-foreground leading-tight truncate text-left hover:text-primary" title={item.title}>
                  {item.title}
                  {imgs.length > 0 && <span className="ml-1.5 inline-flex items-center text-[9px] text-primary/80"><ImageIcon className="w-3 h-3" /></span>}
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
                    <button type="button" title="Editar" onClick={() => setEditItem(item)} className="flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary">
                      <Pencil className="w-3 h-3" />
                    </button>
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

      <ItemImageDialog item={imageItem} onClose={() => setImageItem(null)} clientId={clientId} images={imageItem ? imageUrlsFor?.(imageItem.id) ?? [] : []} readOnly={readOnly} />
      <ItemFormDialog open={showAdd} onClose={() => setShowAdd(false)} category={category} clientId={clientId} onSaved={() => { setShowAdd(false); onItemsChange?.(); }} />
      <ItemFormDialog open={!!editItem} onClose={() => setEditItem(null)} category={category} clientId={clientId} item={editItem} onSaved={() => { setEditItem(null); onItemsChange?.(); }} />
    </div>
  );
}

function ItemImageDialog({ item, onClose, clientId, images, readOnly }: {
  item: ChecklistItem | null; onClose: () => void; clientId: string | null; images: ImageEntry[]; readOnly?: boolean;
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

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{item?.title}</DialogTitle></DialogHeader>
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
        {item?.norma && <p className="text-xs text-muted-foreground"><strong>Norma:</strong> {item.norma}</p>}
        {item?.risco && <p className="text-xs text-muted-foreground"><strong>Risco:</strong> {item.risco}</p>}
        {!readOnly && clientId && (
          <DialogFooter>
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
  const [weight, setWeight] = useState(5);
  const [norma, setNorma] = useState("");
  const [risco, setRisco] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
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
    if (!item) {
      // create new custom item
      const { error } = await supabase.from("custom_items").insert({ client_id: clientId, category, title, weight, norma: norma || null, risco: risco || null });
      if (error) { setBusy(false); return toast.error(error.message); }
    } else if (item.id.startsWith("c_")) {
      const { error } = await supabase.from("custom_items").update({ title, weight, norma: norma || null, risco: risco || null }).eq("id", item.id.slice(2));
      if (error) { setBusy(false); return toast.error(error.message); }
    } else {
      // override built-in
      const { error } = await supabase.from("item_overrides").upsert({
        client_id: clientId, item_id: item.id, title, weight, norma: norma || null, risco: risco || null,
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

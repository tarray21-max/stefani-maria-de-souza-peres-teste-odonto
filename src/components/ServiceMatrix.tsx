import { useMemo, useState } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Search, FileSignature, FileText, Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import type { Answer, ResponseMap } from "@/lib/checklist-data";
import { cn } from "@/lib/utils";
import { serviceAnswerId, type ServiceArea, type ServiceMatrixItem, useServiceMatrixItems } from "@/lib/use-service-matrix-items";
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

const AREA_LABELS: Record<ServiceArea, string> = {
  medica: "Médica",
  odontologica: "Odontológica",
  ambas: "Médica e odontológica",
};

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

export function ServiceMatrix({ answers, setAnswer, clientId, readOnly }: Props) {
  const [q, setQ] = useState("");
  const [areaFilter, setAreaFilter] = useState<ServiceArea | "todas">("todas");
  const [editItem, setEditItem] = useState<ServiceMatrixItem | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleteItem, setDeleteItem] = useState<ServiceMatrixItem | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const { items, addItem, updateItem, deleteItem: removeItem, reorderItems } = useServiceMatrixItems(clientId);

  const rows = useMemo(() => {
    const normalized = q.trim().toLowerCase();
    const filtered = items.filter((s) => {
      const matchesText = normalized ? s.name.toLowerCase().includes(normalized) : true;
      const matchesArea = areaFilter === "todas" ? true : s.area === areaFilter || s.area === "ambas";
      return matchesText && matchesArea;
    });
    return filtered.slice().sort((a, b) => {
      if (q || areaFilter !== "todas") return a.position - b.position;
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
  }, [q, areaFilter, items, answers]);

  const totals = useMemo(() => {
    let okT = 0, okP = 0;
    for (const s of items) {
      if (answers[serviceAnswerId("tcle", s)]?.answer === "sim") okT++;
      if (answers[serviceAnswerId("pop", s)]?.answer === "sim") okP++;
    }
    return { okT, okP, total: items.length };
  }, [items, answers]);

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
          {!readOnly && clientId && <Button size="sm" className="h-8" onClick={() => setCreating(true)}><Plus className="w-3.5 h-3.5 mr-1" /> Novo procedimento</Button>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-2 mb-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar serviço…" className="pl-9 h-9" />
        </div>
        <Select value={areaFilter} onValueChange={(v) => setAreaFilter(v as ServiceArea | "todas")}> 
          <SelectTrigger className="h-9"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas as categorias</SelectItem>
            <SelectItem value="medica">Médica</SelectItem>
            <SelectItem value="odontologica">Odontológica</SelectItem>
            <SelectItem value="ambas">Médica e odontológica</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border border-border/60 overflow-hidden">
        <div className="grid grid-cols-[28px_1fr_150px_auto_auto] gap-0 text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-3 py-2">
          <div />
          <div>Serviço</div>
          <div>Categoria</div>
          <div className="px-3 text-center min-w-[150px]">TCLE</div>
          <div className="px-3 text-center min-w-[150px]">POP</div>
        </div>
        <div className="divide-y divide-border/60 max-h-[520px] overflow-auto">
          {rows.map((s) => {
            const idT = serviceAnswerId("tcle", s);
            const idP = serviceAnswerId("pop", s);
            const aT = answers[idT]?.answer ?? null;
            const aP = answers[idP]?.answer ?? null;
            const dim = aT === "na" && aP === "na";
            const isOver = overId === s.id && dragId && dragId !== s.id;
            return (
              <div
                key={s.id}
                onDragEnter={(e) => { if (!readOnly) { e.preventDefault(); if (dragId && dragId !== s.id) setOverId(s.id); } }}
                onDragOver={(e) => { if (!readOnly && dragId) { e.preventDefault(); e.dataTransfer.dropEffect = "move"; } }}
                onDragLeave={() => { if (overId === s.id) setOverId(null); }}
                onDrop={(e) => { if (!readOnly) { e.preventDefault(); handleDrop(s.id); } }}
                onDragEnd={() => { setDragId(null); setOverId(null); }}
                className={cn("grid grid-cols-[28px_1fr_150px_auto_auto] items-center px-3 py-1.5 transition-all", dim && "opacity-40", isOver && "bg-primary/10 outline outline-1 outline-primary/40")}
              >
                <span
                  title="Arrastar para reordenar"
                  draggable={!readOnly}
                  onDragStart={(e) => { setDragId(s.id); e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", s.id); }}
                  className="w-6 h-7 inline-flex items-center justify-center text-muted-foreground hover:text-primary cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </span>
                <div className="flex items-center gap-2 min-w-0 pr-3">
                  {!readOnly && clientId && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button type="button" onClick={() => setEditItem(s)} title="Editar procedimento" className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-primary hover:bg-primary/10"><Pencil className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => setDeleteItem(s)} title="Excluir procedimento" className="w-6 h-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-danger hover:bg-danger/10"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                  <span className="text-sm text-foreground truncate" title={s.name}>{s.name}</span>
                </div>
                <div><Badge variant="outline" className="max-w-[138px] truncate">{AREA_LABELS[s.area]}</Badge></div>
                <div className="px-3 text-center"><Cell current={aT} onChange={(v) => setAnswer(idT, v)} readOnly={readOnly} /></div>
                <div className="px-3 text-center"><Cell current={aP} onChange={(v) => setAnswer(idP, v)} readOnly={readOnly} /></div>
              </div>
            );
          })}
          {rows.length === 0 && <div className="px-3 py-6 text-sm text-muted-foreground text-center">Nenhum serviço encontrado para "{q}".</div>}
        </div>
      </div>

      <ServiceFormDialog open={creating} onClose={() => setCreating(false)} onSave={async (name, area) => { await addItem(name, area); setCreating(false); toast.success("Procedimento criado"); }} />
      <ServiceFormDialog open={!!editItem} item={editItem} onClose={() => setEditItem(null)} onSave={async (name, area) => { if (editItem) await updateItem(editItem, name, area); setEditItem(null); toast.success("Procedimento salvo"); }} />

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
    </Card>
  );
}

function ServiceFormDialog({ open, item, onClose, onSave }: { open: boolean; item?: ServiceMatrixItem | null; onClose: () => void; onSave: (name: string, area: ServiceArea) => Promise<void> }) {
  const [name, setName] = useState("");
  const [area, setArea] = useState<ServiceArea>("ambas");
  const [busy, setBusy] = useState(false);

  useMemo(() => {
    if (open) {
      setName(item?.name ?? "");
      setArea(item?.area ?? "ambas");
      setBusy(false);
    }
  }, [open, item]);

  const save = async () => {
    if (!name.trim()) return toast.error("Informe o nome do procedimento.");
    setBusy(true);
    try { await onSave(name.trim(), area); } catch (error) { toast.error(error instanceof Error ? error.message : "Não foi possível salvar."); }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{item ? "Editar procedimento" : "Novo procedimento"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Procedimento</Label><Textarea value={name} onChange={(e) => setName(e.target.value)} rows={2} /></div>
          <div>
            <Label>Categoria</Label>
            <Select value={area} onValueChange={(v) => setArea(v as ServiceArea)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="medica">Médica</SelectItem>
                <SelectItem value="odontologica">Odontológica</SelectItem>
                <SelectItem value="ambas">Médica e odontológica</SelectItem>
              </SelectContent>
            </Select>
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

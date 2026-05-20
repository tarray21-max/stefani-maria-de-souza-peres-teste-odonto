import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useClients } from "@/lib/client-context";
import { copyClientStructure } from "@/lib/copy-structure";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; sourceId: string; }

export function PropagateStructureDialog({ open, onOpenChange, sourceId }: Props) {
  const { clients } = useClients();
  const others = clients.filter((c) => c.id !== sourceId);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggle = (id: string) => {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const apply = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      const { copied } = await copyClientStructure(sourceId, Array.from(selected));
      toast.success(`Estrutura aplicada em ${copied} painel(éis).`);
      onOpenChange(false);
      setSelected(new Set());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Aplicar estrutura em outros painéis</DialogTitle>
        </DialogHeader>

        <div className="rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300 text-xs p-3 flex gap-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div>
            Isso substitui perguntas customizadas, blocos, abas, ordens e itens desativados
            dos painéis selecionados pela estrutura deste painel.
            <br />
            <strong>As respostas dos itens padrão são preservadas.</strong>
            Respostas a perguntas customizadas que existiam apenas no destino serão perdidas.
          </div>
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {others.length === 0 && <p className="text-xs text-muted-foreground">Nenhum outro painel disponível.</p>}
          {others.map((c) => (
            <label key={c.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/60 cursor-pointer">
              <Checkbox checked={selected.has(c.id)} onCheckedChange={() => toggle(c.id)} />
              <span className="text-sm flex-1 truncate">{c.nome}</span>
            </label>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancelar</Button>
          <Button onClick={apply} disabled={busy || selected.size === 0}>
            {busy ? "Aplicando…" : `Aplicar a ${selected.size} painel(éis)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

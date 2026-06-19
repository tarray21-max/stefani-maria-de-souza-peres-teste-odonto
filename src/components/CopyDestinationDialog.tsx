import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useClients } from "@/lib/client-context";
import { listBlocks, type BlockOption } from "@/lib/copy-utils";
import { toast } from "sonner";

export interface CopyDestinationDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  /** Category used to list blocks at the target. */
  category: string;
  /** Source client (to exclude from "other clinics" if desired). */
  sourceClientId: string;
  /** When false, "Bloco destino" picker is hidden (e.g. copying a whole block). */
  allowBlockPick?: boolean;
  onConfirm: (targetClientId: string, targetBlockId: string | null) => Promise<void>;
}

export function CopyDestinationDialog({
  open, onClose, title, description, category, sourceClientId, allowBlockPick = true, onConfirm,
}: CopyDestinationDialogProps) {
  const { clients } = useClients();
  const [targetClientId, setTargetClientId] = useState<string>(sourceClientId);
  const [targetBlockId, setTargetBlockId] = useState<string>("__none");
  const [blocks, setBlocks] = useState<BlockOption[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTargetClientId(sourceClientId);
      setTargetBlockId("__none");
      setBusy(false);
    }
  }, [open, sourceClientId]);

  useEffect(() => {
    if (!open || !allowBlockPick || !targetClientId) { setBlocks([]); return; }
    let cancelled = false;
    void listBlocks(targetClientId, category).then((b) => { if (!cancelled) setBlocks(b); });
    return () => { cancelled = true; };
  }, [open, allowBlockPick, targetClientId, category]);

  const clientOptions = useMemo(() => clients.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")), [clients]);

  const confirm = async () => {
    if (!targetClientId) return;
    setBusy(true);
    try {
      await onConfirm(targetClientId, allowBlockPick && targetBlockId !== "__none" ? targetBlockId : null);
      toast.success("Cópia concluída");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível copiar.");
    }
    setBusy(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <div className="space-y-3">
          <div>
            <Label>Clínica destino</Label>
            <Select value={targetClientId} onValueChange={setTargetClientId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {clientOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nome}{c.id === sourceClientId ? " (mesma clínica)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {allowBlockPick && (
            <div>
              <Label>Bloco destino (opcional)</Label>
              <Select value={targetBlockId} onValueChange={setTargetBlockId}>
                <SelectTrigger><SelectValue placeholder="Sem bloco" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Sem bloco (entra em "Demais")</SelectItem>
                  {blocks.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancelar</Button>
          <Button onClick={confirm} disabled={busy || !targetClientId}>{busy ? "Copiando…" : "Copiar"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

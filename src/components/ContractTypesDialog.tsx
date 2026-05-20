import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useContractTypes } from "@/lib/contract-types";
import { Plus, Trash2, Pencil, Check, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function ContractTypesDialog({ open, onOpenChange }: Props) {
  const { items, add, update, remove } = useContractTypes();
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const handleAdd = async () => {
    if (!newLabel.trim()) return;
    await add(newLabel);
    setNewLabel("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tipos de contrato</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Ex.: Consultoria Médica"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button onClick={handleAdd} size="icon" title="Adicionar">
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-1 max-h-72 overflow-auto">
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground py-4 text-center">Nenhum tipo personalizado.</p>
            )}
            {items.map((t) => (
              <div key={t.id} className="flex items-center gap-2 group p-2 rounded hover:bg-muted/60">
                {editingId === t.id ? (
                  <>
                    <Input
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={async () => {
                        await update(t.id, editingLabel);
                        setEditingId(null);
                      }}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(null)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm truncate">{t.label}</span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        setEditingId(t.id);
                        setEditingLabel(t.label);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:text-destructive"
                      onClick={() => remove(t.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

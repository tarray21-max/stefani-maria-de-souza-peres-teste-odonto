import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useClients, type ClientRow } from "@/lib/client-context";
import { toast } from "sonner";
import { Building2, Plus, Save } from "lucide-react";

export function ClientIdentification() {
  const { user } = useAuth();
  const { current, setCurrentId, refresh } = useClients();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<Partial<ClientRow>>(() => current ?? { area: "odontologia", tipo_contrato: "assessoria_odontologica" });

  const startNew = () => {
    setDraft({ area: "odontologia", tipo_contrato: "assessoria_odontologica", nome: "" });
    setEditing(true);
  };
  const startEdit = () => {
    setDraft(current ?? {});
    setEditing(true);
  };

  const save = async () => {
    if (!user) return;
    if (!draft.nome?.trim()) return toast.error("Informe o nome da clínica");
    setBusy(true);
    if (draft.id) {
      const { error } = await supabase
        .from("clients")
        .update({
          nome: draft.nome,
          cnpj: draft.cnpj ?? null,
          profissional_responsavel: draft.profissional_responsavel ?? null,
          area: (draft.area as "odontologia" | "medicina") ?? "odontologia",
          especialidade: draft.especialidade ?? null,
          endereco: draft.endereco ?? null,
          telefone: draft.telefone ?? null,
          tipo_contrato: (draft.tipo_contrato as "assessoria_odontologica" | "regularizacao_sanitaria") ?? "assessoria_odontologica",
        })
        .eq("id", draft.id);
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
    } else {
      const { data, error } = await supabase
        .from("clients")
        .insert({
          owner_id: user.id,
          nome: draft.nome,
          cnpj: draft.cnpj ?? null,
          profissional_responsavel: draft.profissional_responsavel ?? null,
          area: (draft.area as "odontologia" | "medicina") ?? "odontologia",
          especialidade: draft.especialidade ?? null,
          endereco: draft.endereco ?? null,
          telefone: draft.telefone ?? null,
          tipo_contrato: (draft.tipo_contrato as "assessoria_odontologica" | "regularizacao_sanitaria") ?? "assessoria_odontologica",
        })
        .select()
        .single();
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
      if (data) setCurrentId(data.id);
    }
    setBusy(false);
    setEditing(false);
    await refresh();
    toast.success("Cliente salvo");
  };

  if (!editing && current) {
    return (
      <Card className="p-4 border-border/60 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-foreground">{current.nome}</div>
              <div className="text-xs text-muted-foreground truncate">
                {[current.area === "odontologia" ? "Odontologia" : "Medicina", current.especialidade, current.cnpj]
                  .filter(Boolean)
                  .join(" • ")}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {[current.profissional_responsavel, current.telefone, current.endereco].filter(Boolean).join(" • ")}
              </div>
              <div className="text-[10px] mt-1 inline-block px-2 py-0.5 rounded-full bg-muted uppercase tracking-wider">
                {current.tipo_contrato === "assessoria_odontologica" ? "Assessoria Odontológica" : "Regularização Sanitária"}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={startEdit}>Editar</Button>
            <Button variant="outline" size="sm" onClick={startNew}><Plus className="w-3 h-3 mr-1" />Novo</Button>
          </div>
        </div>
      </Card>
    );
  }

  if (!editing && !current) {
    return (
      <Card className="p-6 border-border/60 mb-6 text-center">
        <Building2 className="w-8 h-8 mx-auto text-primary mb-2" />
        <h3 className="font-semibold text-foreground">Cadastre sua primeira clínica</h3>
        <p className="text-sm text-muted-foreground mb-4">Identifique o estabelecimento para iniciar o painel.</p>
        <Button onClick={startNew}><Plus className="w-4 h-4 mr-1" />Cadastrar clínica</Button>
      </Card>
    );
  }

  return (
    <Card className="p-5 border-border/60 mb-6 space-y-3">
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Nome da Clínica *</Label>
          <Input value={draft.nome ?? ""} onChange={(e) => setDraft({ ...draft, nome: e.target.value })} />
        </div>
        <div>
          <Label>CNPJ</Label>
          <Input value={draft.cnpj ?? ""} onChange={(e) => setDraft({ ...draft, cnpj: e.target.value })} />
        </div>
        <div>
          <Label>Profissional Responsável</Label>
          <Input value={draft.profissional_responsavel ?? ""} onChange={(e) => setDraft({ ...draft, profissional_responsavel: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label>Área</Label>
            <Select value={draft.area ?? "odontologia"} onValueChange={(v) => setDraft({ ...draft, area: v as "odontologia" | "medicina" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="odontologia">Odontologia</SelectItem>
                <SelectItem value="medicina">Medicina</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Especialidade</Label>
            <Input value={draft.especialidade ?? ""} onChange={(e) => setDraft({ ...draft, especialidade: e.target.value })} />
          </div>
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={draft.telefone ?? ""} onChange={(e) => setDraft({ ...draft, telefone: e.target.value })} />
        </div>
        <div>
          <Label>Tipo de Contrato</Label>
          <Select
            value={draft.tipo_contrato ?? "assessoria_odontologica"}
            onValueChange={(v) => setDraft({ ...draft, tipo_contrato: v as "assessoria_odontologica" | "regularizacao_sanitaria" })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="assessoria_odontologica">Assessoria Odontológica</SelectItem>
              <SelectItem value="regularizacao_sanitaria">Regularização Sanitária</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Endereço</Label>
        <Textarea rows={2} value={draft.endereco ?? ""} onChange={(e) => setDraft({ ...draft, endereco: e.target.value })} />
      </div>
      <div className="flex justify-end gap-2">
        {current && <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>}
        <Button onClick={save} disabled={busy}><Save className="w-4 h-4 mr-1" />{busy ? "Salvando…" : "Salvar"}</Button>
      </div>
    </Card>
  );
}

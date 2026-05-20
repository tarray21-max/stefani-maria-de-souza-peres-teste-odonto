import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useClients, contractLabel, type ClientRow } from "@/lib/client-context";
import { useContractTypes, PRESET_CONTRACT_TYPES } from "@/lib/contract-types";
import { ContractTypesDialog } from "./ContractTypesDialog";
import { ShareClientDialog } from "./ShareClientDialog";
import { toast } from "sonner";
import { Building2, Plus, Save, Settings2, Share2 } from "lucide-react";

type ContractValue =
  | { kind: "preset"; value: "assessoria_odontologica" | "regularizacao_sanitaria" }
  | { kind: "custom"; label: string };

const PRESET_VALUES = new Set(PRESET_CONTRACT_TYPES.map((p) => p.value));

function parseContractSelect(raw: string): ContractValue {
  if (raw.startsWith("custom:")) return { kind: "custom", label: raw.slice("custom:".length) };
  return { kind: "preset", value: raw as "assessoria_odontologica" | "regularizacao_sanitaria" };
}

function serializeContract(c: Pick<ClientRow, "tipo_contrato" | "contract_type_label">): string {
  if (c.contract_type_label && c.contract_type_label.trim()) return `custom:${c.contract_type_label}`;
  return c.tipo_contrato;
}

export function ClientIdentification() {
  const { user } = useAuth();
  const { current, setCurrentId, refresh } = useClients();
  const { items: contractTypes } = useContractTypes();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<ClientRow>>(() => current ?? { area: "odontologia", tipo_contrato: "assessoria_odontologica", contract_type_label: null });

  const startNew = () => {
    setDraft({ area: "odontologia", tipo_contrato: "assessoria_odontologica", contract_type_label: null, nome: "" });
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
    const tipo = (PRESET_VALUES.has(draft.tipo_contrato ?? "") ? draft.tipo_contrato : "assessoria_odontologica") as "assessoria_odontologica" | "regularizacao_sanitaria";
    const payload = {
      nome: draft.nome,
      cnpj: draft.cnpj ?? null,
      profissional_responsavel: draft.profissional_responsavel ?? null,
      area: (draft.area as "odontologia" | "medicina") ?? "odontologia",
      especialidade: draft.especialidade ?? null,
      endereco: draft.endereco ?? null,
      telefone: draft.telefone ?? null,
      tipo_contrato: tipo,
      contract_type_label: draft.contract_type_label ?? null,
    };
    if (draft.id) {
      const { error } = await supabase.from("clients").update(payload).eq("id", draft.id);
      if (error) { setBusy(false); return toast.error(error.message); }
    } else {
      const { error } = await supabase.from("clients").insert({ ...payload, owner_id: user.id });
      if (error) { setBusy(false); return toast.error(error.message); }
      const { data: list } = await supabase
        .from("clients")
        .select("id, nome, created_at")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (list && list[0]) setCurrentId(list[0].id);
    }
    setBusy(false);
    setEditing(false);
    await refresh();
    toast.success("Cliente salvo");
  };

  const selectValue = serializeContract({
    tipo_contrato: (draft.tipo_contrato as ClientRow["tipo_contrato"]) ?? "assessoria_odontologica",
    contract_type_label: draft.contract_type_label ?? null,
  });

  const handleContractChange = (raw: string) => {
    const parsed = parseContractSelect(raw);
    if (parsed.kind === "preset") {
      setDraft({ ...draft, tipo_contrato: parsed.value, contract_type_label: null });
    } else {
      setDraft({ ...draft, contract_type_label: parsed.label });
    }
  };

  if (!editing && current) {
    return (
      <>
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
                  {contractLabel(current)}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}><Share2 className="w-3 h-3 mr-1" />Compartilhar</Button>
              <Button variant="outline" size="sm" onClick={startEdit}>Editar</Button>
              <Button variant="outline" size="sm" onClick={startNew}><Plus className="w-3 h-3 mr-1" />Novo</Button>
            </div>
          </div>
        </Card>
        <ShareClientDialog open={shareOpen} onOpenChange={setShareOpen} clientId={current.id} clientName={current.nome} />
      </>
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
          <div className="flex items-center justify-between">
            <Label>Tipo de Contrato</Label>
            <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setTypesOpen(true)}>
              <Settings2 className="w-3 h-3 mr-1" />Gerenciar
            </Button>
          </div>
          <Select value={selectValue} onValueChange={handleContractChange}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PRESET_CONTRACT_TYPES.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
              {contractTypes.length > 0 && <SelectSeparator />}
              {contractTypes.map((t) => (
                <SelectItem key={t.id} value={`custom:${t.label}`}>{t.label}</SelectItem>
              ))}
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
      <ContractTypesDialog open={typesOpen} onOpenChange={setTypesOpen} />
    </Card>
  );
}

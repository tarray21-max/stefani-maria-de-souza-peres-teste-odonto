import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { useClients, contractLabel, type ClientRow, type AreaAtuacao } from "@/lib/client-context";
import { Checkbox } from "@/components/ui/checkbox";
import { useContractTypes, PRESET_CONTRACT_TYPES } from "@/lib/contract-types";
import { ContractTypesDialog } from "./ContractTypesDialog";
import { ShareClientDialog } from "./ShareClientDialog";
import { toast } from "sonner";
import { Building2, Plus, Save, Settings2, Share2 } from "lucide-react";

type ContractValue =
  | { kind: "preset"; value: "assessoria_odontologica" | "assessoria_medica" | "regularizacao_sanitaria" }
  | { kind: "custom"; label: string };

const PRESET_VALUES = new Set(PRESET_CONTRACT_TYPES.map((p) => p.value));

function parseContractSelect(raw: string): ContractValue {
  if (raw.startsWith("custom:")) return { kind: "custom", label: raw.slice("custom:".length) };
  return { kind: "preset", value: raw as "assessoria_odontologica" | "assessoria_medica" | "regularizacao_sanitaria" };
}

function serializeContract(c: Pick<ClientRow, "tipo_contrato" | "contract_type_label">): string {
  if (c.contract_type_label && c.contract_type_label.trim()) return `custom:${c.contract_type_label}`;
  return c.tipo_contrato;
}

const AREA_OPTIONS: { value: AreaAtuacao; label: string }[] = [
  { value: "medicina", label: "Médica" },
  { value: "odontologia", label: "Odontológica" },
  { value: "biomedicina", label: "Biomédica" },
];

const AREA_LABEL: Record<AreaAtuacao, string> = {
  medicina: "Médica",
  odontologia: "Odontológica",
  biomedicina: "Biomédica",
};

export function ClientIdentification() {
  const { user } = useAuth();
  const { current, setCurrentId, refresh } = useClients();
  const { items: contractTypes } = useContractTypes();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [typesOpen, setTypesOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<ClientRow>>(() => current ?? { area: "odontologia", areas: ["odontologia"], tipo_contrato: "assessoria_odontologica", contract_type_label: null });

  const startNew = () => {
    setDraft({ area: "odontologia", areas: ["odontologia"], especialidades: [], tipo_contrato: "assessoria_odontologica", contract_type_label: null, nome: "" });
    setEditing(true);
  };
  const startEdit = () => {
    setDraft(current ?? {});
    setEditing(true);
  };

  const toggleArea = (value: AreaAtuacao) => {
    const cur = draft.areas ?? (draft.area ? [draft.area] : []);
    const next = cur.includes(value) ? cur.filter((a) => a !== value) : [...cur, value];
    setDraft({ ...draft, areas: next, area: (next[0] ?? draft.area ?? "odontologia") as AreaAtuacao });
  };

  const save = async () => {
    if (!user) return;
    if (!draft.nome?.trim()) return toast.error("Informe o nome da clínica");
    const areas = (draft.areas && draft.areas.length > 0 ? draft.areas : (draft.area ? [draft.area] : [])) as AreaAtuacao[];
    if (areas.length === 0) return toast.error("Selecione ao menos uma categoria");
    setBusy(true);
    const tipo = (PRESET_VALUES.has(draft.tipo_contrato ?? "") ? draft.tipo_contrato : "assessoria_odontologica") as "assessoria_odontologica" | "assessoria_medica" | "regularizacao_sanitaria";
    // `area` column only accepts the legacy enum (odontologia | medicina); pick a compatible primary
    const legacyArea = (areas.find((a) => a === "odontologia" || a === "medicina") ?? "odontologia") as "odontologia" | "medicina";
    const especialidades = (draft.especialidades ?? []).map((s) => s.trim()).filter(Boolean);
    const payload = {
      nome: draft.nome,
      cnpj: draft.cnpj ?? null,
      profissional_responsavel: draft.profissional_responsavel ?? null,
      area: legacyArea,
      areas,
      especialidade: especialidades[0] ?? draft.especialidade ?? null,
      especialidades,
      endereco: draft.endereco ?? null,
      telefone: draft.telefone ?? null,
      tipo_contrato: tipo,
      contract_type_label: draft.contract_type_label ?? null,
    };
    if (draft.id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("clients").update(payload as any).eq("id", draft.id);
      if (error) { setBusy(false); return toast.error(error.message); }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("clients").insert({ ...payload, owner_id: user.id } as any);
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
                  {[
                    (current.areas && current.areas.length > 0 ? current.areas : [current.area]).map((a) => AREA_LABEL[a] ?? a).join(" + "),
                    (current.especialidades && current.especialidades.length > 0 ? current.especialidades.join(", ") : current.especialidade),
                    current.cnpj,
                  ].filter(Boolean).join(" • ")}
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
            <Label>Categorias</Label>
            <div className="border rounded-md p-2 space-y-1.5 bg-background">
              {AREA_OPTIONS.map((opt) => {
                const checked = (draft.areas ?? (draft.area ? [draft.area] : [])).includes(opt.value);
                return (
                  <label key={opt.value} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={() => toggleArea(opt.value)} />
                    <span>{opt.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div>
            <Label>Especialidades</Label>
            <div className="border rounded-md p-2 bg-background min-h-9 flex flex-wrap gap-1.5 items-center">
              {(draft.especialidades ?? []).map((esp, idx) => (
                <span key={`${esp}-${idx}`} className="inline-flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full">
                  {esp}
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => setDraft({ ...draft, especialidades: (draft.especialidades ?? []).filter((_, i) => i !== idx) })}
                    aria-label={`Remover ${esp}`}
                  >×</button>
                </span>
              ))}
              <input
                className="flex-1 min-w-[8ch] bg-transparent outline-none text-sm py-0.5"
                placeholder="Digite e pressione Enter"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    const val = (e.currentTarget.value ?? "").trim();
                    if (!val) return;
                    const cur = draft.especialidades ?? [];
                    if (!cur.includes(val)) setDraft({ ...draft, especialidades: [...cur, val] });
                    e.currentTarget.value = "";
                  } else if (e.key === "Backspace" && !(e.currentTarget.value ?? "")) {
                    const cur = draft.especialidades ?? [];
                    if (cur.length > 0) setDraft({ ...draft, especialidades: cur.slice(0, -1) });
                  }
                }}
                onBlur={(e) => {
                  const val = (e.currentTarget.value ?? "").trim();
                  if (!val) return;
                  const cur = draft.especialidades ?? [];
                  if (!cur.includes(val)) setDraft({ ...draft, especialidades: [...cur, val] });
                  e.currentTarget.value = "";
                }}
              />
            </div>
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

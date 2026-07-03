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

const ODONTO_ESPECIALIDADES = [
  "Dentística",
  "Endodontia",
  "Periodontia",
  "Prótese Dentária",
  "Ortodontia",
  "Implantodontia",
  "Odontopediatria",
  "Odontogeriatria",
  "Estomatologia",
  "Ortopedia Funcional dos Maxilares",
  "Disfunção Temporomandibular e Dor Orofacial (DTM)",
  "Odontologia para Pacientes com Necessidades Especiais",
  "Cirurgia e Traumatologia Bucomaxilofacial (CTBMF)",
  "Cirurgia Estética Orofacial (CEOF)",
  "Harmonização Orofacial (HOF)",
  "Radiologia Odontológica e Imaginologia",
  "Patologia Oral (Patologia Bucal)",
  "Odontologia em Saúde Coletiva",
  "Odontologia Legal",
  "Odontologia do Trabalho",
  "Odontologia Hospitalar",
  "Homeopatia",
  "Acupuntura",
];

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
    const numeros = (draft.especialidades_numeros ?? []).slice(0, especialidades.length);
    while (numeros.length < especialidades.length) numeros.push("");
    const payload = {
      nome: draft.nome,
      cnpj: draft.cnpj ?? null,
      profissional_responsavel: draft.profissional_responsavel ?? null,
      crm_cro: draft.crm_cro ?? null,
      area: legacyArea,
      areas,
      especialidade: especialidades[0] ?? draft.especialidade ?? null,
      especialidades,
      especialidades_numeros: numeros,
      endereco: draft.endereco ?? null,
      telefone: draft.telefone ?? null,
      redes_sociais: draft.redes_sociais ?? null,
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
                <div className="text-xs text-muted-foreground break-words">
                  {[
                    (current.areas && current.areas.length > 0 ? current.areas : [current.area]).map((a) => AREA_LABEL[a] ?? a).join(" + "),
                    current.cnpj,
                  ].filter(Boolean).join(" • ")}
                </div>
                {(current.especialidades && current.especialidades.length > 0) && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {current.especialidades.map((e, i) => {
                      const n = (current.especialidades_numeros ?? [])[i];
                      return (
                        <span key={`${e}-${i}`} className="inline-flex items-center rounded-full bg-primary/10 text-primary px-2.5 py-0.5 text-xs font-medium">
                          {n ? `${e} (${n})` : e}
                        </span>
                      );
                    })}
                  </div>
                )}
                <div className="text-xs text-muted-foreground break-words mt-1 space-y-0.5">
                  {(current.profissional_responsavel || current.crm_cro) && (
                    <div>{[current.profissional_responsavel, current.crm_cro].filter(Boolean).join(" — ")}</div>
                  )}
                  {current.telefone && <div>Tel.: {current.telefone}</div>}
                  {(() => {
                    const rua = [current.logradouro, current.numero].filter(Boolean).join(", ");
                    const compl = current.complemento;
                    const bairro = current.bairro;
                    const cidUf = [current.cidade, current.estado].filter(Boolean).join("/");
                    const cep = current.cep ? `CEP ${current.cep}` : null;
                    const fullAddr = [rua, compl, bairro, cidUf, cep].filter(Boolean).join(" — ");
                    return fullAddr ? <div>{fullAddr}</div> : null;
                  })()}
                  {current.endereco && <div>{current.endereco}</div>}
                  {current.redes_sociais && <div>Redes sociais: {current.redes_sociais}</div>}
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
        <div>
          <Label>CRM / CRO do Responsável</Label>
          <Input placeholder="Ex.: CRM/SP 123456" value={draft.crm_cro ?? ""} onChange={(e) => setDraft({ ...draft, crm_cro: e.target.value })} />
        </div>
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
          <Label>Especialidades e nº de registro</Label>
          {(() => {
            const areasSel = (draft.areas ?? (draft.area ? [draft.area] : [])) as AreaAtuacao[];
            const isOdonto = areasSel.includes("odontologia");
            const esps = draft.especialidades ?? [];
            const nums = draft.especialidades_numeros ?? [];
            const setEsp = (list: string[], numsList: string[]) => {
              setDraft({ ...draft, especialidades: list, especialidades_numeros: numsList });
            };
            const toggle = (name: string) => {
              const idx = esps.indexOf(name);
              if (idx >= 0) {
                setEsp(esps.filter((_, i) => i !== idx), nums.filter((_, i) => i !== idx));
              } else {
                setEsp([...esps, name], [...nums, ""]);
              }
            };
            const setNum = (name: string, value: string) => {
              const idx = esps.indexOf(name);
              if (idx < 0) return;
              const nextNums = [...nums];
              while (nextNums.length <= idx) nextNums.push("");
              nextNums[idx] = value;
              setEsp(esps, nextNums);
            };
            if (isOdonto) {
              const extras = esps.filter((e) => !ODONTO_ESPECIALIDADES.includes(e));
              return (
                <div className="border rounded-md p-2 bg-background space-y-1 max-h-72 overflow-y-auto">
                  {ODONTO_ESPECIALIDADES.map((name) => {
                    const checked = esps.includes(name);
                    return (
                      <div key={name} className="flex items-center gap-2">
                        <label className="flex items-center gap-2 text-sm cursor-pointer flex-1 min-w-0">
                          <Checkbox checked={checked} onCheckedChange={() => toggle(name)} />
                          <span className="break-words">{name}</span>
                        </label>
                        {checked && (
                          <Input
                            className="h-7 text-xs w-36"
                            placeholder="Nº registro"
                            value={nums[esps.indexOf(name)] ?? ""}
                            onChange={(e) => setNum(name, e.target.value)}
                          />
                        )}
                      </div>
                    );
                  })}
                  {extras.length > 0 && (
                    <div className="pt-2 mt-2 border-t space-y-1.5">
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Outras</div>
                      {extras.map((esp) => {
                        const idx = esps.indexOf(esp);
                        return (
                          <div key={`extra-${idx}`} className="flex items-center gap-1.5">
                            <Input
                              className="h-7 text-xs flex-1"
                              value={esp}
                              onChange={(e) => {
                                const next = [...esps];
                                next[idx] = e.target.value;
                                setEsp(next, nums);
                              }}
                            />
                            <Input
                              className="h-7 text-xs w-36"
                              placeholder="Nº registro"
                              value={nums[idx] ?? ""}
                              onChange={(e) => setNum(esp, e.target.value)}
                            />
                            <button
                              type="button"
                              className="w-6 h-6 inline-flex items-center justify-center text-muted-foreground hover:text-danger"
                              onClick={() => setEsp(esps.filter((_, i) => i !== idx), nums.filter((_, i) => i !== idx))}
                            >×</button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline mt-2"
                    onClick={() => setEsp([...esps, ""], [...nums, ""])}
                  >+ Adicionar outra especialidade</button>
                </div>
              );
            }
            return (
              <div className="border rounded-md p-2 bg-background space-y-1.5">
                {esps.map((esp, idx) => (
                  <div key={`${esp}-${idx}`} className="flex items-center gap-1.5">
                    <Input
                      className="h-8 text-sm flex-1"
                      value={esp}
                      onChange={(e) => {
                        const next = [...esps];
                        next[idx] = e.target.value;
                        setEsp(next, nums);
                      }}
                    />
                    <Input
                      className="h-8 text-sm w-40"
                      placeholder="Nº registro (RQE/título)"
                      value={nums[idx] ?? ""}
                      onChange={(e) => {
                        const next = [...nums];
                        while (next.length <= idx) next.push("");
                        next[idx] = e.target.value;
                        setEsp(esps, next);
                      }}
                    />
                    <button
                      type="button"
                      className="w-7 h-7 inline-flex items-center justify-center text-muted-foreground hover:text-danger"
                      onClick={() => setEsp(esps.filter((_, i) => i !== idx), nums.filter((_, i) => i !== idx))}
                      aria-label={`Remover ${esp}`}
                    >×</button>
                  </div>
                ))}
                <button
                  type="button"
                  className="text-xs text-primary hover:underline mt-1"
                  onClick={() => setEsp([...esps, ""], [...nums, ""])}
                >+ Adicionar especialidade</button>
              </div>
            );
          })()}
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
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Endereço completo</Label>
          <Textarea rows={2} placeholder="Rua, número, complemento, bairro, cidade/UF, CEP" value={draft.endereco ?? ""} onChange={(e) => setDraft({ ...draft, endereco: e.target.value })} />
        </div>
        <div>
          <Label>Redes sociais</Label>
          <Textarea rows={2} placeholder="Instagram: @clinica • Site: www.clinica.com.br" value={draft.redes_sociais ?? ""} onChange={(e) => setDraft({ ...draft, redes_sociais: e.target.value })} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        {current && <Button variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>}
        <Button onClick={save} disabled={busy}><Save className="w-4 h-4 mr-1" />{busy ? "Salvando…" : "Salvar"}</Button>
      </div>
      <ContractTypesDialog open={typesOpen} onOpenChange={setTypesOpen} />
    </Card>
  );
}

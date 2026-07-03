import { useState, useEffect } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuAction, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useClients, type ClientRow } from "@/lib/client-context";
import { useContractTypes, PRESET_CONTRACT_TYPES } from "@/lib/contract-types";
import { ContractTypesDialog } from "./ContractTypesDialog";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { formatCNPJ, formatPhone } from "@/lib/format";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Trash2, LogOut, Users, Copy } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { proceduresForSpecialties } from "@/lib/odonto-procedures";
import { SERVICOS_TCLE_POP } from "@/lib/services-data";

function normalizeName(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

async function syncProceduresForClient(clientId: string, especialidades: string[]) {
  const desired = proceduresForSpecialties(especialidades);
  if (desired.length === 0) return;
  const { data: existing } = await (supabase as any)
    .from("service_matrix_items")
    .select("name,default_key,position")
    .eq("client_id", clientId);
  const takenNames = new Set<string>();
  let maxPos = -1;
  for (const r of (existing ?? []) as { name: string; position: number }[]) {
    takenNames.add(normalizeName(r.name));
    if (r.position > maxPos) maxPos = r.position;
  }
  // Also dedup against built-in defaults (which exist implicitly even without rows).
  for (const n of SERVICOS_TCLE_POP) takenNames.add(normalizeName(n));

  const toInsert = desired
    .filter((n) => !takenNames.has(normalizeName(n)))
    .map((name, i) => ({
      client_id: clientId,
      name,
      area: "odontologica",
      categories: ["cirurgioes_dentistas"],
      is_default: false,
      disabled: false,
      position: maxPos + 1 + i,
      norma: "",
      observacao: "",
    }));
  if (toInsert.length === 0) return;
  await (supabase as any).from("service_matrix_items").insert(toInsert);
}

const ODONTO_ESPECIALIDADES = [
  "Dentística","Endodontia","Periodontia","Prótese Dentária","Ortodontia","Implantodontia",
  "Odontopediatria","Odontogeriatria","Estomatologia","Ortopedia Funcional dos Maxilares",
  "Disfunção Temporomandibular e Dor Orofacial (DTM)","Odontologia para Pacientes com Necessidades Especiais",
  "Cirurgia e Traumatologia Bucomaxilofacial (CTBMF)","Cirurgia Estética Orofacial (CEOF)",
  "Harmonização Orofacial (HOF)","Radiologia Odontológica e Imaginologia","Patologia Oral (Patologia Bucal)",
  "Odontologia em Saúde Coletiva","Odontologia Legal","Odontologia do Trabalho","Odontologia Hospitalar",
  "Homeopatia","Acupuntura",
];
import brandLogo from "@/assets/bs-logo-on-white.jpg";
import { AccountShareDialog } from "./AccountShareDialog";
import { PropagateStructureDialog } from "./PropagateStructureDialog";

export function ClientSidebar({ onSignOut }: { onSignOut: () => void }) {
  const { clients, current, setCurrentId, refresh } = useClients();
  const { user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [editing, setEditing] = useState<Partial<ClientRow> | null>(null);
  const [typesOpen, setTypesOpen] = useState(false);
  const [accountShareOpen, setAccountShareOpen] = useState(false);
  const [propagateOpen, setPropagateOpen] = useState(false);
  const { items: contractTypes } = useContractTypes();
  const PRESET_VALUES = new Set(PRESET_CONTRACT_TYPES.map((p) => p.value));

  const startNew = () => setEditing({ area: "odontologia", tipo_contrato: "assessoria_odontologica", contract_type_label: null, nome: "" });
  const startEdit = (c: ClientRow) => setEditing(c);

  useEffect(() => {
    const handler = () => { if (current) startEdit(current); };
    window.addEventListener("edit-client", handler);
    return () => window.removeEventListener("edit-client", handler);
  }, [current]);

  const remove = async (c: ClientRow) => {
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Clínica removida");
    await refresh();
  };

  const save = async () => {
    if (!user || !editing) return;
    if (!editing.nome?.trim()) return toast.error("Informe o nome da clínica");
    const tipo = (PRESET_VALUES.has(editing.tipo_contrato ?? "") ? editing.tipo_contrato : "assessoria_odontologica") as "assessoria_odontologica" | "assessoria_medica" | "regularizacao_sanitaria";
    const area = (editing.area ?? "odontologia") as "odontologia" | "medicina";
    const areas = (editing.areas && editing.areas.length > 0 ? editing.areas : [area]) as ("odontologia" | "medicina" | "biomedicina")[];
    const especialidades = (editing.especialidades && editing.especialidades.length > 0)
      ? editing.especialidades
      : (editing.especialidade ? [editing.especialidade] : []);
    const payload = {
      nome: editing.nome,
      cnpj: editing.cnpj ?? null,
      profissional_responsavel: editing.profissional_responsavel ?? null,
      area,
      areas,
      especialidade: especialidades[0] ?? editing.especialidade ?? null,
      especialidades,
      especialidades_numeros: (editing.especialidades_numeros ?? []).slice(0, especialidades.length).concat(Array(Math.max(0, especialidades.length - (editing.especialidades_numeros?.length ?? 0))).fill("")),
      endereco: editing.endereco ?? null,
      cep: editing.cep ?? null,
      logradouro: editing.logradouro ?? null,
      numero: editing.numero ?? null,
      complemento: editing.complemento ?? null,
      bairro: editing.bairro ?? null,
      cidade: editing.cidade ?? null,
      estado: editing.estado ?? null,
      redes_sociais: editing.redes_sociais ?? null,
      telefone: editing.telefone ?? null,
      tipo_contrato: tipo,
      contract_type_label: editing.contract_type_label ?? null,
    };
    if (editing.id) {
      const { error } = await supabase.from("clients").update(payload).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("clients").insert({ ...payload, owner_id: user.id });
      if (error) return toast.error(error.message);
      const { data } = await supabase.from("clients").select("id, created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(1);
      if (data && data[0]) setCurrentId(data[0].id);
    }
    setEditing(null);
    await refresh();
    toast.success("Clínica salva");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/60 px-2 py-3">
        {collapsed ? (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto text-white font-extrabold text-[11px] tracking-tight" style={{ background: "var(--brand-blue-deep)" }}>
            BS
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <img src={brandLogo} alt="Brasil e Silveira Advogados" className="h-10 w-auto object-contain self-start" />
            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground font-medium pl-0.5">
              Maturidade Regulatória
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center justify-between pr-1">
            <span>Clínicas</span>
            {!collapsed && (
              <Button size="icon" variant="ghost" className="h-6 w-6" onClick={startNew} title="Nova clínica">
                <Plus className="w-3.5 h-3.5" />
              </Button>
            )}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {clients.map((c) => {
                const isActive = current?.id === c.id;
                return (
                  <SidebarMenuItem key={c.id}>
                    <SidebarMenuButton isActive={isActive} onClick={() => setCurrentId(c.id)} className="pr-14">
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && (
                        <span className="truncate flex-1">{c.nome}</span>
                      )}
                    </SidebarMenuButton>
                    {!collapsed && (
                      <>
                        <SidebarMenuAction showOnHover title="Editar" onClick={(e) => { e.stopPropagation(); startEdit(c); }} className="right-7 hover:text-primary">
                          <Pencil className="w-3 h-3" />
                        </SidebarMenuAction>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <SidebarMenuAction showOnHover title="Excluir" onClick={(e) => e.stopPropagation()} className="hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </SidebarMenuAction>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir {c.nome}?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação remove definitivamente todos os dados, respostas e snapshots desta clínica.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => remove(c)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </SidebarMenuItem>
                );
              })}
              {clients.length === 0 && !collapsed && (
                <div className="px-2 py-3 text-xs text-muted-foreground">Nenhuma clínica cadastrada.</div>
              )}
              {collapsed && (
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={startNew} title="Nova clínica">
                    <Plus className="w-4 h-4" />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-2 space-y-1">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setAccountShareOpen(true)} title="Compartilhar conta inteira">
          <Users className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Compartilhar conta</span>}
        </Button>
        {current && (
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => setPropagateOpen(true)} title="Aplicar estrutura desta clínica em outros painéis">
            <Copy className="w-4 h-4" />
            {!collapsed && <span className="ml-2">Aplicar estrutura</span>}
          </Button>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onSignOut}>
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar clínica" : "Nova clínica"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid md:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-1 min-h-0">
              <div className="md:col-span-2">
                <Label>Nome *</Label>
                <Input value={editing.nome ?? ""} onChange={(e) => setEditing({ ...editing, nome: e.target.value })} />
              </div>
              <div><Label>CNPJ</Label><Input inputMode="numeric" placeholder="00.000.000/0000-00" value={formatCNPJ(editing.cnpj ?? "")} onChange={(e) => setEditing({ ...editing, cnpj: formatCNPJ(e.target.value) })} /></div>
              <div><Label>Profissional responsável</Label><Input value={editing.profissional_responsavel ?? ""} onChange={(e) => setEditing({ ...editing, profissional_responsavel: e.target.value })} /></div>
              <div>
                <Label>Área</Label>
                <Select value={editing.area ?? "odontologia"} onValueChange={(v) => setEditing({ ...editing, area: v as "odontologia" | "medicina" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="odontologia">Odontologia</SelectItem>
                    <SelectItem value="medicina">Medicina</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {editing.area === "odontologia" ? (
                <div className="md:col-span-2">
                  <Label>Especialidades e nº de registro</Label>
                  {(() => {
                    const esps = editing.especialidades ?? (editing.especialidade ? [editing.especialidade] : []);
                    const nums = editing.especialidades_numeros ?? [];
                    const setEsp = (list: string[], numsList: string[]) => setEditing({ ...editing, especialidades: list, especialidades_numeros: numsList, especialidade: list[0] ?? null });
                    const toggle = (name: string) => {
                      const idx = esps.indexOf(name);
                      if (idx >= 0) setEsp(esps.filter((_, i) => i !== idx), nums.filter((_, i) => i !== idx));
                      else setEsp([...esps, name], [...nums, ""]);
                    };
                    const setNum = (name: string, value: string) => {
                      const idx = esps.indexOf(name);
                      if (idx < 0) return;
                      const next = [...nums];
                      while (next.length <= idx) next.push("");
                      next[idx] = value;
                      setEsp(esps, next);
                    };
                    const extras = esps.filter((e) => e && !ODONTO_ESPECIALIDADES.includes(e));
                    return (
                      <div className="border rounded-md p-2 bg-background space-y-1 max-h-64 overflow-y-auto">
                        {ODONTO_ESPECIALIDADES.map((name) => {
                          const checked = esps.includes(name);
                          return (
                            <div key={name} className="flex items-center gap-2">
                              <label className="flex items-center gap-2 text-sm cursor-pointer flex-1 min-w-0">
                                <Checkbox checked={checked} onCheckedChange={() => toggle(name)} />
                                <span className="truncate">{name}</span>
                              </label>
                              {checked && (
                                <Input className="h-7 text-xs w-32" placeholder="Nº registro" value={nums[esps.indexOf(name)] ?? ""} onChange={(e) => setNum(name, e.target.value)} />
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
                                  <Input className="h-7 text-xs flex-1" value={esp} onChange={(e) => { const next = [...esps]; next[idx] = e.target.value; setEsp(next, nums); }} />
                                  <Input className="h-7 text-xs w-32" placeholder="Nº registro" value={nums[idx] ?? ""} onChange={(e) => setNum(esp, e.target.value)} />
                                  <button type="button" className="w-6 h-6 inline-flex items-center justify-center text-muted-foreground hover:text-destructive" onClick={() => setEsp(esps.filter((_, i) => i !== idx), nums.filter((_, i) => i !== idx))}>×</button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                        <button type="button" className="text-xs text-primary hover:underline mt-2" onClick={() => setEsp([...esps, ""], [...nums, ""])}>+ Adicionar outra especialidade</button>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div><Label>Especialidade</Label><Input value={editing.especialidade ?? ""} onChange={(e) => setEditing({ ...editing, especialidade: e.target.value })} /></div>
              )}
              <div><Label>Telefone</Label><Input inputMode="tel" placeholder="(00) 00000-0000" value={formatPhone(editing.telefone ?? "")} onChange={(e) => setEditing({ ...editing, telefone: formatPhone(e.target.value) })} /></div>
              <div className="md:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Tipo de contrato</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setTypesOpen(true)}>
                    Gerenciar
                  </Button>
                </div>
                <Select
                  value={editing.contract_type_label ? `custom:${editing.contract_type_label}` : (editing.tipo_contrato ?? "assessoria_odontologica")}
                  onValueChange={(v) => {
                    if (v.startsWith("custom:")) {
                      setEditing({ ...editing, contract_type_label: v.slice("custom:".length) });
                    } else {
                      setEditing({ ...editing, tipo_contrato: v as "assessoria_odontologica" | "regularizacao_sanitaria", contract_type_label: null });
                    }
                  }}
                >
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
              <div className="md:col-span-2 border-t border-border/60 pt-3 mt-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Endereço completo</Label>
              </div>
              <div><Label>CEP</Label><Input value={editing.cep ?? ""} onChange={(e) => setEditing({ ...editing, cep: e.target.value })} /></div>
              <div><Label>Estado (UF)</Label><Input maxLength={2} value={editing.estado ?? ""} onChange={(e) => setEditing({ ...editing, estado: e.target.value.toUpperCase() })} /></div>
              <div className="md:col-span-2"><Label>Logradouro</Label><Input value={editing.logradouro ?? ""} onChange={(e) => setEditing({ ...editing, logradouro: e.target.value })} /></div>
              <div><Label>Número</Label><Input value={editing.numero ?? ""} onChange={(e) => setEditing({ ...editing, numero: e.target.value })} /></div>
              <div><Label>Complemento</Label><Input value={editing.complemento ?? ""} onChange={(e) => setEditing({ ...editing, complemento: e.target.value })} /></div>
              <div><Label>Bairro</Label><Input value={editing.bairro ?? ""} onChange={(e) => setEditing({ ...editing, bairro: e.target.value })} /></div>
              <div><Label>Cidade</Label><Input value={editing.cidade ?? ""} onChange={(e) => setEditing({ ...editing, cidade: e.target.value })} /></div>
              <div className="md:col-span-2">
                <Label>Endereço (observações adicionais)</Label>
                <Textarea rows={2} value={editing.endereco ?? ""} onChange={(e) => setEditing({ ...editing, endereco: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Redes sociais</Label>
                <Textarea rows={2} placeholder="Instagram, Facebook, site, etc." value={editing.redes_sociais ?? ""} onChange={(e) => setEditing({ ...editing, redes_sociais: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ContractTypesDialog open={typesOpen} onOpenChange={setTypesOpen} />
      <AccountShareDialog open={accountShareOpen} onOpenChange={setAccountShareOpen} />
      {current && (
        <PropagateStructureDialog open={propagateOpen} onOpenChange={setPropagateOpen} sourceId={current.id} />
      )}
    </Sidebar>
  );
}

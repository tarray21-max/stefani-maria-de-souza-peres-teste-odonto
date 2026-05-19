import { useState } from "react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useClients, type ClientRow } from "@/lib/client-context";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Plus, Pencil, Trash2, LogOut, Stethoscope } from "lucide-react";

export function ClientSidebar({ onSignOut }: { onSignOut: () => void }) {
  const { clients, current, setCurrentId, refresh } = useClients();
  const { user } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const [editing, setEditing] = useState<Partial<ClientRow> | null>(null);

  const startNew = () => setEditing({ area: "odontologia", tipo_contrato: "assessoria_odontologica", nome: "" });
  const startEdit = (c: ClientRow) => setEditing(c);

  const remove = async (c: ClientRow) => {
    const { error } = await supabase.from("clients").delete().eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success("Clínica removida");
    await refresh();
  };

  const save = async () => {
    if (!user || !editing) return;
    if (!editing.nome?.trim()) return toast.error("Informe o nome da clínica");
    const payload = {
      nome: editing.nome,
      cnpj: editing.cnpj ?? null,
      profissional_responsavel: editing.profissional_responsavel ?? null,
      area: (editing.area ?? "odontologia") as "odontologia" | "medicina",
      especialidade: editing.especialidade ?? null,
      endereco: editing.endereco ?? null,
      telefone: editing.telefone ?? null,
      tipo_contrato: (editing.tipo_contrato ?? "assessoria_odontologica") as "assessoria_odontologica" | "regularizacao_sanitaria",
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
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0" style={{ background: "var(--gradient-primary)" }}>
            <Stethoscope className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="font-semibold text-sm leading-tight truncate">Maturidade</div>
              <div className="text-[10px] text-muted-foreground truncate">Regulatória Clínica</div>
            </div>
          )}
        </div>
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
                    <SidebarMenuButton isActive={isActive} onClick={() => setCurrentId(c.id)} className="group/item">
                      <Building2 className="w-4 h-4 flex-shrink-0" />
                      {!collapsed && (
                        <>
                          <span className="truncate flex-1">{c.nome}</span>
                          <span className="opacity-0 group-hover/item:opacity-100 flex gap-0.5 transition-opacity">
                            <button type="button" title="Editar" onClick={(e) => { e.stopPropagation(); startEdit(c); }} className="p-0.5 hover:text-primary">
                              <Pencil className="w-3 h-3" />
                            </button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <button type="button" title="Excluir" onClick={(e) => e.stopPropagation()} className="p-0.5 hover:text-destructive">
                                  <Trash2 className="w-3 h-3" />
                                </button>
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
                          </span>
                        </>
                      )}
                    </SidebarMenuButton>
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

      <SidebarFooter className="border-t border-sidebar-border/60 p-2">
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onSignOut}>
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar clínica" : "Nova clínica"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid md:grid-cols-2 gap-3">
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
              <div><Label>Especialidade</Label><Input value={editing.especialidade ?? ""} onChange={(e) => setEditing({ ...editing, especialidade: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input inputMode="tel" placeholder="(00) 00000-0000" value={formatPhone(editing.telefone ?? "")} onChange={(e) => setEditing({ ...editing, telefone: formatPhone(e.target.value) })} /></div>
              <div className="md:col-span-2">
                <Label>Tipo de contrato</Label>
                <Select value={editing.tipo_contrato ?? "assessoria_odontologica"} onValueChange={(v) => setEditing({ ...editing, tipo_contrato: v as "assessoria_odontologica" | "regularizacao_sanitaria" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="assessoria_odontologica">Assessoria Odontológica</SelectItem>
                    <SelectItem value="regularizacao_sanitaria">Regularização Sanitária</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Endereço</Label>
                <Textarea rows={2} value={editing.endereco ?? ""} onChange={(e) => setEditing({ ...editing, endereco: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
}

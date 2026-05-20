import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountShare } from "@/lib/use-account-share";
import type { MemberRole } from "@/lib/use-invitations";
import { toast } from "sonner";
import { Trash2, Mail, UserCheck, Clock } from "lucide-react";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

export function AccountShareDialog({ open, onOpenChange }: Props) {
  const { members, invitations, invite, cancelInvitation, removeMember, changeRole } = useAccountShare();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MemberRole>("editor");
  const [busy, setBusy] = useState(false);

  const send = async () => {
    setBusy(true);
    const { error } = await invite(email, role);
    setBusy(false);
    if (error) return toast.error(error);
    setEmail("");
    toast.success("Convite criado. Será aceito automaticamente no login.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Compartilhar conta inteira</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Quem você convidar aqui terá acesso a <strong>todas</strong> as suas clínicas — atuais e futuras.
        </p>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Input type="email" placeholder="email@exemplo.com" value={email}
              onChange={(e) => setEmail(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} />
            <Select value={role} onValueChange={(v) => setRole(v as MemberRole)}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="viewer">Visualizador</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={send} disabled={busy}><Mail className="w-4 h-4 mr-1" />Convidar</Button>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Membros da conta</div>
            <div className="space-y-1">
              {members.length === 0 && <p className="text-xs text-muted-foreground">Ninguém ainda.</p>}
              {members.map((m) => (
                <div key={m.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/60">
                  <UserCheck className="w-4 h-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{m.display_name || m.email || m.member_id.slice(0, 8)}</div>
                    {m.email && <div className="text-xs text-muted-foreground truncate">{m.email}</div>}
                  </div>
                  <Select value={m.role} onValueChange={(v) => changeRole(m.id, v as MemberRole)}>
                    <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Editor</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => removeMember(m.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {invitations.length > 0 && (
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Convites pendentes</div>
              <div className="space-y-1">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted/60">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{inv.email}</div>
                      <div className="text-xs text-muted-foreground">{inv.role}</div>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 hover:text-destructive" onClick={() => cancelInvitation(inv.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

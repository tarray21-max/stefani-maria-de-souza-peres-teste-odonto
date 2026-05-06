import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Share2, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Link {
  id: string;
  token: string;
  mode: "view" | "edit";
  expires_at: string | null;
  created_at: string;
}

export function VisitorLinks({ clientId }: { clientId: string | null }) {
  const [open, setOpen] = useState(false);
  const [links, setLinks] = useState<Link[]>([]);
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!clientId) return;
    const { data } = await supabase.from("visitor_links").select("*").eq("client_id", clientId).order("created_at", { ascending: false });
    setLinks((data ?? []) as Link[]);
  };

  useEffect(() => { if (open) refresh(); /* eslint-disable-next-line */ }, [open, clientId]);

  const create = async () => {
    if (!clientId) return;
    setBusy(true);
    const token = crypto.randomUUID().replace(/-/g, "");
    const expires_at = days > 0 ? new Date(Date.now() + days * 86400000).toISOString() : null;
    const { error } = await supabase.from("visitor_links").insert({ client_id: clientId, token, mode, expires_at });
    setBusy(false);
    if (error) return toast.error(error.message);
    refresh();
  };

  const remove = async (id: string) => {
    await supabase.from("visitor_links").delete().eq("id", id);
    refresh();
  };

  const copyUrl = (token: string) => {
    const url = `${window.location.origin}/v/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado");
  };

  if (!clientId) return null;

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Share2 className="w-3.5 h-3.5 mr-1" /> Compartilhar
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Links de visitante</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-[1fr_120px_auto] gap-2 items-end">
              <div>
                <Label>Modo</Label>
                <Select value={mode} onValueChange={(v) => setMode(v as "view" | "edit")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">Somente visualizar</SelectItem>
                    <SelectItem value="edit">Pode editar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Validade (dias)</Label>
                <Input type="number" min={0} value={days} onChange={(e) => setDays(Number(e.target.value))} />
              </div>
              <Button onClick={create} disabled={busy}>Criar</Button>
            </div>

            <div className="border border-border rounded-lg divide-y divide-border max-h-72 overflow-auto">
              {links.length === 0 && <div className="p-4 text-xs text-muted-foreground text-center">Nenhum link.</div>}
              {links.map((l) => {
                const url = `${window.location.origin}/v/${l.token}`;
                const expired = l.expires_at && new Date(l.expires_at) < new Date();
                return (
                  <div key={l.id} className="p-3 flex items-center gap-2 text-xs">
                    <div className="flex-1 min-w-0">
                      <div className="font-mono truncate text-foreground">{url}</div>
                      <div className="text-muted-foreground">
                        {l.mode === "edit" ? "Edição" : "Visualização"}
                        {l.expires_at ? ` • expira ${new Date(l.expires_at).toLocaleDateString()}` : " • sem expiração"}
                        {expired && <span className="text-danger ml-2">(expirado)</span>}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => copyUrl(l.token)}><Copy className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => remove(l.id)}><Trash2 className="w-3.5 h-3.5 text-danger" /></Button>
                  </div>
                );
              })}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

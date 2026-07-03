import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useClients, type ClientRow } from "@/lib/client-context";

interface Props {
  client: ClientRow;
}

export function ClientLogoAvatar({ client }: Props) {
  const { refresh } = useClients();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const initial = client.nome.trim().charAt(0).toUpperCase();

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5 MB");
      return;
    }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${client.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("client-logos")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data: signed, error: signErr } = await supabase.storage
        .from("client-logos")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (signErr) throw signErr;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: updErr } = await supabase.from("clients").update({ logo_url: signed.signedUrl } as any).eq("id", client.id);
      if (updErr) throw updErr;
      await refresh();
      toast.success("Imagem atualizada");
      setMenuOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao enviar imagem";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const removeLogo = async () => {
    setBusy(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await supabase.from("clients").update({ logo_url: null } as any).eq("id", client.id);
      if (error) throw error;
      await refresh();
      toast.success("Imagem removida");
      setMenuOpen(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao remover imagem";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onClick={() => (client.logo_url ? setMenuOpen((o) => !o) : inputRef.current?.click())}
        disabled={busy}
        className="group relative w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-primary to-primary/60 text-primary-foreground flex items-center justify-center font-bold text-2xl shadow-md ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        aria-label="Alterar imagem da clínica"
        title="Clique para alterar a imagem"
      >
        {client.logo_url ? (
          <img src={client.logo_url} alt={client.nome} className="w-full h-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          {busy ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Camera className="w-5 h-5 text-white" />}
        </div>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
      {menuOpen && client.logo_url && (
        <>
          <button type="button" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} aria-label="Fechar menu" />
          <div className="absolute z-50 top-full left-0 mt-2 w-52 rounded-lg border border-border bg-popover shadow-lg py-1 text-sm">
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
              onClick={() => { setMenuOpen(false); inputRef.current?.click(); }}
            >
              <Camera className="w-4 h-4" /> Trocar imagem
            </button>
            <button
              type="button"
              className="w-full text-left px-3 py-2 hover:bg-muted text-danger flex items-center gap-2"
              onClick={removeLogo}
            >
              <Trash2 className="w-4 h-4" /> Remover imagem
            </button>
          </div>
        </>
      )}
    </div>
  );
}

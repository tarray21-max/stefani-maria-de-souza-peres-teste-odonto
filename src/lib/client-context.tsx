import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";

export interface ClientRow {
  id: string;
  owner_id: string;
  nome: string;
  cnpj: string | null;
  profissional_responsavel: string | null;
  area: "odontologia" | "medicina";
  especialidade: string | null;
  endereco: string | null;
  telefone: string | null;
  tipo_contrato: "assessoria_odontologica" | "regularizacao_sanitaria";
  contract_type_label: string | null;
}

interface ClientCtx {
  clients: ClientRow[];
  current: ClientRow | null;
  setCurrentId: (id: string) => void;
  refresh: () => Promise<void>;
  loading: boolean;
}

const Ctx = createContext<ClientCtx>({
  clients: [],
  current: null,
  setCurrentId: () => {},
  refresh: async () => {},
  loading: true,
});

const LS_KEY = "maturidade-current-client";

export function ClientProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [currentId, setCurrentIdState] = useState<string | null>(
    typeof window !== "undefined" ? localStorage.getItem(LS_KEY) : null,
  );
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setClients([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: true });
    if (!error && data) setClients(data as ClientRow[]);
    setLoading(false);
  }, [user]);

  // Aceita convites pendentes ao logar, depois carrega a lista.
  useEffect(() => {
    if (!user) {
      refresh();
      return;
    }
    void (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.rpc as any)("accept_client_invitations");
      } catch { /* ignore */ }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.rpc as any)("accept_account_invitations");
      } catch { /* ignore */ }
      await refresh();
    })();
  }, [user, refresh]);

  // Realtime: lista de clínicas, membros, e vínculos de conta.
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`clients-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "clients" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "client_members", filter: `user_id=eq.${user.id}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "account_members", filter: `member_id=eq.${user.id}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "account_members", filter: `owner_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  // Default current
  useEffect(() => {
    if (!currentId && clients[0]) {
      setCurrentIdState(clients[0].id);
      localStorage.setItem(LS_KEY, clients[0].id);
    } else if (currentId && !clients.find((c) => c.id === currentId) && clients[0]) {
      setCurrentIdState(clients[0].id);
      localStorage.setItem(LS_KEY, clients[0].id);
    }
  }, [clients, currentId]);

  const setCurrentId = useCallback((id: string) => {
    setCurrentIdState(id);
    localStorage.setItem(LS_KEY, id);
  }, []);

  const current = clients.find((c) => c.id === currentId) ?? null;

  return (
    <Ctx.Provider value={{ clients, current, setCurrentId, refresh, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useClients = () => useContext(Ctx);

export function contractLabel(c: Pick<ClientRow, "tipo_contrato" | "contract_type_label">): string {
  if (c.contract_type_label && c.contract_type_label.trim()) return c.contract_type_label;
  return c.tipo_contrato === "assessoria_odontologica" ? "Assessoria Odontológica" : "Regularização Sanitária";
}

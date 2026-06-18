import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";

export type AreaAtuacao = "odontologia" | "medicina" | "biomedicina";

export interface ClientRow {
  id: string;
  owner_id: string;
  nome: string;
  cnpj: string | null;
  profissional_responsavel: string | null;
  area: AreaAtuacao;
  areas: AreaAtuacao[];
  especialidade: string | null;
  endereco: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  estado: string | null;
  redes_sociais: string | null;
  telefone: string | null;
  tipo_contrato: "assessoria_odontologica" | "assessoria_medica" | "regularizacao_sanitaria";
  contract_type_label: string | null;
  especialidades: string[];
  especialidades_numeros: string[];
  crm_cro: string | null;
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
    if (!error && data) {
      const rows = (data as unknown as Array<Record<string, unknown>>).map((r) => ({
        ...r,
        areas: Array.isArray(r.areas) && r.areas.length > 0
          ? (r.areas as AreaAtuacao[])
          : [r.area as AreaAtuacao],
        especialidades: Array.isArray(r.especialidades) && r.especialidades.length > 0
          ? (r.especialidades as string[])
          : (r.especialidade ? [r.especialidade as string] : []),
        especialidades_numeros: Array.isArray(r.especialidades_numeros) ? (r.especialidades_numeros as string[]) : [],
        crm_cro: (r.crm_cro as string | null) ?? null,
      })) as ClientRow[];
      setClients(rows);
    }
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
  const map: Record<ClientRow["tipo_contrato"], string> = {
    assessoria_odontologica: "Assessoria Odontológica",
    assessoria_medica: "Assessoria Médica",
    regularizacao_sanitaria: "Regularização Sanitária",
  };
  return map[c.tipo_contrato] ?? c.tipo_contrato;
}

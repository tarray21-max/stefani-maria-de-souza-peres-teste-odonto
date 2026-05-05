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

  useEffect(() => {
    refresh();
  }, [refresh]);

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

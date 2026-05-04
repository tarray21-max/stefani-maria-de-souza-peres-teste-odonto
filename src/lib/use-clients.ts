import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ClinicClient } from "./use-clinic-store";

export function useClients() {
  const [clients, setClients] = useState<ClinicClient[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) {
      console.error("Failed to load clients", error);
      setClients([]);
    } else {
      setClients((data ?? []) as ClinicClient[]);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Persist active client id
  useEffect(() => {
    if (!loaded) return;
    const stored = typeof window !== "undefined" ? localStorage.getItem("activeClientId") : null;
    if (stored && clients.some((c) => c.id === stored)) {
      setActiveId(stored);
    } else if (clients.length > 0) {
      setActiveId(clients[0].id);
    } else {
      setActiveId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, clients.length]);

  const selectClient = useCallback((id: string) => {
    setActiveId(id);
    if (typeof window !== "undefined") localStorage.setItem("activeClientId", id);
  }, []);

  const createClient = useCallback(
    async (input: Omit<ClinicClient, "id" | "owner_id">) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("clients")
        .insert({ ...input, owner_id: userId })
        .select()
        .single();
      if (error) throw error;
      await refresh();
      selectClient(data.id);
      return data as ClinicClient;
    },
    [refresh, selectClient],
  );

  const updateClient = useCallback(
    async (id: string, patch: Partial<Omit<ClinicClient, "id" | "owner_id">>) => {
      const { error } = await supabase.from("clients").update(patch).eq("id", id);
      if (error) throw error;
      await refresh();
    },
    [refresh],
  );

  const activeClient = clients.find((c) => c.id === activeId) ?? null;

  return { clients, activeId, activeClient, loaded, selectClient, createClient, updateClient, refresh };
}

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";

export interface ContractType {
  id: string;
  label: string;
}

export const PRESET_CONTRACT_TYPES: { value: string; label: string }[] = [
  { value: "assessoria_odontologica", label: "Assessoria Odontológica" },
  { value: "regularizacao_sanitaria", label: "Regularização Sanitária" },
];

export function useContractTypes() {
  const { user } = useAuth();
  const [items, setItems] = useState<ContractType[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("contract_types" as never)
      .select("id, label")
      .order("label", { ascending: true });
    setItems(((data as unknown) as ContractType[]) ?? []);
    setLoaded(true);
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase
      .channel(`contract_types-${user.id}-${Math.random().toString(36).slice(2, 10)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contract_types", filter: `owner_id=eq.${user.id}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, refresh]);

  const add = useCallback(
    async (label: string) => {
      if (!user) return;
      const clean = label.trim();
      if (!clean) return;
      await supabase.from("contract_types" as never).insert({ owner_id: user.id, label: clean } as never);
    },
    [user],
  );

  const update = useCallback(async (id: string, label: string) => {
    const clean = label.trim();
    if (!clean) return;
    await supabase.from("contract_types" as never).update({ label: clean } as never).eq("id", id);
  }, []);

  const remove = useCallback(async (id: string) => {
    await supabase.from("contract_types" as never).delete().eq("id", id);
  }, []);

  return { items, loaded, add, update, remove, refresh };
}

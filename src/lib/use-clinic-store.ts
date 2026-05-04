import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  type ResponseMap,
  type Answer,
  type Quality,
  type ItemResponse,
  EMPTY_RESPONSE,
} from "./checklist-data";

const LEGACY_KEY = "maturidade-clinica-v1";

export interface ClinicClient {
  id: string;
  owner_id: string;
  nome: string;
  profissional_responsavel: string | null;
  cnpj: string | null;
  area: "odontologia" | "medicina";
  especialidade: string | null;
  endereco: string | null;
  telefone: string | null;
  tipo_contrato: "assessoria_odontologica" | "regularizacao_sanitaria";
}

export function useClinicStore(clientId: string | null) {
  const [responses, setResponses] = useState<ResponseMap>({});
  const [loaded, setLoaded] = useState(false);

  // Load responses from cloud
  useEffect(() => {
    if (!clientId) {
      setResponses({});
      setLoaded(true);
      return;
    }
    setLoaded(false);
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("responses")
        .select("item_id, answer, quality, justification")
        .eq("client_id", clientId);
      if (cancelled) return;
      if (error) {
        console.error("Failed to load responses", error);
        setResponses({});
      } else {
        const map: ResponseMap = {};
        for (const row of data ?? []) {
          map[row.item_id] = {
            answer: row.answer as Answer,
            quality: row.quality as Quality,
            justification: row.justification ?? "",
          };
        }
        setResponses(map);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // Realtime subscription
  useEffect(() => {
    if (!clientId) return;
    const channel = supabase
      .channel(`responses-${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "responses", filter: `client_id=eq.${clientId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const old = payload.old as { item_id: string };
            setResponses((prev) => {
              const next = { ...prev };
              delete next[old.item_id];
              return next;
            });
          } else {
            const row = payload.new as {
              item_id: string;
              answer: Answer;
              quality: Quality;
              justification: string | null;
            };
            setResponses((prev) => ({
              ...prev,
              [row.item_id]: {
                answer: row.answer,
                quality: row.quality,
                justification: row.justification ?? "",
              },
            }));
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const updateResponse = useCallback(
    async (itemId: string, partial: Partial<ItemResponse>) => {
      if (!clientId) return;
      const current = responses[itemId] ?? EMPTY_RESPONSE;
      const next: ItemResponse = { ...current, ...partial };
      // Optimistic
      setResponses((prev) => ({ ...prev, [itemId]: next }));
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      const { error } = await supabase.from("responses").upsert(
        {
          client_id: clientId,
          item_id: itemId,
          answer: next.answer,
          quality: next.quality,
          justification: next.justification,
          updated_by: userId,
        },
        { onConflict: "client_id,item_id" },
      );
      if (error) console.error("Failed to save response", error);
    },
    [clientId, responses],
  );

  const setAnswer = useCallback(
    (itemId: string, answer: Answer) => {
      const current = responses[itemId] ?? EMPTY_RESPONSE;
      // Auto-set quality to "bom" if user marks "sim" and no quality set
      const quality = answer === "sim" ? current.quality ?? "bom" : current.quality;
      return updateResponse(itemId, { answer, quality });
    },
    [responses, updateResponse],
  );

  const setQuality = useCallback(
    (itemId: string, quality: Quality) => updateResponse(itemId, { quality }),
    [updateResponse],
  );

  const setJustification = useCallback(
    (itemId: string, justification: string) => updateResponse(itemId, { justification }),
    [updateResponse],
  );

  const resetWithJustification = useCallback(
    async (justification: string) => {
      if (!clientId) return;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      // Log first
      await supabase.from("reset_log").insert({
        client_id: clientId,
        user_id: userId,
        justification,
      });
      // Then delete
      const { error } = await supabase.from("responses").delete().eq("client_id", clientId);
      if (error) {
        console.error("Failed to reset", error);
        throw error;
      }
      setResponses({});
    },
    [clientId],
  );

  return useMemo(
    () => ({
      responses,
      loaded,
      setAnswer,
      setQuality,
      setJustification,
      resetWithJustification,
    }),
    [responses, loaded, setAnswer, setQuality, setJustification, resetWithJustification],
  );
}

/** One-time migration of legacy localStorage data into the first client */
export async function migrateLegacyLocalStorage(clientId: string) {
  if (typeof window === "undefined") return;
  const raw = window.localStorage.getItem(LEGACY_KEY);
  if (!raw) return;
  try {
    const legacy = JSON.parse(raw) as Record<string, Answer | string>;
    const rows = Object.entries(legacy)
      .filter(([, v]) => v === "sim" || v === "nao" || v === "na")
      .map(([itemId, answer]) => ({
        client_id: clientId,
        item_id: itemId,
        answer: answer as Answer,
        quality: answer === "sim" ? ("bom" as Quality) : null,
        justification: "",
      }));
    if (rows.length) {
      await supabase.from("responses").upsert(rows, { onConflict: "client_id,item_id" });
    }
    window.localStorage.removeItem(LEGACY_KEY);
  } catch (e) {
    console.warn("Legacy migration failed", e);
  }
}

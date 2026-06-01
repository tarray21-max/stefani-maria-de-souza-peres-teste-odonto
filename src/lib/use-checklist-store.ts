import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Answer, Quality, ResponseMap, ItemResponse } from "./checklist-data";
import { EMPTY_RESPONSE } from "./checklist-data";

/**
 * Cloud-backed checklist store with realtime sync per client.
 */
export function useChecklistStore(clientId: string | null) {
  const [responses, setResponses] = useState<ResponseMap>({});
  const [loaded, setLoaded] = useState(false);
  const debounceTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Initial load + realtime
  useEffect(() => {
    if (!clientId) {
      setResponses({});
      setLoaded(true);
      return;
    }
    setLoaded(false);
    let active = true;

    (async () => {
      const { data } = await supabase
        .from("responses")
        .select("item_id, answer, quality, justification, validity_date, validity_indeterminate")
        .eq("client_id", clientId);
      if (!active) return;
      const map: ResponseMap = {};
      for (const r of (data ?? []) as Array<Record<string, unknown>>) {
        map[r.item_id as string] = {
          answer: (r.answer as Answer | null) ?? null,
          quality: (r.quality as Quality | null) ?? null,
          justification: (r.justification as string | null) ?? "",
          validity_date: (r.validity_date as string | null) ?? null,
          validity_indeterminate: Boolean(r.validity_indeterminate),
        };
      }
      setResponses(map);
      setLoaded(true);
    })();

    const channel = supabase
      .channel(`responses-${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "responses", filter: `client_id=eq.${clientId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const oldRow = payload.old as { item_id?: string };
            if (!oldRow?.item_id) {
              setResponses({});
            } else {
              setResponses((p) => {
                const n = { ...p };
                delete n[oldRow.item_id!];
                return n;
              });
            }
            return;
          }
          const r = payload.new as Record<string, unknown>;
          setResponses((p) => ({
            ...p,
            [r.item_id as string]: {
              answer: (r.answer as Answer | null) ?? null,
              quality: (r.quality as Quality | null) ?? null,
              justification: (r.justification as string | null) ?? "",
              validity_date: (r.validity_date as string | null) ?? null,
              validity_indeterminate: Boolean(r.validity_indeterminate),
            },
          }));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [clientId]);

  const persist = useCallback(
    (id: string, payload: ItemResponse) => {
      if (!clientId) return;
      const t = debounceTimers.current.get(id);
      if (t) clearTimeout(t);
      const timer = setTimeout(async () => {
        await supabase.from("responses").upsert(
          {
            client_id: clientId,
            item_id: id,
            answer: payload.answer,
            quality: payload.quality,
            justification: payload.justification || null,
            validity_date: payload.validity_date,
            validity_indeterminate: payload.validity_indeterminate,
          },
          { onConflict: "client_id,item_id" },
        );
      }, 250);
      debounceTimers.current.set(id, timer);
    },
    [clientId],
  );

  const setAnswer = useCallback(
    (id: string, value: Answer) => {
      setResponses((prev) => {
        const cur = prev[id] ?? EMPTY_RESPONSE;
        const quality = value === "sim" ? cur.quality ?? "bom" : cur.quality;
        const next: ItemResponse = { ...cur, answer: value, quality };
        persist(id, next);
        return { ...prev, [id]: next };
      });
    },
    [persist],
  );

  const setQuality = useCallback(
    (id: string, quality: Quality) => {
      setResponses((prev) => {
        const cur = prev[id] ?? EMPTY_RESPONSE;
        const next: ItemResponse = { ...cur, quality };
        persist(id, next);
        return { ...prev, [id]: next };
      });
    },
    [persist],
  );

  const setJustification = useCallback(
    (id: string, justification: string) => {
      setResponses((prev) => {
        const cur = prev[id] ?? EMPTY_RESPONSE;
        const next: ItemResponse = { ...cur, justification };
        persist(id, next);
        return { ...prev, [id]: next };
      });
    },
    [persist],
  );

  const setValidity = useCallback(
    (id: string, validity: { date: string | null; indeterminate: boolean }) => {
      setResponses((prev) => {
        const cur = prev[id] ?? EMPTY_RESPONSE;
        const next: ItemResponse = {
          ...cur,
          validity_date: validity.indeterminate ? null : validity.date,
          validity_indeterminate: validity.indeterminate,
        };
        persist(id, next);
        return { ...prev, [id]: next };
      });
    },
    [persist],
  );

  const reset = useCallback(
    async (justification: string) => {
      if (!clientId) return;
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) return;
      await supabase.from("reset_log").insert({
        client_id: clientId,
        user_id: uid,
        justification,
      });
      await supabase.from("responses").delete().eq("client_id", clientId);
      setResponses({});
    },
    [clientId],
  );

  return { answers: responses, setAnswer, setQuality, setJustification, setValidity, reset, loaded };
}

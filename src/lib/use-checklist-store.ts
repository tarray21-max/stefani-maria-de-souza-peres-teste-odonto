import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Answer, Quality, ResponseMap } from "./checklist-data";
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
        .select("item_id, answer, quality, justification")
        .eq("client_id", clientId);
      if (!active) return;
      const map: ResponseMap = {};
      for (const r of data ?? []) {
        map[r.item_id] = {
          answer: (r.answer as Answer | null) ?? null,
          quality: (r.quality as Quality | null) ?? null,
          justification: r.justification ?? "",
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
          const r = payload.new as {
            item_id: string;
            answer: Answer | null;
            quality: Quality | null;
            justification: string | null;
          };
          setResponses((p) => ({
            ...p,
            [r.item_id]: {
              answer: r.answer ?? null,
              quality: r.quality ?? null,
              justification: r.justification ?? "",
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
    (id: string, payload: { answer: Answer | null; quality: Quality | null; justification: string }) => {
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
        const next = { ...cur, answer: value, quality };
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
        const next = { ...cur, quality };
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
        const next = { ...cur, justification };
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

  return { answers: responses, setAnswer, setQuality, setJustification, reset, loaded };
}

import { useEffect, useState, useCallback } from "react";
import type { Answer, ResponseMap, Quality } from "./checklist-data";
import { EMPTY_RESPONSE } from "./checklist-data";

const KEY = "maturidade-clinica-v2";
const LEGACY_KEY = "maturidade-clinica-v1";

export function useChecklistStore() {
  const [responses, setResponses] = useState<ResponseMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
      if (raw) {
        setResponses(JSON.parse(raw));
      } else {
        // Migrate legacy
        const legacy = typeof window !== "undefined" ? window.localStorage.getItem(LEGACY_KEY) : null;
        if (legacy) {
          const parsed = JSON.parse(legacy) as Record<string, Answer | string>;
          const migrated: ResponseMap = {};
          for (const [id, v] of Object.entries(parsed)) {
            if (v === "sim" || v === "nao" || v === "na") {
              migrated[id] = {
                answer: v as Answer,
                quality: v === "sim" ? ("bom" as Quality) : null,
                justification: "",
              };
            }
          }
          setResponses(migrated);
        }
      }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(responses));
    } catch {}
  }, [responses, loaded]);

  const setAnswer = useCallback((id: string, value: Answer) => {
    setResponses((prev) => {
      const current = prev[id] ?? EMPTY_RESPONSE;
      const quality = value === "sim" ? current.quality ?? ("bom" as Quality) : current.quality;
      return { ...prev, [id]: { ...current, answer: value, quality } };
    });
  }, []);

  const setQuality = useCallback((id: string, quality: Quality) => {
    setResponses((prev) => {
      const current = prev[id] ?? EMPTY_RESPONSE;
      return { ...prev, [id]: { ...current, quality } };
    });
  }, []);

  const setJustification = useCallback((id: string, justification: string) => {
    setResponses((prev) => {
      const current = prev[id] ?? EMPTY_RESPONSE;
      return { ...prev, [id]: { ...current, justification } };
    });
  }, []);

  const reset = useCallback((justification?: string) => {
    setResponses({});
    if (justification) {
      try {
        const log = JSON.parse(window.localStorage.getItem("maturidade-reset-log") || "[]");
        log.push({ at: new Date().toISOString(), justification });
        window.localStorage.setItem("maturidade-reset-log", JSON.stringify(log));
      } catch {}
    }
  }, []);

  return { answers: responses, setAnswer, setQuality, setJustification, reset, loaded };
}

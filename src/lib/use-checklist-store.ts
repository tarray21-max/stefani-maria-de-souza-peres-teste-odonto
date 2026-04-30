import { useEffect, useState, useCallback } from "react";
import type { Answer } from "./checklist-data";

const KEY = "maturidade-clinica-v1";

export function useChecklistStore() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
      if (raw) setAnswers(JSON.parse(raw));
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(answers));
    } catch {}
  }, [answers, loaded]);

  const setAnswer = useCallback((id: string, value: Answer) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }, []);

  const reset = useCallback(() => setAnswers({}), []);

  return { answers, setAnswer, reset, loaded };
}

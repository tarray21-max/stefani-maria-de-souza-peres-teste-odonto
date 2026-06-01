import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CHECKLIST, CATEGORIES, computeMaturity, scoreColorVar, type Answer, type ChecklistItem, type Quality, type ResponseMap } from "@/lib/checklist-data";
import { Dashboard } from "@/components/Dashboard";
import { ChecklistSection } from "@/components/ChecklistSection";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Stethoscope } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/v/$token")({
  component: VisitorView,
});

interface State {
  client_id: string;
  mode: "view" | "edit";
  client: { nome: string; especialidade: string | null; area: string } | null;
  responses: { item_id: string; answer: Answer; quality: Quality; justification: string | null }[];
  custom_items: { id: string; client_id: string; category: string; title: string; weight: number; norma: string | null; risco: string | null }[];
  disabled_items: string[];
}

function VisitorView() {
  const { token } = Route.useParams();
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("visitor_get_state", { _token: token });
    if (error) return setError(error.message);
    setState(data as unknown as State);
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!state?.client_id) return;
    const ch = supabase
      .channel(`v-${state.client_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "responses", filter: `client_id=eq.${state.client_id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "custom_items", filter: `client_id=eq.${state.client_id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "disabled_items", filter: `client_id=eq.${state.client_id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [state?.client_id, load]);

  if (error) return <Centered>Link inválido ou expirado.</Centered>;
  if (!state) return <Centered>Carregando…</Centered>;

  const items: ChecklistItem[] = [
    ...CHECKLIST.filter((i) => !state.disabled_items.includes(i.id)),
    ...state.custom_items.map<ChecklistItem>((c) => ({
      id: `c_${c.id}`, category: c.category as ChecklistItem["category"], title: c.title, description: "", weight: c.weight, norma: c.norma ?? undefined, risco: c.risco ?? undefined,
    })),
  ];
  const answers: ResponseMap = {};
  for (const r of state.responses) answers[r.item_id] = { answer: r.answer, quality: r.quality, justification: r.justification ?? "", validity_date: (r as { validity_date?: string | null }).validity_date ?? null, validity_indeterminate: (r as { validity_indeterminate?: boolean }).validity_indeterminate ?? false };

  const canEdit = state.mode === "edit";
  const set = async (item_id: string, patch: { answer?: Answer; quality?: Quality; justification?: string }) => {
    if (!canEdit) return;
    const cur = answers[item_id] ?? { answer: null, quality: null, justification: "", validity_date: null, validity_indeterminate: false };
    const next = { ...cur, ...patch };
    setState((s) => s ? { ...s, responses: [...s.responses.filter((r) => r.item_id !== item_id), { item_id, ...next }] } : s);
    const { error } = await supabase.rpc("visitor_set_answer", { _token: token, _item_id: item_id, _answer: next.answer ?? "", _quality: next.quality ?? "", _justification: next.justification ?? "" });
    if (error) toast.error(error.message);
  };

  const global = computeMaturity(answers, items);
  const color = scoreColorVar(global.score);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: "var(--gradient-primary)" }}>
              <Stethoscope className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-foreground truncate">{state.client?.nome ?? "Painel da clínica"}</h1>
              <p className="text-xs text-muted-foreground">Visitante • {canEdit ? "Edição" : "Somente leitura"}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-semibold" style={{ color }}>{Math.round(global.score)}%</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <Tabs defaultValue="dashboard">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-muted/60">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            {CATEGORIES.map((c) => <TabsTrigger key={c.id} value={c.id}>{c.short}</TabsTrigger>)}
          </TabsList>
          <TabsContent value="dashboard" className="mt-6"><Dashboard answers={answers} items={items} /></TabsContent>
          {CATEGORIES.map((c) => (
            <TabsContent key={c.id} value={c.id} className="mt-6">
              <ChecklistSection
                category={c.id}
                items={items}
                answers={answers}
                setAnswer={(id, v) => set(id, { answer: v })}
                setQuality={canEdit ? (id, q) => set(id, { quality: q }) : undefined}
                setJustification={canEdit ? (id, j) => set(id, { justification: j }) : undefined}
                clientId={null}
                readOnly={!canEdit}
              />
            </TabsContent>
          ))}
        </Tabs>
      </main>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center"><Card className="p-8 text-sm text-muted-foreground">{children}</Card></div>;
}

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, computeMaturity, scoreColorVar, type ChecklistItem, type ResponseMap } from "@/lib/checklist-data";
import { toast } from "sonner";

interface Snapshot {
  id: string;
  month: string;
  score: number;
  score_by_category: Record<string, number>;
  total_sim: number;
  total_nao: number;
  total_na: number;
  total_applicable: number;
  created_at: string;
}

interface Props {
  clientId: string | null;
  answers: ResponseMap;
  items: ChecklistItem[];
}

export function EvolutionReport({ clientId, answers, items }: Props) {
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const currentMonth = new Date().toISOString().slice(0, 7);

  const refresh = async () => {
    if (!clientId) return;
    const { data } = await supabase.from("monthly_snapshots").select("*").eq("client_id", clientId).order("month", { ascending: true });
    setSnaps((data ?? []) as unknown as Snapshot[]);
  };

  useEffect(() => {
    refresh();
    if (!clientId) return;
    const ch = supabase.channel(`snaps-${clientId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "monthly_snapshots", filter: `client_id=eq.${clientId}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId]);

  const takeSnapshot = async () => {
    if (!clientId) return toast.error("Cadastre uma clínica.");
    setBusy(true);
    const global = computeMaturity(answers, items);
    const byCat: Record<string, number> = {};
    for (const c of CATEGORIES) byCat[c.id] = computeMaturity(answers, items.filter((i) => i.category === c.id)).score;
    // upsert by month: delete existing then insert
    await supabase.from("monthly_snapshots").delete().eq("client_id", clientId).eq("month", currentMonth);
    const { error } = await supabase.from("monthly_snapshots").insert({
      client_id: clientId, month: currentMonth, score: global.score,
      score_by_category: byCat, total_sim: global.totalSim, total_nao: global.totalNao,
      total_na: global.totalNa, total_applicable: global.totalApplicable,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Snapshot de ${currentMonth} salvo`);
  };

  const chartData = snaps.map((s) => ({
    month: s.month,
    Global: Math.round(s.score),
    ...Object.fromEntries(CATEGORIES.map((c) => [c.short, Math.round((s.score_by_category as Record<string, number>)[c.id] ?? 0)])),
  }));

  const last = snaps[snaps.length - 1];
  const prev = snaps[snaps.length - 2];
  const delta = last && prev ? last.score - prev.score : null;
  const hasCurrent = snaps.some((s) => s.month === currentMonth);

  return (
    <div className="space-y-6">
      <Card className="p-6 border-border/60">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Evolução mensal</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Capture o snapshot do mês atual ({currentMonth}) para registrar o estado da maturidade.
              {delta !== null && (
                <span className="ml-2 font-medium" style={{ color: delta >= 0 ? "var(--success)" : "var(--danger)" }}>
                  {delta >= 0 ? "+" : ""}{delta.toFixed(1)} pts vs. mês anterior
                </span>
              )}
            </p>
          </div>
          <Button onClick={takeSnapshot} disabled={busy || !clientId}>
            <Camera className="w-4 h-4 mr-1" /> {hasCurrent ? "Atualizar mês" : "Capturar agora"}
          </Button>
        </div>

        <div className="mt-6 h-72">
          {chartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              Nenhum snapshot ainda. Clique em "Capturar agora" para iniciar o histórico.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 230)" />
                <XAxis dataKey="month" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} />
                <Tooltip />
                <Line type="monotone" dataKey="Global" stroke={scoreColorVar(last?.score ?? 0)} strokeWidth={3} dot={{ r: 4 }} />
                {CATEGORIES.map((c, i) => (
                  <Line key={c.id} type="monotone" dataKey={c.short} stroke={["#6366f1", "#0ea5e9", "#10b981"][i]} strokeWidth={1.5} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {snaps.length > 0 && (
        <Card className="p-6 border-border/60">
          <h4 className="font-semibold text-foreground mb-3">Histórico</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-muted-foreground border-b border-border">
                <tr>
                  <th className="text-left py-2">Mês</th>
                  <th className="text-right">Global</th>
                  {CATEGORIES.map((c) => <th key={c.id} className="text-right">{c.short}</th>)}
                  <th className="text-right">Sim</th>
                  <th className="text-right">Não</th>
                </tr>
              </thead>
              <tbody>
                {[...snaps].reverse().map((s) => (
                  <tr key={s.id} className="border-b border-border/40">
                    <td className="py-2">{s.month}</td>
                    <td className="text-right font-semibold" style={{ color: scoreColorVar(s.score) }}>{Math.round(s.score)}%</td>
                    {CATEGORIES.map((c) => <td key={c.id} className="text-right">{Math.round((s.score_by_category as Record<string, number>)[c.id] ?? 0)}%</td>)}
                    <td className="text-right">{s.total_sim}</td>
                    <td className="text-right">{s.total_nao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

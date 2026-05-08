import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Camera, Flag, Clock, TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, computeMaturity, scoreColorVar, type ChecklistItem, type ResponseMap } from "@/lib/checklist-data";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Snapshot {
  id: string;
  month: string;
  score: number;
  score_by_category: Record<string, number>;
  total_sim: number;
  total_nao: number;
  total_na: number;
  total_applicable: number;
  note: string | null;
  is_baseline: boolean;
  created_at: string;
}

interface Props {
  clientId: string | null;
  answers: ResponseMap;
  items: ChecklistItem[];
}

export function EvolutionTimeline({ clientId, answers, items }: Props) {
  const [snaps, setSnaps] = useState<Snapshot[]>([]);
  const [busy, setBusy] = useState(false);
  const [draftNote, setDraftNote] = useState("");
  const currentMonth = new Date().toISOString().slice(0, 7);

  const refresh = async () => {
    if (!clientId) return setSnaps([]);
    const { data } = await supabase.from("monthly_snapshots").select("*").eq("client_id", clientId).order("created_at", { ascending: true });
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

  const hasBaseline = snaps.some((s) => s.is_baseline);

  const capture = async (asBaseline: boolean) => {
    if (!clientId) return toast.error("Cadastre uma clínica.");
    setBusy(true);
    const global = computeMaturity(answers, items);
    const byCat: Record<string, number> = {};
    for (const c of CATEGORIES) byCat[c.id] = computeMaturity(answers, items.filter((i) => i.category === c.id)).score;
    if (!asBaseline) {
      await supabase.from("monthly_snapshots").delete().eq("client_id", clientId).eq("month", currentMonth).eq("is_baseline", false);
    }
    const { error } = await supabase.from("monthly_snapshots").insert({
      client_id: clientId, month: currentMonth, score: global.score,
      score_by_category: byCat, total_sim: global.totalSim, total_nao: global.totalNao,
      total_na: global.totalNa, total_applicable: global.totalApplicable,
      is_baseline: asBaseline, note: draftNote || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    setDraftNote("");
    toast.success(asBaseline ? "Cenário inicial registrado" : `Snapshot de ${currentMonth} salvo`);
  };

  const baselineScore = snaps.find((s) => s.is_baseline)?.score;
  const lastScore = snaps[snaps.length - 1]?.score;

  return (
    <Card className="p-5 border-border/60">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" /> Linha do tempo da maturidade
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registre o cenário inicial e adicione snapshots ao longo dos meses para acompanhar a evolução.
          </p>
        </div>
        <div className="flex gap-2">
          {!hasBaseline && (
            <Button size="sm" variant="outline" onClick={() => capture(true)} disabled={busy || !clientId}>
              <Flag className="w-3.5 h-3.5 mr-1" /> Marcar cenário inicial
            </Button>
          )}
          <Button size="sm" onClick={() => capture(false)} disabled={busy || !clientId}>
            <Camera className="w-3.5 h-3.5 mr-1" /> Snapshot {currentMonth}
          </Button>
        </div>
      </div>

      <Textarea
        value={draftNote}
        onChange={(e) => setDraftNote(e.target.value)}
        placeholder="Nota de evolução (opcional): o que mudou, ações tomadas, próximos passos…"
        className="text-xs min-h-[60px] mb-5"
      />

      {snaps.length === 0 ? (
        <div className="text-center py-10 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
          Nenhum registro ainda. Comece marcando o cenário inicial.
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-border" />
          <ol className="space-y-4">
            {snaps.map((s, i) => {
              const prev = snaps[i - 1];
              const delta = prev ? s.score - prev.score : null;
              const color = scoreColorVar(s.score);
              return (
                <li key={s.id} className="relative pl-10">
                  <span
                    className={cn(
                      "absolute left-0 top-1.5 w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold ring-4 ring-background",
                      s.is_baseline && "ring-primary/20",
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {s.is_baseline ? <Flag className="w-3.5 h-3.5" /> : Math.round(s.score)}
                  </span>
                  <div className="bg-card border border-border/60 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          {s.is_baseline ? "Cenário inicial" : "Snapshot"} • {new Date(s.created_at).toLocaleDateString("pt-BR")}
                        </div>
                        <div className="font-semibold text-foreground flex items-center gap-2 mt-0.5">
                          <span style={{ color }}>{Math.round(s.score)}% maturidade</span>
                          {delta !== null && (
                            <span className="inline-flex items-center text-[11px] font-medium" style={{ color: delta >= 0 ? "var(--success)" : "var(--danger)" }}>
                              {delta >= 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                              {delta >= 0 ? "+" : ""}{delta.toFixed(1)} pts
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex gap-3">
                        <span><strong className="text-success">{s.total_sim}</strong> sim</span>
                        <span><strong className="text-danger">{s.total_nao}</strong> não</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {CATEGORIES.map((c) => {
                        const v = (s.score_by_category as Record<string, number>)[c.id] ?? 0;
                        return (
                          <div key={c.id} className="text-[10px]">
                            <div className="text-muted-foreground">{c.short}</div>
                            <div className="font-semibold" style={{ color: scoreColorVar(v) }}>{Math.round(v)}%</div>
                          </div>
                        );
                      })}
                    </div>
                    {s.note && <p className="text-xs text-muted-foreground mt-2 italic border-l-2 border-primary/30 pl-2">{s.note}</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          {baselineScore !== undefined && lastScore !== undefined && lastScore !== baselineScore && (
            <div className="mt-4 text-xs text-muted-foreground text-center">
              Variação total desde o cenário inicial:
              <span className="ml-1 font-semibold" style={{ color: lastScore - baselineScore >= 0 ? "var(--success)" : "var(--danger)" }}>
                {lastScore - baselineScore >= 0 ? "+" : ""}{(lastScore - baselineScore).toFixed(1)} pts
              </span>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

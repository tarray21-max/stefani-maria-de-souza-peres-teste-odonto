import { CHECKLIST, CATEGORIES, computeMaturity, scoreColorVar, type Answer, type Category } from "@/lib/checklist-data";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { MaturityGauge } from "./MaturityGauge";
import { ShieldBuilder } from "./ShieldBuilder";
import { AlertTriangle, CheckCircle2, MinusCircle, TrendingUp } from "lucide-react";

interface Props {
  answers: Record<string, Answer>;
}

export function Dashboard({ answers }: Props) {
  const global = computeMaturity(answers);

  const perCategory = CATEGORIES.map((c) => ({
    ...c,
    result: computeMaturity(answers, CHECKLIST.filter((i) => i.category === c.id)),
  }));

  const gargalos = CHECKLIST
    .filter((i) => answers[i.id] === "nao")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3);

  const stats = [
    { label: "Conformes", value: global.totalSim, icon: CheckCircle2, color: "var(--success)" },
    { label: "Pendentes", value: global.totalNao, icon: AlertTriangle, color: "var(--danger)" },
    { label: "Não se aplica", value: global.totalNa, icon: MinusCircle, color: "oklch(0.55 0.02 240)" },
    { label: "Itens totais", value: global.totalItems, icon: TrendingUp, color: "var(--primary)" },
  ];

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6">
        <Card className="p-8 border-border/60 relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-50 pointer-events-none"
            style={{ background: "var(--gradient-surface)" }}
          />
          <div className="relative">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Maturidade Regulatória Global
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-6">
              Visão consolidada da clínica
            </h2>
            <MaturityGauge score={global.score} />
            <p className="text-center text-sm text-muted-foreground mt-4">
              {global.totalSim} conformes de {global.totalApplicable} itens aplicáveis
            </p>
          </div>
        </Card>

        <ShieldBuilder score={global.score} />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="p-5 border-border/60">
              <div className="flex items-center justify-between">
                <Icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div className="mt-3 text-3xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
            </Card>
          );
        })}
      </div>

      {/* Per category */}
      <div className="grid md:grid-cols-3 gap-4">
        {perCategory.map((c) => (
          <Card key={c.id} className="p-6 border-border/60">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-foreground">{c.short}</h3>
              <span
                className="text-sm font-bold"
                style={{ color: scoreColorVar(c.result.score) }}
              >
                {Math.round(c.result.score)}%
              </span>
            </div>
            <Progress value={c.result.score} className="h-2" />
            <p className="text-xs text-muted-foreground mt-3">
              {c.result.totalSim}/{c.result.totalApplicable} conformes
            </p>
          </Card>
        ))}
      </div>

      {/* Gargalos */}
      <Card className="p-6 border-border/60">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-danger" />
          <h3 className="font-semibold text-foreground">3 Principais Gargalos</h3>
          <span className="text-xs text-muted-foreground ml-auto">Itens "Não" com maior peso</span>
        </div>
        {gargalos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum gargalo crítico identificado. Continue mantendo a conformidade!
          </p>
        ) : (
          <div className="space-y-3">
            {gargalos.map((g, i) => {
              const cat = CATEGORIES.find((c) => c.id === g.category);
              return (
                <div key={g.id} className="flex items-start gap-4 p-4 rounded-lg bg-danger/5 border border-danger/20">
                  <div className="w-8 h-8 rounded-full bg-danger text-white font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground">{g.title}</h4>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                        {cat?.short}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{g.description}</p>
                  </div>
                  <div className="text-xs font-semibold text-danger flex-shrink-0">
                    Peso {g.weight}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, FileSignature, FileText } from "lucide-react";
import { SERVICOS_TCLE_POP, serviceItemId } from "@/lib/services-data";
import type { Answer, ResponseMap } from "@/lib/checklist-data";
import { cn } from "@/lib/utils";

interface Props {
  answers: ResponseMap;
  setAnswer: (id: string, value: Answer) => void;
}

const OPTIONS: { value: Exclude<Answer, null>; label: string; tone: string }[] = [
  { value: "sim", label: "Sim", tone: "data-[on=true]:bg-success data-[on=true]:text-white data-[on=true]:border-success" },
  { value: "nao", label: "Não", tone: "data-[on=true]:bg-danger data-[on=true]:text-white data-[on=true]:border-danger" },
  { value: "na", label: "N/A", tone: "data-[on=true]:bg-muted-foreground data-[on=true]:text-white data-[on=true]:border-muted-foreground" },
];

function Cell({
  current,
  onChange,
}: {
  current: Answer;
  onChange: (v: Answer) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border overflow-hidden">
      {OPTIONS.map((o) => {
        const on = current === o.value;
        return (
          <button
            key={o.value}
            type="button"
            data-on={on}
            onClick={() => onChange(on ? null : o.value)}
            className={cn(
              "px-2.5 py-1 text-xs font-semibold transition-colors hover:bg-muted/60",
              o.tone,
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function ServiceMatrix({ answers, setAnswer }: Props) {
  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const normalized = q.trim().toLowerCase();
    const filtered = SERVICOS_TCLE_POP.filter((s) =>
      normalized ? s.toLowerCase().includes(normalized) : true,
    );
    // Move rows where both TCLE & POP are N/A to the bottom; "Não" rows up top
    return filtered.slice().sort((a, b) => {
      const aT = answers[serviceItemId("tcle", a)]?.answer ?? null;
      const aP = answers[serviceItemId("pop", a)]?.answer ?? null;
      const bT = answers[serviceItemId("tcle", b)]?.answer ?? null;
      const bP = answers[serviceItemId("pop", b)]?.answer ?? null;
      const aNa = aT === "na" && aP === "na" ? 1 : 0;
      const bNa = bT === "na" && bP === "na" ? 1 : 0;
      if (aNa !== bNa) return aNa - bNa;
      const aNao = aT === "nao" || aP === "nao" ? -1 : 0;
      const bNao = bT === "nao" || bP === "nao" ? -1 : 0;
      if (aNao !== bNao) return aNao - bNao;
      return a.localeCompare(b, "pt-BR");
    });
  }, [q, answers]);

  const totals = useMemo(() => {
    let okT = 0, okP = 0, total = SERVICOS_TCLE_POP.length;
    for (const s of SERVICOS_TCLE_POP) {
      if (answers[serviceItemId("tcle", s)]?.answer === "sim") okT++;
      if (answers[serviceItemId("pop", s)]?.answer === "sim") okP++;
    }
    return { okT, okP, total };
  }, [answers]);

  return (
    <Card className="p-5 border-border/60 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            Matriz TCLE × POP por serviço
          </div>
          <h3 className="text-lg font-bold text-foreground mt-1">Documentação por procedimento</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Indique se cada serviço prestado possui TCLE e POP correspondentes.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5">
            <FileSignature className="w-3.5 h-3.5 text-primary" />
            <strong className="text-foreground">{totals.okT}</strong>
            <span className="text-muted-foreground">/ {totals.total} TCLE</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-primary" />
            <strong className="text-foreground">{totals.okP}</strong>
            <span className="text-muted-foreground">/ {totals.total} POP</span>
          </span>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar serviço…"
          className="pl-9 h-9"
        />
      </div>

      <div className="rounded-md border border-border/60 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-0 text-[11px] uppercase tracking-wider text-muted-foreground bg-muted/50 px-3 py-2">
          <div>Serviço</div>
          <div className="px-3 text-center min-w-[160px]">TCLE</div>
          <div className="px-3 text-center min-w-[160px]">POP</div>
        </div>
        <div className="divide-y divide-border/60 max-h-[520px] overflow-auto">
          {rows.map((s) => {
            const idT = serviceItemId("tcle", s);
            const idP = serviceItemId("pop", s);
            const aT = answers[idT]?.answer ?? null;
            const aP = answers[idP]?.answer ?? null;
            const dim = aT === "na" && aP === "na";
            return (
              <div
                key={s}
                className={cn(
                  "grid grid-cols-[1fr_auto_auto] items-center px-3 py-1.5 transition-opacity",
                  dim && "opacity-40",
                )}
              >
                <div className="text-sm text-foreground truncate pr-3">{s}</div>
                <div className="px-3 text-center">
                  <Cell current={aT} onChange={(v) => setAnswer(idT, v)} />
                </div>
                <div className="px-3 text-center">
                  <Cell current={aP} onChange={(v) => setAnswer(idP, v)} />
                </div>
              </div>
            );
          })}
          {rows.length === 0 && (
            <div className="px-3 py-6 text-sm text-muted-foreground text-center">
              Nenhum serviço encontrado para "{q}".
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

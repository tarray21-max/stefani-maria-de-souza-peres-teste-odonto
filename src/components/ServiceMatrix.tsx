import { useMemo, useState } from "react";
import { ASSISTENCIAL_SERVICOS, type Answer, type ResponseMap } from "@/lib/checklist-data";
import { Check, X, MinusCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface Props {
  answers: ResponseMap;
  setAnswer: (id: string, value: Answer) => void;
}

const OPTIONS: { value: Answer; icon: typeof Check; activeClass: string; title: string }[] = [
  { value: "sim", icon: Check, activeClass: "bg-success text-white border-success", title: "Sim" },
  { value: "nao", icon: X, activeClass: "bg-danger text-white border-danger", title: "Não" },
  { value: "na", icon: MinusCircle, activeClass: "bg-muted-foreground text-white border-muted-foreground", title: "N/A" },
];

function idFor(idx: number, kind: "tcle" | "pop") {
  return `m${idx + 1}-${kind}`;
}

function Cell({
  current,
  onChange,
}: {
  current: Answer;
  onChange: (v: Answer) => void;
}) {
  return (
    <div className="flex gap-1 justify-center">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const active = current === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            title={opt.title}
            onClick={() => onChange(opt.value)}
            className={cn(
              "w-7 h-7 inline-flex items-center justify-center rounded border text-xs transition-all",
              "border-border bg-background hover:border-primary/40",
              active && opt.activeClass,
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}

export function ServiceMatrix({ answers, setAnswer }: Props) {
  const [query, setQuery] = useState("");

  // each row: service + status (both N/A → row goes to bottom + 40% opacity)
  const rows = useMemo(() => {
    const all = ASSISTENCIAL_SERVICOS.map((service, idx) => {
      const tcleId = idFor(idx, "tcle");
      const popId = idFor(idx, "pop");
      const tcle = answers[tcleId]?.answer ?? null;
      const pop = answers[popId]?.answer ?? null;
      const allNa = tcle === "na" && pop === "na";
      return { service, idx, tcleId, popId, tcle, pop, allNa };
    });
    const filtered = query
      ? all.filter((r) => r.service.toLowerCase().includes(query.toLowerCase()))
      : all;
    return filtered.sort((a, b) => {
      if (a.allNa !== b.allNa) return a.allNa ? 1 : -1;
      return a.idx - b.idx;
    });
  }, [answers, query]);

  const totalAnswered = rows.filter((r) => r.tcle && r.pop).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="text-muted-foreground">
          {ASSISTENCIAL_SERVICOS.length} serviços • {totalAnswered} totalmente preenchidos
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar serviço…"
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <div className="rounded-lg border border-border/60 bg-card overflow-hidden">
        <div className="grid grid-cols-[minmax(0,1fr)_140px_140px] items-center gap-2 px-3 py-2 bg-muted/60 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border/60 sticky top-0">
          <span>Serviço</span>
          <span className="text-center">TCLE</span>
          <span className="text-center">POP</span>
        </div>
        <ul className="divide-y divide-border/60 max-h-[640px] overflow-auto">
          {rows.map((r) => (
            <li
              key={r.service}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_140px_140px] items-center gap-2 px-3 py-1.5 transition-all",
                r.allNa && "opacity-40 hover:opacity-100",
              )}
            >
              <span className="text-sm text-foreground truncate" title={r.service}>{r.service}</span>
              <Cell current={r.tcle} onChange={(v) => setAnswer(r.tcleId, v)} />
              <Cell current={r.pop} onChange={(v) => setAnswer(r.popId, v)} />
            </li>
          ))}
          {rows.length === 0 && (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              Nenhum serviço encontrado.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

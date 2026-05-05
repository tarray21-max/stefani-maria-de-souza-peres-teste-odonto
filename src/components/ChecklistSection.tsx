import { useMemo, useState } from "react";
import { CHECKLIST, type Answer, type Category, type Quality, type ResponseMap } from "@/lib/checklist-data";
import { Check, X, MinusCircle, Search, AlertTriangle, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";

interface Props {
  category: Category;
  answers: ResponseMap;
  setAnswer: (id: string, value: Answer) => void;
  setQuality?: (id: string, quality: Quality) => void;
  setJustification?: (id: string, value: string) => void;
}

const OPTIONS: { value: Answer; label: string; icon: typeof Check; activeClass: string }[] = [
  { value: "sim", label: "Sim", icon: Check, activeClass: "bg-success text-white border-success" },
  { value: "nao", label: "Não", icon: X, activeClass: "bg-danger text-white border-danger" },
  { value: "na", label: "N/A", icon: MinusCircle, activeClass: "bg-muted-foreground text-white border-muted-foreground" },
];

export function ChecklistSection({ category, answers, setAnswer, setQuality, setJustification }: Props) {
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const items = useMemo(
    () => CHECKLIST.filter((i) => i.category === category && !i.matrix),
    [category],
  );

  const ordered = useMemo(() => {
    const filtered = query
      ? items.filter((i) => i.title.toLowerCase().includes(query.toLowerCase()))
      : items;
    return filtered
      .map((it) => ({ it, isNa: answers[it.id]?.answer === "na" }))
      .sort((a, b) => {
        if (a.isNa !== b.isNa) return a.isNa ? 1 : -1;
        return a.it.title.localeCompare(b.it.title, "pt-BR");
      })
      .map(({ it }) => it);
  }, [items, answers, query]);

  const answered = items.filter((i) => answers[i.id]?.answer).length;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs">
        <div className="text-muted-foreground">
          {items.length} itens • <span className="font-medium text-foreground">{answered} respondidos</span>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar item…"
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>

      <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card overflow-hidden">
        {ordered.map((item, idx) => {
          const resp = answers[item.id];
          const current = resp?.answer ?? null;
          const quality = resp?.quality ?? null;
          const isNa = current === "na";
          const isSim = current === "sim";
          const isOpen = openId === item.id;
          return (
            <li
              key={item.id}
              className={cn(
                "transition-all",
                isNa && "opacity-40 hover:opacity-100",
              )}
            >
              <div className="flex items-center gap-2 px-3 py-1.5">
                <span className="flex-shrink-0 w-5 h-5 rounded bg-primary/10 text-primary font-semibold flex items-center justify-center text-[10px]">
                  {idx + 1}
                </span>
                <p className="flex-1 min-w-0 text-sm text-foreground leading-tight truncate" title={item.title}>
                  {item.title}
                </p>

                {item.norma && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        title="Ver norma e risco"
                        className="flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded text-amber-600 hover:bg-amber-500/10"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 text-xs space-y-2" side="left">
                      <div>
                        <div className="font-semibold text-foreground mb-1">Norma técnica</div>
                        <p className="text-muted-foreground">{item.norma}</p>
                      </div>
                      {item.risco && (
                        <div>
                          <div className="font-semibold text-danger mb-1">Consequência</div>
                          <p className="text-muted-foreground">{item.risco}</p>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                )}

                {isSim && setQuality && (
                  <div className="flex gap-0.5 flex-shrink-0">
                    <button
                      type="button"
                      title="Implementação Boa (peso 100%)"
                      onClick={() => setQuality(item.id, "bom")}
                      className={cn(
                        "w-6 h-6 inline-flex items-center justify-center rounded border text-[10px]",
                        "border-border bg-background hover:border-success/50",
                        quality === "bom" && "bg-success text-white border-success",
                      )}
                    >
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      title="Implementação Ruim (peso 50%)"
                      onClick={() => setQuality(item.id, "ruim")}
                      className={cn(
                        "w-6 h-6 inline-flex items-center justify-center rounded border text-[10px]",
                        "border-border bg-background hover:border-amber-500/50",
                        quality === "ruim" && "bg-amber-500 text-white border-amber-500",
                      )}
                    >
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {setJustification && (
                  <button
                    type="button"
                    title="Justificativa / implementação"
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className={cn(
                      "flex-shrink-0 w-6 h-6 inline-flex items-center justify-center rounded border text-[10px]",
                      "border-border bg-background hover:border-primary/40",
                      isOpen && "bg-primary text-white border-primary",
                      resp?.justification && "border-primary/50 text-primary",
                    )}
                  >
                    <MessageSquare className="w-3 h-3" />
                  </button>
                )}

                <div className="flex gap-1 flex-shrink-0">
                  {OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = current === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAnswer(item.id, opt.value)}
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium transition-all",
                          "border-border bg-background hover:border-primary/40",
                          active && opt.activeClass,
                        )}
                      >
                        <Icon className="w-3 h-3" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isOpen && setJustification && (
                <div className="px-3 pb-3 pt-1">
                  <Textarea
                    value={resp?.justification ?? ""}
                    onChange={(e) => setJustification(item.id, e.target.value)}
                    placeholder="Descreva como o item está implementado, evidências, pendências…"
                    className="text-xs min-h-[60px]"
                  />
                </div>
              )}
            </li>
          );
        })}
        {ordered.length === 0 && (
          <li className="px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhum item encontrado.
          </li>
        )}
      </ul>
    </div>
  );
}

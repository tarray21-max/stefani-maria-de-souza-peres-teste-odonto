import { useMemo } from "react";
import { CHECKLIST, type Answer, type Category, type ResponseMap } from "@/lib/checklist-data";
import { Check, X, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  category: Category;
  answers: ResponseMap;
  setAnswer: (id: string, value: Answer) => void;
}

const OPTIONS: { value: Answer; label: string; icon: typeof Check; activeClass: string }[] = [
  { value: "sim", label: "Sim", icon: Check, activeClass: "bg-success text-white border-success" },
  { value: "nao", label: "Não", icon: X, activeClass: "bg-danger text-white border-danger" },
  { value: "na", label: "N/A", icon: MinusCircle, activeClass: "bg-muted-foreground text-white border-muted-foreground" },
];

export function ChecklistSection({ category, answers, setAnswer }: Props) {
  const items = useMemo(
    () => CHECKLIST.filter((i) => i.category === category && !i.matrix),
    [category],
  );

  const ordered = useMemo(() => {
    return items
      .map((it) => ({ it, isNa: answers[it.id]?.answer === "na" }))
      .sort((a, b) => {
        if (a.isNa !== b.isNa) return a.isNa ? 1 : -1;
        return a.it.title.localeCompare(b.it.title, "pt-BR");
      })
      .map(({ it }) => it);
  }, [items, answers]);

  const answered = items.filter((i) => answers[i.id]?.answer).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{items.length} itens no checklist</span>
        <span className="font-medium text-foreground">{answered}/{items.length} respondidos</span>
      </div>
      <ul className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card overflow-hidden">
        {ordered.map((item, idx) => {
          const current = answers[item.id]?.answer ?? null;
          const isNa = current === "na";
          return (
            <li
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-3 py-2 transition-all",
                isNa && "opacity-40 hover:opacity-100",
              )}
            >
              <span className="flex-shrink-0 w-6 h-6 rounded bg-primary/10 text-primary font-semibold flex items-center justify-center text-[11px]">
                {idx + 1}
              </span>
              <p className="flex-1 min-w-0 text-sm text-foreground leading-tight truncate" title={item.title}>
                {item.title}
              </p>
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
                        "inline-flex items-center gap-1 px-2 py-1 rounded border text-[11px] font-medium transition-all",
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
            </li>
          );
        })}
      </ul>
    </div>
  );
}

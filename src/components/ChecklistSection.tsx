import { CHECKLIST, type Answer, type Category } from "@/lib/checklist-data";
import { Card } from "@/components/ui/card";
import { Check, X, MinusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  category: Category;
  answers: Record<string, Answer>;
  setAnswer: (id: string, value: Answer) => void;
}

const OPTIONS: { value: Answer; label: string; icon: typeof Check; activeClass: string }[] = [
  { value: "sim", label: "Sim", icon: Check, activeClass: "bg-success text-white border-success" },
  { value: "nao", label: "Não", icon: X, activeClass: "bg-danger text-white border-danger" },
  { value: "na", label: "Não se aplica", icon: MinusCircle, activeClass: "bg-muted-foreground text-white border-muted-foreground" },
];

export function ChecklistSection({ category, answers, setAnswer }: Props) {
  const items = CHECKLIST.filter((i) => i.category === category);
  const answered = items.filter((i) => answers[i.id]).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>{items.length} itens no checklist</span>
        <span className="font-medium text-foreground">{answered}/{items.length} respondidos</span>
      </div>
      <div className="grid gap-3">
        {items.map((item, idx) => {
          const current = answers[item.id] ?? null;
          return (
            <Card key={item.id} className="p-5 border-border/60 hover:border-primary/30 transition-colors">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex gap-4 min-w-0">
                  <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary/10 text-primary font-semibold flex items-center justify-center text-sm">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-foreground leading-tight">{item.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{item.description}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const active = current === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setAnswer(item.id, opt.value)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-3 py-2 rounded-md border text-xs font-medium transition-all",
                          "border-border bg-background hover:border-primary/40",
                          active && opt.activeClass,
                        )}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

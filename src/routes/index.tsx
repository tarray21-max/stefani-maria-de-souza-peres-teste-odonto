import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, FileText, Building, Wrench, SprayCan, Boxes, Building2, Sun, Moon, FileSignature, Pencil, ArrowDown, ArrowUp, GripVertical } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useChecklistStore } from "@/lib/use-checklist-store";
import { useItems } from "@/lib/use-items";
import { Dashboard } from "@/components/Dashboard";
import { ChecklistSection } from "@/components/ChecklistSection";
import { ResetButton } from "@/components/ResetButton";
import { EvolutionTimeline } from "@/components/EvolutionTimeline";
import { VisitorLinks } from "@/components/VisitorLinks";
import { ClientSidebar } from "@/components/ClientSidebar";
import { ServiceMatrix } from "@/components/ServiceMatrix";
import { CATEGORIES, computeMaturity, scoreColorVar, type BaseCategory, type Category } from "@/lib/checklist-data";
import { useAuth } from "@/lib/auth-context";
import { useClients } from "@/lib/client-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Maturidade Regulatória — Gestão para Clínicas de Saúde" },
      { name: "description", content: "Avalie e construa a maturidade regulatória da sua clínica: assistencial, trabalhista e sanitária em um só painel." },
    ],
  }),
  component: Index,
});

const TAB_ICONS: Record<BaseCategory, typeof FileText> = {
  documentacao: FileText,
  infraestrutura: Building,
  procedimentos: Wrench,
  higienizacao: SprayCan,
  cme: Boxes,
};

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const toggle = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem("theme", next ? "dark" : "light");
    document.documentElement.classList.toggle("dark", next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      title={isDark ? "Modo claro" : "Modo escuro"}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}

function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { clients, current } = useClients();

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
    }
  }, [authLoading, user]);

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">Carregando…</div>;
  }

  return (
    <div className="min-h-screen flex w-full bg-background">
      <ClientSidebar onSignOut={async () => { await signOut(); window.location.href = "/login"; }} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-12 flex items-center gap-2 border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-30 px-3">
          <SidebarTrigger />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">
              {current?.nome ?? "Selecione uma clínica"}
            </div>
            {current && (
              <div className="text-[11px] text-muted-foreground truncate">
                {[current.area === "odontologia" ? "Odontologia" : "Medicina", current.especialidade, current.cnpj].filter(Boolean).join(" • ")}
              </div>
            )}
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-5">
          {!current && clients.length === 0 ? (
            <EmptyState />
          ) : !current ? (
            <div className="rounded-lg border border-dashed border-border bg-muted/40 p-6 text-sm text-muted-foreground text-center">
              Selecione uma clínica na barra lateral para começar.
            </div>
          ) : (
            <ClientWorkspace clientId={current.id} />
          )}
        </main>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
        <Building2 className="w-7 h-7" />
      </div>
      <h2 className="text-xl font-bold text-foreground">Cadastre sua primeira clínica</h2>
      <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
        Use o botão <strong>+</strong> na barra lateral para criar uma clínica e desbloquear o painel.
      </p>
    </div>
  );
}

function ClientWorkspace({ clientId }: { clientId: string }) {
  const { current } = useClients();
  const { answers, setAnswer, setQuality, setJustification, reset, loaded } = useChecklistStore(clientId);
  const { items, refresh: refreshItems, imageUrlsFor, positions, reorderCategory } = useItems(clientId);
  const { label, labels, save: saveLabels } = useTabLabels(clientId);
  const { order, save: saveOrder } = useTabOrder(clientId);
  const global = computeMaturity(answers, items);
  const color = scoreColorVar(global.score);

  // Apenas categorias (exclui "dashboard") para os cards do painel
  const dashboardCategoryOrder = order.filter((k): k is Category => k !== "dashboard");
  const dashboardLabels: Partial<Record<Category, string>> = {};
  for (const k of dashboardCategoryOrder) dashboardLabels[k] = label(k);

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold" style={{ color }}>
            {loaded ? `${Math.round(global.score)}% maturidade` : "Carregando…"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <VisitorLinks clientId={clientId} />
          <ResetButton onConfirm={(j) => reset(j)} />
        </div>
      </div>

      <TabsWithRename
        clientId={clientId}
        answers={answers}
        items={items}
        current={current}
        setAnswer={setAnswer}
        setQuality={setQuality}
        setJustification={setJustification}
        refreshItems={refreshItems}
        imageUrlsFor={imageUrlsFor}
        positions={positions}
        reorderCategory={reorderCategory}
        label={label}
        labels={labels}
        saveLabels={saveLabels}
        order={order}
        saveOrder={saveOrder}
        dashboardCategoryOrder={dashboardCategoryOrder}
        dashboardLabels={dashboardLabels}
      />

      <footer className="mt-10 pt-4 border-t border-border/60 text-center text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
        Brasil e Silveira Advogados · Maturidade Regulatória
      </footer>
    </>
  );
}

type TabKey = "dashboard" | Category | "tcle_pop";

const DEFAULT_LABELS: Record<TabKey, string> = {
  dashboard: "Painel",
  documentacao: "Documentação",
  infraestrutura: "Infraestrutura",
  procedimentos: "Procedimentos",
  higienizacao: "Higienização",
  cme: "CME",
  tcle_pop: "TCLE × POP",
};

const TAB_ORDER: TabKey[] = ["dashboard", "documentacao", "infraestrutura", "procedimentos", "higienizacao", "cme", "tcle_pop"];

const TAB_ICONS_ALL: Record<TabKey, typeof FileText> = {
  dashboard: LayoutDashboard,
  documentacao: FileText,
  infraestrutura: Building,
  procedimentos: Wrench,
  higienizacao: SprayCan,
  cme: Boxes,
  tcle_pop: FileSignature,
};

function useTabLabels(clientId: string) {
  const storageKey = `tabLabels:${clientId}`;
  const [labels, setLabels] = useState<Record<string, string>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(storageKey) ?? "{}"); } catch { return {}; }
  });
  const label = (k: TabKey) => labels[k] ?? DEFAULT_LABELS[k];
  const save = (next: Record<string, string>) => {
    setLabels(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  return { label, labels, save };
}

function useTabOrder(clientId: string) {
  const storageKey = `tabOrder:${clientId}`;
  const [order, setOrder] = useState<TabKey[]>(() => {
    if (typeof window === "undefined") return TAB_ORDER;
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "[]") as TabKey[];
      const valid = saved.filter((k) => TAB_ORDER.includes(k));
      return [...valid, ...TAB_ORDER.filter((k) => !valid.includes(k))];
    } catch { return TAB_ORDER; }
  });
  const save = (next: TabKey[]) => {
    setOrder(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };
  return { order, save };
}

function TabsWithRename(props: {
  clientId: string;
  answers: ReturnType<typeof useChecklistStore>["answers"];
  items: ReturnType<typeof useItems>["items"];
  current: ReturnType<typeof useClients>["current"];
  setAnswer: ReturnType<typeof useChecklistStore>["setAnswer"];
  setQuality: ReturnType<typeof useChecklistStore>["setQuality"];
  setJustification: ReturnType<typeof useChecklistStore>["setJustification"];
  refreshItems: ReturnType<typeof useItems>["refresh"];
  imageUrlsFor: ReturnType<typeof useItems>["imageUrlsFor"];
  positions: ReturnType<typeof useItems>["positions"];
  reorderCategory: ReturnType<typeof useItems>["reorderCategory"];
  label: (k: TabKey) => string;
  labels: Record<string, string>;
  saveLabels: (next: Record<string, string>) => void;
  order: TabKey[];
  saveOrder: (next: TabKey[]) => void;
  dashboardCategoryOrder: Category[];
  dashboardLabels: Partial<Record<Category, string>>;
}) {
  const { clientId, answers, items, current, setAnswer, setQuality, setJustification, refreshItems, imageUrlsFor, positions, reorderCategory, label, labels, saveLabels, order, saveOrder, dashboardCategoryOrder, dashboardLabels } = props;
  const [renameOpen, setRenameOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});

  const openRename = () => {
    const init: Record<string, string> = {};
    TAB_ORDER.forEach((k) => { init[k] = labels[k] ?? DEFAULT_LABELS[k]; });
    setDraft(init);
    setRenameOpen(true);
  };

  const applyRename = () => {
    const cleaned: Record<string, string> = {};
    Object.entries(draft).forEach(([k, v]) => {
      const t = v.trim();
      if (t && t !== DEFAULT_LABELS[k as TabKey]) cleaned[k] = t;
    });
    saveLabels(cleaned);
    setRenameOpen(false);
  };

  const moveTab = (tab: TabKey, direction: -1 | 1) => {
    const idx = order.indexOf(tab);
    const to = idx + direction;
    if (idx < 0 || to < 0 || to >= order.length) return;
    const next = [...order];
    const [moved] = next.splice(idx, 1);
    next.splice(to, 0, moved);
    saveOrder(next);
  };

  return (
    <Tabs defaultValue="dashboard" className="w-full">
      <div className="flex items-start gap-2">
        <TabsList className="flex-1 h-auto p-1 bg-muted/60 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-1">
          {order.map((k) => {
            const Icon = TAB_ICONS_ALL[k];
            return (
              <TabsTrigger key={k} value={k} className="flex items-center gap-2 py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Icon className="w-4 h-4" />
                <span className="text-sm truncate">{label(k)}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
        <Button variant="outline" size="sm" className="h-9 mt-1" onClick={openRename} title="Renomear abas">
          <Pencil className="w-3.5 h-3.5" />
        </Button>
      </div>

      <TabsContent value="dashboard" className="mt-5 space-y-5">
        <Dashboard answers={answers} items={items} client={current} />
        <EvolutionTimeline clientId={clientId} answers={answers} items={items} />
      </TabsContent>

      {CATEGORIES.map((c) => (
        <TabsContent key={c.id} value={c.id} className="mt-5">
          <SectionHeader title={label(c.id)} subtitle={`${items.filter((i) => i.category === c.id).length} requisitos neste grupo.`} />
          <ChecklistSection category={c.id} items={items} answers={answers} setAnswer={setAnswer} setQuality={setQuality} setJustification={setJustification} clientId={clientId} onItemsChange={refreshItems} imageUrlsFor={imageUrlsFor} positions={positions} reorderCategory={reorderCategory} />
        </TabsContent>
      ))}

      <TabsContent value="tcle_pop" className="mt-5">
        <SectionHeader title={label("tcle_pop")} subtitle="Indique se cada serviço prestado possui TCLE e POP correspondentes." />
        <ChecklistSection category="tcle_pop" items={items} answers={answers} setAnswer={setAnswer} setQuality={setQuality} setJustification={setJustification} clientId={clientId} onItemsChange={refreshItems} imageUrlsFor={imageUrlsFor} positions={positions} reorderCategory={reorderCategory} />
        <ServiceMatrix answers={answers} setAnswer={setAnswer} clientId={clientId} />
      </TabsContent>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Renomear abas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {order.map((k, idx) => (
              <div key={k} className="grid grid-cols-[28px_120px_1fr_auto] items-center gap-3">
                <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs text-muted-foreground">{DEFAULT_LABELS[k]}</Label>
                <Input
                  value={draft[k] ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, [k]: e.target.value }))}
                  placeholder={DEFAULT_LABELS[k]}
                />
                <div className="flex items-center gap-1">
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => moveTab(k, -1)} disabled={idx === 0} title="Mover aba para a esquerda">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => moveTab(k, 1)} disabled={idx === order.length - 1} title="Mover aba para a direita">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>Cancelar</Button>
            <Button onClick={applyRename}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
}


function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-xl font-bold text-foreground">{title}</h2>
      <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

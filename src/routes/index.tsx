import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Stethoscope, LayoutDashboard, HeartPulse, Briefcase, ShieldCheck, LogOut, LineChart } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useChecklistStore } from "@/lib/use-checklist-store";
import { useItems } from "@/lib/use-items";
import { Dashboard } from "@/components/Dashboard";
import { ChecklistSection } from "@/components/ChecklistSection";
import { ServiceMatrix } from "@/components/ServiceMatrix";
import { ResetButton } from "@/components/ResetButton";
import { ClientIdentification } from "@/components/ClientIdentification";
import { EvolutionReport } from "@/components/EvolutionReport";
import { VisitorLinks } from "@/components/VisitorLinks";
import { computeMaturity, scoreColorVar } from "@/lib/checklist-data";
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

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "assistencial", label: "Assistencial", icon: HeartPulse },
  { id: "trabalhista", label: "Pessoas e Parcerias", icon: Briefcase },
  { id: "sanitaria", label: "Sanitária", icon: ShieldCheck },
] as const;

function Index() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { clients, current, setCurrentId } = useClients();

  useEffect(() => {
    if (!authLoading && !user) {
      window.location.href = "/login";
    }
  }, [authLoading, user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Carregando…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader
        clients={clients}
        currentId={current?.id ?? ""}
        onSelect={setCurrentId}
        onSignOut={async () => {
          await signOut();
          window.location.href = "/login";
        }}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {!current && (
          <div className="mb-4 rounded-lg border border-dashed border-border bg-muted/40 p-3 text-xs text-muted-foreground text-center">
            Você está visualizando o painel em modo demonstração. Cadastre uma clínica abaixo para salvar suas respostas na nuvem.
          </div>
        )}
        <ClientIdentification />
        <ClientWorkspace clientId={current?.id ?? null} demo={!current} />
        <footer className="mt-12 text-center text-xs text-muted-foreground">
          {current ? "Painel sincronizado em tempo real via Lovable Cloud." : "Modo demonstração — respostas não são salvas."}
        </footer>
      </main>
    </div>
  );
}

function ClientWorkspace({ clientId, demo = false }: { clientId: string | null; demo?: boolean }) {
  const { answers, setAnswer, setQuality, setJustification, reset, loaded } = useChecklistStore(clientId);
  const global = computeMaturity(answers);
  const color = scoreColorVar(global.score);

  return (
    <>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold" style={{ color }}>
            {loaded ? `${Math.round(global.score)}% maturidade` : "Carregando…"}
          </span>
        </div>
        <ResetButton onConfirm={(j) => reset(j)} />
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full h-auto p-1 bg-muted/60 grid grid-cols-2 md:grid-cols-4 gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger
                key={t.id}
                value={t.id}
                className="flex items-center gap-2 py-2.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="dashboard" className="mt-6">
          <Dashboard answers={answers} />
        </TabsContent>

        <TabsContent value="assistencial" className="mt-6 space-y-8">
          <div>
            <SectionHeader title="Combo Assistencial: Blindagem Jurídica" subtitle="Documentação geral da relação com o paciente." />
            <ChecklistSection category="assistencial" answers={answers} setAnswer={setAnswer} setQuality={setQuality} setJustification={setJustification} />
          </div>
          <div>
            <SectionHeader title="TCLE & POP por Serviço" subtitle="Matriz compacta: marque a existência de TCLE e POP para cada procedimento." />
            <ServiceMatrix answers={answers} setAnswer={setAnswer} />
          </div>
        </TabsContent>

        <TabsContent value="trabalhista" className="mt-6">
          <SectionHeader title="Combo Pessoas e Parcerias" subtitle="Blindagem da equipe, contratos, LGPD e saúde ocupacional." />
          <ChecklistSection category="trabalhista" answers={answers} setAnswer={setAnswer} setQuality={setQuality} setJustification={setJustification} />
        </TabsContent>

        <TabsContent value="sanitaria" className="mt-6">
          <SectionHeader title="Combo Vigilância Sanitária e Infraestrutura" subtitle="Alvarás, PGRSS, CME, infraestrutura e segurança sanitária." />
          <ChecklistSection category="sanitaria" answers={answers} setAnswer={setAnswer} setQuality={setQuality} setJustification={setJustification} />
        </TabsContent>
      </Tabs>
    </>
  );
}

function AppHeader({
  clients,
  currentId,
  onSelect,
  onSignOut,
}: {
  clients: { id: string; nome: string }[];
  currentId: string;
  onSelect: (id: string) => void;
  onSignOut: () => void;
}) {
  return (
    <header className="border-b border-border/60 bg-card/60 backdrop-blur-sm sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Stethoscope className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-foreground leading-tight truncate">Maturidade Regulatória</h1>
            <p className="text-xs text-muted-foreground truncate">Gestão para Clínicas de Saúde</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {clients.length > 0 && (
            <Select value={currentId} onValueChange={onSelect}>
              <SelectTrigger className="h-9 w-[180px] sm:w-[240px]">
                <SelectValue placeholder="Selecionar clínica" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="ghost" size="sm" onClick={onSignOut} title="Sair">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-2xl font-bold text-foreground">{title}</h2>
      <p className="text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

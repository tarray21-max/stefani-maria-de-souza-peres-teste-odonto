import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LayoutDashboard, HeartPulse, Briefcase, ShieldCheck, Building2 } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useChecklistStore } from "@/lib/use-checklist-store";
import { useItems } from "@/lib/use-items";
import { Dashboard } from "@/components/Dashboard";
import { ChecklistSection } from "@/components/ChecklistSection";
import { ServiceMatrix } from "@/components/ServiceMatrix";
import { ResetButton } from "@/components/ResetButton";
import { EvolutionTimeline } from "@/components/EvolutionTimeline";
import { VisitorLinks } from "@/components/VisitorLinks";
import { ClientSidebar } from "@/components/ClientSidebar";
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
  { id: "dashboard", label: "Painel", icon: LayoutDashboard },
  { id: "assistencial", label: "Assistencial", icon: HeartPulse },
  { id: "trabalhista", label: "Pessoas e Parcerias", icon: Briefcase },
  { id: "sanitaria", label: "Sanitária", icon: ShieldCheck },
] as const;

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
  const { answers, setAnswer, setQuality, setJustification, reset, loaded } = useChecklistStore(clientId);
  const { items, refresh: refreshItems, imageUrlsFor } = useItems(clientId);
  const global = computeMaturity(answers, items);
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
        <div className="flex items-center gap-2">
          <VisitorLinks clientId={clientId} />
          <ResetButton onConfirm={(j) => reset(j)} />
        </div>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="w-full h-auto p-1 bg-muted/60 grid grid-cols-2 md:grid-cols-4 gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id} className="flex items-center gap-2 py-2 data-[state=active]:bg-card data-[state=active]:shadow-sm">
                <Icon className="w-4 h-4" />
                <span className="text-sm">{t.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="dashboard" className="mt-5 space-y-5">
          <Dashboard answers={answers} items={items} />
          <EvolutionTimeline clientId={clientId} answers={answers} items={items} />
        </TabsContent>

        <TabsContent value="assistencial" className="mt-5 space-y-6">
          <div>
            <SectionHeader title="Combo Assistencial: Blindagem Jurídica" subtitle="Documentação geral da relação com o paciente." />
            <ChecklistSection category="assistencial" items={items} answers={answers} setAnswer={setAnswer} setQuality={setQuality} setJustification={setJustification} clientId={clientId} onItemsChange={refreshItems} imageUrlsFor={imageUrlsFor} />
          </div>
          <div>
            <SectionHeader title="TCLE & POP por Serviço" subtitle="Matriz compacta: marque a existência de TCLE e POP para cada procedimento." />
            <ServiceMatrix answers={answers} setAnswer={setAnswer} />
          </div>
        </TabsContent>

        <TabsContent value="trabalhista" className="mt-5">
          <SectionHeader title="Combo Pessoas e Parcerias" subtitle="Blindagem da equipe, contratos, LGPD e saúde ocupacional." />
          <ChecklistSection category="trabalhista" items={items} answers={answers} setAnswer={setAnswer} setQuality={setQuality} setJustification={setJustification} clientId={clientId} onItemsChange={refreshItems} imageUrlsFor={imageUrlsFor} />
        </TabsContent>

        <TabsContent value="sanitaria" className="mt-5">
          <SectionHeader title="Combo Vigilância Sanitária e Infraestrutura" subtitle="Alvarás, PGRSS, CME, infraestrutura e segurança sanitária." />
          <ChecklistSection category="sanitaria" items={items} answers={answers} setAnswer={setAnswer} setQuality={setQuality} setJustification={setJustification} clientId={clientId} onItemsChange={refreshItems} imageUrlsFor={imageUrlsFor} />
        </TabsContent>
      </Tabs>

      <footer className="mt-10 text-center text-xs text-muted-foreground">
        Painel sincronizado em tempo real via Lovable Cloud.
      </footer>
    </>
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

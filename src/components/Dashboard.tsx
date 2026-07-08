import { CATEGORIES, computeMaturity, scoreColorVar, type Category, type ChecklistItem, type ResponseMap } from "@/lib/checklist-data";
import { contractLabel, type ClientRow } from "@/lib/client-context";
import { formatCNPJ, formatPhone } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ToothGauge } from "./ToothGauge";
import { AlertTriangle, CheckCircle2, MinusCircle, TrendingUp, Building2, User, Hash, MapPin, Phone, Briefcase, Stethoscope, Pencil, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  answers: ResponseMap;
  items: ChecklistItem[];
  client?: ClientRow | null;
  /** Rótulos customizados das abas; chave = id da categoria */
  categoryLabels?: Partial<Record<Category, string>>;
  /** Ordem das categorias a exibir nos cards */
  categoryOrder?: Category[];
}

const DEFAULT_CATEGORY_SHORT: Record<Category, string> = {
  documentacao: "Documentação",
  infraestrutura: "Infraestrutura",
  procedimentos: "Procedimentos",
  higienizacao: "Higienização",
  cme: "CME",
  tcle_pop: "TCLE × POP",
};

export function Dashboard({ answers, items, client, categoryLabels, categoryOrder }: Props) {
  const global = computeMaturity(answers, items);

  const orderedCategories: Category[] = categoryOrder && categoryOrder.length > 0
    ? categoryOrder
    : [...CATEGORIES.map((c) => c.id as Category), "tcle_pop"];

  const perCategory = orderedCategories.map((id) => ({
    id,
    short: categoryLabels?.[id] ?? DEFAULT_CATEGORY_SHORT[id],
    result: computeMaturity(answers, items.filter((i) => i.category === id)),
  }));

  const gargalos = items
    .filter((i) => answers[i.id]?.answer === "nao")
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5);

  const stats = [
    { label: "Conformes", value: global.totalSim, icon: CheckCircle2, color: "var(--success)" },
    { label: "Pendentes", value: global.totalNao, icon: AlertTriangle, color: "var(--danger)" },
    { label: "Não se aplica", value: global.totalNa, icon: MinusCircle, color: "oklch(0.55 0.02 240)" },
    { label: "Itens totais", value: global.totalItems, icon: TrendingUp, color: "var(--primary)" },
  ];

  const enderecoCompleto = client
    ? [
        [client.logradouro, client.numero].filter(Boolean).join(", "),
        client.complemento,
        client.bairro,
        [client.cidade, client.estado].filter(Boolean).join(" / "),
        client.cep ? `CEP ${client.cep}` : null,
        client.endereco,
      ].filter((p) => p && String(p).trim().length > 0).join(" • ")
    : "";

  const especialidadesFormatadas = client
    ? (client.especialidades && client.especialidades.length > 0
        ? client.especialidades.map((e, i) => {
            const n = (client.especialidades_numeros ?? [])[i];
            return n ? `${e} (${n})` : e;
          }).join(", ")
        : client.especialidade)
    : null;

  const clinicaItems = client
    ? [
        { icon: User, label: "Responsável Técnico", value: client.profissional_responsavel },
        { icon: Hash, label: "CRM / CRO", value: client.crm_cro },
        { icon: Stethoscope, label: "Especialidades", value: especialidadesFormatadas },
        { icon: Hash, label: "CNPJ", value: formatCNPJ(client.cnpj) },
        { icon: Briefcase, label: "Contrato", value: contractLabel(client) },
        { icon: Phone, label: "Telefone", value: formatPhone(client.telefone) },
        { icon: Share2, label: "Redes sociais", value: client.redes_sociais },
        { icon: MapPin, label: "Endereço", value: enderecoCompleto },
      ].filter((i) => i.value && String(i.value).trim().length > 0)
    : [];

  return (
    <div className="space-y-6 bg-muted/60 rounded-xl p-5 border border-border/40">
      <Card
        className="p-6 md:p-8 border-primary/20 relative overflow-hidden text-primary-foreground shadow-[var(--shadow-elegant)]"
        style={{ background: "var(--gradient-primary)" }}
      >
        <div
          className="absolute -top-24 -right-24 w-72 h-72 rounded-full opacity-30 blur-3xl pointer-events-none"
          style={{ background: "var(--brand-blue-bright)" }}
        />
        <div className="relative grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-8 items-center">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-white/80 mb-2">
              <Building2 className="w-3.5 h-3.5" />
              Identificação da Clínica
            </div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                {client?.nome ?? "—"}
              </h2>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-full bg-white/15 text-white hover:bg-white/25 hover:text-white shrink-0"
                title="Editar clínica"
                onClick={() => window.dispatchEvent(new CustomEvent("edit-client"))}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
            <div className="mt-1 text-xs uppercase tracking-wider text-white/70">
              {(() => {
                const labels: Record<string, string> = { medicina: "Médica", odontologia: "Odontológica", biomedicina: "Biomédica" };
                const areas = client?.areas && client.areas.length > 0 ? client.areas : (client?.area ? [client.area] : []);
                return areas.map((a) => labels[a] ?? a).join(" + ");
              })()}
            </div>

            {clinicaItems.length > 0 ? (
              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {clinicaItems.map((i) => {
                  const Icon = i.icon;
                  return (
                    <div key={i.label} className="flex items-start gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-md bg-white/15 text-white flex items-center justify-center flex-shrink-0 backdrop-blur-sm">
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] uppercase tracking-wider text-white/60">{i.label}</div>
                        <div className="text-sm font-medium text-white truncate">{i.value}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/70">
                Complete o cadastro da clínica para exibir os dados aqui.
              </p>
            )}
          </div>

          <div className="flex flex-col items-center lg:border-l lg:border-white/20 lg:pl-8">
            <div className="flex items-center gap-2 text-xs font-semibold tracking-widest uppercase text-white/80 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-white" />
              Maturidade Regulatória
            </div>
            <div className="rounded-full bg-white/10 p-3 backdrop-blur-sm">
              <ToothGauge score={global.score} size={220} />
            </div>
            <p className="text-sm text-white/80 mt-3 text-center">
              {global.totalSim} conformes de {global.totalApplicable} itens aplicáveis
            </p>
          </div>
        </div>
      </Card>


      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.label}
              className="p-5 border-primary/15 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg, var(--card) 60%, color-mix(in oklab, var(--primary) 8%, var(--card)))" }}
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "color-mix(in oklab, var(--primary) 12%, transparent)" }}>
                <Icon className="w-5 h-5" style={{ color: s.color }} />
              </div>
              <div className="mt-3 text-3xl font-bold text-foreground">{s.value}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">{s.label}</div>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {perCategory.map((c) => {
          const isCritical = c.result.totalApplicable > 0 && c.result.score < 40;
          return (
            <Card
              key={c.id}
              className={`p-6 relative ${isCritical ? "border-2 border-danger ring-2 ring-danger/20" : "border-primary/15"}`}
              style={{
                background: isCritical
                  ? "linear-gradient(180deg, var(--card), color-mix(in oklab, var(--danger) 8%, var(--card)))"
                  : "linear-gradient(180deg, var(--card), color-mix(in oklab, var(--primary) 5%, var(--card)))",
              }}
            >
              {isCritical && (
                <span className="absolute -top-2 -right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
                  <AlertTriangle className="w-3 h-3" /> Crítico
                </span>
              )}
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground">{c.short}</h3>
                <span className="text-sm font-bold" style={{ color: scoreColorVar(c.result.score) }}>
                  {Math.round(c.result.score)}%
                </span>
              </div>
              <Progress value={c.result.score} className="h-2" />
              <p className="text-xs text-muted-foreground mt-3">
                {c.result.totalSim}/{c.result.totalApplicable} conformes
              </p>
              <div className="mt-3 flex items-center gap-1.5 flex-wrap text-[11px] font-medium">
                <span className="px-2 py-0.5 rounded-full border border-success/30 bg-success/10 text-success">
                  Sim {c.result.totalSim}
                </span>
                <span className="px-2 py-0.5 rounded-full border border-danger/30 bg-danger/10 text-danger">
                  Não {c.result.totalNao}
                </span>
                <span className="px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">
                  N/A {c.result.totalNa}
                </span>
              </div>
            </Card>
          );
        })}
      </div>


      <Card
        className="p-6 border-primary/15"
        style={{ background: "linear-gradient(180deg, var(--card), color-mix(in oklab, var(--primary) 4%, var(--card)))" }}
      >
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-danger/10">
            <AlertTriangle className="w-5 h-5 text-danger" />
          </div>
          <h3 className="font-semibold text-foreground">Principais Gargalos</h3>
          <span className="text-xs text-muted-foreground ml-auto">Itens "Não" com maior peso</span>
        </div>
        {gargalos.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhum gargalo crítico identificado.
          </p>
        ) : (
          <div className="space-y-3">
            {gargalos.map((g, i) => {
              const catShort = categoryLabels?.[g.category] ?? DEFAULT_CATEGORY_SHORT[g.category];
              return (
                <div key={g.id} className="flex items-start gap-4 p-4 rounded-lg bg-danger/5 border border-danger/20">
                  <div className="w-8 h-8 rounded-full bg-danger text-white font-bold flex items-center justify-center flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-foreground">{g.title}</h4>
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-background border border-border text-muted-foreground">
                        {catShort}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs font-semibold text-danger flex-shrink-0">Peso {g.weight}</div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

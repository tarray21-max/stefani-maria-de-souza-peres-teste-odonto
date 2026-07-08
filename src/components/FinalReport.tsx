import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileDown, AlertOctagon, AlertTriangle, CalendarClock, ChevronDown, Info } from "lucide-react";
import {
  CATEGORIES,
  computeMaturity,
  getValidityStatus,
  scoreColorVar,
  scoreLabel,
  type Category,
  type ChecklistItem,
  type ResponseMap,
} from "@/lib/checklist-data";
import { contractLabel, type ClientRow } from "@/lib/client-context";
import { formatCNPJ, formatPhone } from "@/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  client: ClientRow | null;
  answers: ResponseMap;
  items: ChecklistItem[];
  categoryLabels?: Partial<Record<Category, string>>;
}

const DEFAULT_LABELS: Record<Category, string> = {
  documentacao: "Documentação",
  infraestrutura: "Infraestrutura",
  procedimentos: "Procedimentos",
  higienizacao: "Higienização",
  cme: "CME",
  tcle_pop: "TCLE × POP",
};

const VALIDITY_LABEL: Record<string, string> = {
  expired: "Vencido",
  d15: "Vence em até 15 dias",
  d30: "Vence em até 30 dias",
  d60: "Vence em até 60 dias",
};

const AREA_LABEL: Record<string, string> = {
  medicina: "Médica",
  odontologia: "Odontológica",
  biomedicina: "Biomédica",
};

/** Classifica urgência pelo peso do item. */
function urgencyOf(weight: number): "alta" | "media" | "baixa" {
  if (weight >= 8) return "alta";
  if (weight >= 5) return "media";
  return "baixa";
}

const URGENCY_STYLE: Record<"alta" | "media" | "baixa", { dot: string; text: string; bg: string; label: string }> = {
  alta: {
    dot: "bg-danger",
    text: "text-danger",
    bg: "bg-danger/5 border-danger/30",
    label: "Alta",
  },
  media: {
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/5 border-warning/30",
    label: "Média",
  },
  baixa: {
    dot: "bg-muted-foreground/50",
    text: "text-muted-foreground",
    bg: "bg-muted/50 border-border",
    label: "Informativo",
  },
};

export function FinalReport({ open, onOpenChange, client, answers, items, categoryLabels }: Props) {
  const labelOf = (c: Category) => categoryLabels?.[c] ?? DEFAULT_LABELS[c];

  const global = useMemo(() => computeMaturity(answers, items), [answers, items]);

  const allCategories: Category[] = [...CATEGORIES.map((c) => c.id as Category), "tcle_pop"];
  const perCategory = allCategories.map((id) => ({
    id,
    label: labelOf(id),
    result: computeMaturity(answers, items.filter((i) => i.category === id)),
    pendentes: items.filter((i) => i.category === id && answers[i.id]?.answer === "nao")
      .sort((a, b) => b.weight - a.weight),
    semResposta: items.filter((i) => i.category === id && !answers[i.id]?.answer),
    qualidadeRuim: items.filter((i) => i.category === id && answers[i.id]?.answer === "sim" && answers[i.id]?.quality === "ruim"),
  }));

  const validityRows = items
    .map((it) => ({ it, r: answers[it.id], v: getValidityStatus(answers[it.id]) }))
    .filter((x) => ["expired", "d15", "d30", "d60"].includes(x.v.status))
    .sort((a, b) => (a.v.days ?? 0) - (b.v.days ?? 0));

  const expiredCount = validityRows.filter((x) => x.v.status === "expired").length;

  const areas = client?.areas && client.areas.length > 0 ? client.areas : (client?.area ? [client.area] : []);
  const hoje = new Date().toLocaleDateString("pt-BR");

  // Escala do gráfico: máximo é sempre 100 para leitura direta em %
  const maxScore = 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader className="print-hide">
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span>Relatório final de organização</span>
            <Button size="sm" onClick={() => window.print()}>
              <Printer className="w-4 h-4 mr-1" /> Imprimir / Salvar PDF
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="print-report text-sm text-foreground">
          {/* Cabeçalho */}
          <div className="border-b-2 border-border pb-4 mb-5 avoid-break">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Relatório Consolidado de Pendências
            </div>
            <h1 className="text-2xl font-bold mt-1">{client?.nome ?? "—"}</h1>
            <div className="text-xs text-muted-foreground mt-1">
              {areas.map((a) => AREA_LABEL[a] ?? a).join(" + ")}
              {client?.cnpj && <> • CNPJ {formatCNPJ(client.cnpj)}</>}
              {client && <> • Contrato: {contractLabel(client)}</>}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 mt-3 text-xs">
              {client?.profissional_responsavel && (
                <div><span className="text-muted-foreground">Responsável Técnico: </span>{client.profissional_responsavel}</div>
              )}
              {client?.especialidades && client.especialidades.length > 0 && (
                <div><span className="text-muted-foreground">Especialidades: </span>{client.especialidades.join(", ")}</div>
              )}
              {client?.telefone && (
                <div><span className="text-muted-foreground">Telefone: </span>{formatPhone(client.telefone)}</div>
              )}
              {client?.endereco && (
                <div className="md:col-span-3"><span className="text-muted-foreground">Endereço: </span>{client.endereco}</div>
              )}
              <div><span className="text-muted-foreground">Emitido em: </span>{hoje}</div>
            </div>
          </div>

          {/* 1. RESUMO EXECUTIVO */}
          <section className="mb-6 avoid-break">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="text-base font-bold">Resumo executivo</h2>
              <div className="text-xs text-muted-foreground">
                {global.totalSim} conformes • {global.totalNao} pendentes • {global.totalNa} não se aplica
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5 items-stretch">
              {/* Score global */}
              <div
                className="rounded-lg border border-border p-4 flex flex-col items-center justify-center"
                style={{ background: "color-mix(in oklab, var(--primary) 5%, var(--card))" }}
              >
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Maturidade global</div>
                <div className="text-5xl font-bold mt-2" style={{ color: scoreColorVar(global.score) }}>
                  {Math.round(global.score)}%
                </div>
                <div className="text-[11px] uppercase tracking-wider mt-1 font-semibold" style={{ color: scoreColorVar(global.score) }}>
                  {scoreLabel(global.score)}
                </div>
                <div className="text-[10px] text-muted-foreground mt-2 text-center">
                  {global.totalApplicable} itens aplicáveis
                </div>
              </div>

              {/* Gráfico de barras por categoria */}
              <div className="rounded-lg border border-border p-4">
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                  Score por categoria
                </div>
                <div className="space-y-2">
                  {perCategory.map((c) => {
                    const pct = Math.round(c.result.score);
                    const color = scoreColorVar(c.result.score);
                    return (
                      <div key={c.id} className="grid grid-cols-[120px_1fr_44px] items-center gap-2 text-xs">
                        <div className="truncate">{c.label}</div>
                        <div className="h-4 rounded bg-muted overflow-hidden relative">
                          <div
                            className="h-full rounded transition-all"
                            style={{ width: `${(pct / maxScore) * 100}%`, background: color }}
                          />
                        </div>
                        <div className="text-right font-semibold" style={{ color }}>{pct}%</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Tabela detalhada */}
            <table className="w-full text-xs border-collapse mt-4">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-1.5 pr-2 font-semibold">Categoria</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Score</th>
                  <th className="py-1.5 px-2 text-right font-semibold text-success">Sim</th>
                  <th className="py-1.5 px-2 text-right font-semibold text-danger">Não</th>
                  <th className="py-1.5 px-2 text-right font-semibold text-muted-foreground">N/A</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Aplicáveis</th>
                </tr>
              </thead>
              <tbody>
                {perCategory.map((c) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="py-1.5 pr-2">{c.label}</td>
                    <td className="py-1.5 px-2 text-right font-semibold" style={{ color: scoreColorVar(c.result.score) }}>
                      {Math.round(c.result.score)}%
                    </td>
                    <td className="py-1.5 px-2 text-right text-success">{c.result.totalSim}</td>
                    <td className="py-1.5 px-2 text-right text-danger">{c.result.totalNao}</td>
                    <td className="py-1.5 px-2 text-right text-muted-foreground">{c.result.totalNa}</td>
                    <td className="py-1.5 px-2 text-right">{c.result.totalApplicable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* 2. DOCUMENTOS VENCIDOS — bloco de alerta em destaque */}
          {validityRows.length > 0 && (
            <section
              className="mb-6 avoid-break rounded-lg border-2 border-danger/40 p-4"
              style={{ background: "color-mix(in oklab, var(--danger) 6%, var(--card))" }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-danger text-white flex items-center justify-center flex-shrink-0">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-danger">Documentos vencidos ou a vencer</h2>
                    <span className="text-[11px] uppercase tracking-wider text-danger font-semibold">Ação imediata</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {expiredCount > 0 && (
                      <><strong className="text-danger">{expiredCount} vencido{expiredCount > 1 ? "s" : ""}</strong> · </>
                    )}
                    {validityRows.length - expiredCount} próximo{validityRows.length - expiredCount === 1 ? "" : "s"} do vencimento
                  </p>
                </div>
              </div>

              <table className="w-full text-xs border-collapse mt-3">
                <thead>
                  <tr className="border-b border-danger/30 text-left">
                    <th className="py-1.5 pr-2 font-semibold">Item</th>
                    <th className="py-1.5 px-2 font-semibold">Categoria</th>
                    <th className="py-1.5 px-2 font-semibold">Validade</th>
                    <th className="py-1.5 px-2 font-semibold">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {validityRows.map(({ it, r, v }) => (
                    <tr key={it.id} className="border-b border-border/40 avoid-break">
                      <td className="py-1.5 pr-2 font-medium">{it.title}</td>
                      <td className="py-1.5 px-2 text-muted-foreground">{labelOf(it.category)}</td>
                      <td className="py-1.5 px-2">
                        {r?.validity_date ? new Date(r.validity_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className={`py-1.5 px-2 font-semibold ${v.status === "expired" ? "text-danger" : "text-warning"}`}>
                        <span className="inline-flex items-center gap-1.5">
                          {v.status === "expired" ? <AlertOctagon className="w-3 h-3" /> : <CalendarClock className="w-3 h-3" />}
                          {VALIDITY_LABEL[v.status] ?? "—"}
                          {v.days !== null && v.status !== "expired" && <> ({v.days}d)</>}
                          {v.status === "expired" && v.days !== null && <> ({Math.abs(v.days)}d atrás)</>}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* 3. SUMÁRIO — âncoras */}
          <section className="mb-6 avoid-break rounded-lg border border-border p-4 bg-muted/40 print-hide">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Sumário</div>
            <div className="flex flex-wrap gap-2 text-xs">
              {perCategory.map((c) => {
                const total = c.pendentes.length + c.qualidadeRuim.length + c.semResposta.length;
                if (total === 0) return null;
                return (
                  <a
                    key={c.id}
                    href={`#cat-${c.id}`}
                    className="px-2.5 py-1 rounded-full border border-border bg-background hover:bg-primary/10 hover:border-primary/40 transition-colors font-medium"
                  >
                    {c.label}
                    <span className="ml-1.5 text-muted-foreground">({total})</span>
                  </a>
                );
              })}
            </div>
          </section>

          {/* 4. PENDÊNCIAS POR CATEGORIA — cards colapsáveis, uma por página no PDF */}
          <section>
            <h2 className="text-base font-bold mb-3">Pendências a organizar</h2>
            {perCategory.every((c) => c.pendentes.length === 0 && c.qualidadeRuim.length === 0 && c.semResposta.length === 0) ? (
              <p className="text-xs text-muted-foreground">Nenhuma pendência identificada — todos os itens foram avaliados como conformes.</p>
            ) : (
              perCategory.map((c, idx) => {
                const total = c.pendentes.length + c.qualidadeRuim.length + c.semResposta.length;
                if (total === 0) return null;
                const highCount = c.pendentes.filter((it) => urgencyOf(it.weight) === "alta").length;
                return (
                  <details
                    key={c.id}
                    id={`cat-${c.id}`}
                    open
                    className={`group mb-4 rounded-lg border border-border overflow-hidden bg-card ${idx > 0 ? "page-break" : ""}`}
                  >
                    <summary className="cursor-pointer list-none px-4 py-3 flex items-center gap-3 bg-muted/40 hover:bg-muted/60 transition-colors">
                      <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-open:rotate-0 -rotate-90" />
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-sm">{c.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {total} item{total > 1 ? "s" : ""} a tratar
                          {highCount > 0 && (
                            <> · <span className="text-danger font-semibold">{highCount} de alta urgência</span></>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px]">
                        {c.pendentes.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-danger/10 text-danger border border-danger/30 font-semibold">
                            {c.pendentes.length} não conforme{c.pendentes.length > 1 ? "s" : ""}
                          </span>
                        )}
                        {c.qualidadeRuim.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-warning/10 text-warning border border-warning/30 font-semibold">
                            {c.qualidadeRuim.length} qualidade
                          </span>
                        )}
                        {c.semResposta.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-semibold">
                            {c.semResposta.length} sem resposta
                          </span>
                        )}
                      </div>
                    </summary>

                    <div className="p-4 space-y-4">
                      {c.pendentes.length > 0 && (
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                            <AlertOctagon className="w-3 h-3 text-danger" />
                            Não conformes
                          </div>
                          <ul className="space-y-2">
                            {c.pendentes.map((it) => {
                              const u = urgencyOf(it.weight);
                              const s = URGENCY_STYLE[u];
                              return (
                                <li
                                  key={it.id}
                                  className={`avoid-break flex gap-3 p-3 rounded-md border ${s.bg}`}
                                >
                                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                                  <div className="flex-1 min-w-0">
                                    {/* Título — destaque máximo */}
                                    <div className="flex items-baseline gap-2 flex-wrap">
                                      <h4 className="text-sm font-bold text-foreground leading-snug">{it.title}</h4>
                                      <span className={`text-[10px] uppercase tracking-wider font-semibold ${s.text}`}>
                                        {s.label} · peso {it.weight}
                                      </span>
                                    </div>
                                    {/* Norma — segundo nível */}
                                    {it.norma && (
                                      <div className="mt-2 text-[11px]">
                                        <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">Norma: </span>
                                        <span className="text-foreground/80">{it.norma}</span>
                                      </div>
                                    )}
                                    {/* Observação — terceiro nível */}
                                    {it.observacao && (
                                      <div className="mt-1.5 text-[11px] text-muted-foreground leading-relaxed">
                                        <span className="uppercase tracking-wider text-[10px] font-semibold">Obs.: </span>
                                        {it.observacao}
                                      </div>
                                    )}
                                    {it.penalidade && (
                                      <div className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                                        <span className="uppercase tracking-wider text-[10px] font-semibold">Penalidade: </span>
                                        {it.penalidade}
                                      </div>
                                    )}
                                    {answers[it.id]?.justification && (
                                      <div className="mt-2 text-[11px] italic text-foreground/70 border-l-2 border-border pl-2">
                                        "{answers[it.id].justification}"
                                      </div>
                                    )}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}

                      {c.qualidadeRuim.length > 0 && (
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3 text-warning" />
                            Conformes — qualidade a melhorar
                          </div>
                          <ul className="space-y-1.5">
                            {c.qualidadeRuim.map((it) => (
                              <li key={it.id} className="avoid-break flex gap-2 items-start text-xs">
                                <div className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0 bg-warning" />
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium">{it.title}</span>
                                  {answers[it.id]?.justification && (
                                    <span className="text-[11px] italic text-muted-foreground"> — "{answers[it.id].justification}"</span>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {c.semResposta.length > 0 && (
                        <div>
                          <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                            <Info className="w-3 h-3" />
                            Pendentes de avaliação
                          </div>
                          <ul className="space-y-1">
                            {c.semResposta.map((it) => (
                              <li key={it.id} className="flex gap-2 items-start text-xs text-muted-foreground">
                                <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 bg-muted-foreground/40" />
                                <span>{it.title}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </details>
                );
              })
            )}
          </section>

          <footer className="mt-8 pt-3 border-t border-border text-[10px] uppercase tracking-[0.2em] text-muted-foreground text-center">
            Brasil e Silveira Advogados · Maturidade Regulatória · {hoje}
          </footer>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FinalReportButton(props: Omit<Props, "open" | "onOpenChange"> & { disabled?: boolean }) {
  return <FinalReportTrigger {...props} />;
}

function FinalReportTrigger({ disabled, ...rest }: Omit<Props, "open" | "onOpenChange"> & { disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        <FileDown className="w-3.5 h-3.5 mr-1" /> Relatório final
      </Button>
      <FinalReport open={open} onOpenChange={setOpen} {...rest} />
    </>
  );
}

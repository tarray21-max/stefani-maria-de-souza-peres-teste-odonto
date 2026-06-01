import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileDown } from "lucide-react";
import {
  CATEGORIES,
  computeMaturity,
  getValidityStatus,
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

  const areas = client?.areas && client.areas.length > 0 ? client.areas : (client?.area ? [client.area] : []);
  const hoje = new Date().toLocaleDateString("pt-BR");

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

          {/* Resumo */}
          <section className="mb-6 avoid-break">
            <h2 className="text-base font-bold mb-2">Resumo da maturidade</h2>
            <div className="flex items-baseline gap-3 mb-3">
              <div className="text-3xl font-bold">{Math.round(global.score)}%</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{scoreLabel(global.score)}</div>
              <div className="text-xs text-muted-foreground ml-auto">
                {global.totalSim} conformes • {global.totalNao} pendentes • {global.totalNa} não se aplica • {global.totalApplicable} aplicáveis
              </div>
            </div>
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-1.5 pr-2 font-semibold">Categoria</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Score</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Conformes</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Pendentes</th>
                  <th className="py-1.5 px-2 text-right font-semibold">Aplicáveis</th>
                </tr>
              </thead>
              <tbody>
                {perCategory.map((c) => (
                  <tr key={c.id} className="border-b border-border/60">
                    <td className="py-1.5 pr-2">{c.label}</td>
                    <td className="py-1.5 px-2 text-right font-semibold">{Math.round(c.result.score)}%</td>
                    <td className="py-1.5 px-2 text-right">{c.result.totalSim}</td>
                    <td className="py-1.5 px-2 text-right">{c.result.totalNao}</td>
                    <td className="py-1.5 px-2 text-right">{c.result.totalApplicable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          {/* Validade */}
          {validityRows.length > 0 && (
            <section className="mb-6">
              <h2 className="text-base font-bold mb-2">Documentos vencidos ou a vencer</h2>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="py-1.5 pr-2 font-semibold">Item</th>
                    <th className="py-1.5 px-2 font-semibold">Categoria</th>
                    <th className="py-1.5 px-2 font-semibold">Validade</th>
                    <th className="py-1.5 px-2 font-semibold">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  {validityRows.map(({ it, r, v }) => (
                    <tr key={it.id} className="border-b border-border/60 avoid-break">
                      <td className="py-1.5 pr-2">{it.title}</td>
                      <td className="py-1.5 px-2 text-muted-foreground">{labelOf(it.category)}</td>
                      <td className="py-1.5 px-2">
                        {r?.validity_date ? new Date(r.validity_date + "T00:00:00").toLocaleDateString("pt-BR") : "—"}
                      </td>
                      <td className="py-1.5 px-2 font-semibold">
                        {VALIDITY_LABEL[v.status] ?? "—"}
                        {v.days !== null && v.status !== "expired" && <> ({v.days}d)</>}
                        {v.status === "expired" && v.days !== null && <> ({Math.abs(v.days)}d atrás)</>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}

          {/* Pendências por categoria */}
          <section>
            <h2 className="text-base font-bold mb-2">Pendências a organizar</h2>
            {perCategory.every((c) => c.pendentes.length === 0 && c.qualidadeRuim.length === 0 && c.semResposta.length === 0) ? (
              <p className="text-xs text-muted-foreground">Nenhuma pendência identificada — todos os itens foram avaliados como conformes.</p>
            ) : (
              perCategory.map((c) => {
                const total = c.pendentes.length + c.qualidadeRuim.length + c.semResposta.length;
                if (total === 0) return null;
                return (
                  <div key={c.id} className="mb-5 avoid-break">
                    <h3 className="text-sm font-bold border-b border-border pb-1 mb-2">
                      {c.label} <span className="text-muted-foreground font-normal text-xs">({total} item{total > 1 ? "s" : ""})</span>
                    </h3>

                    {c.pendentes.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Não conformes</div>
                        <ol className="list-decimal pl-5 space-y-1.5">
                          {c.pendentes.map((it) => (
                            <li key={it.id} className="avoid-break">
                              <div className="font-medium">{it.title} <span className="text-[10px] text-muted-foreground font-normal">· peso {it.weight}</span></div>
                              {it.norma && <div className="text-[11px] text-muted-foreground">Norma: {it.norma}</div>}
                              {it.observacao && <div className="text-[11px] text-muted-foreground">Obs.: {it.observacao}</div>}
                              {it.penalidade && <div className="text-[11px] text-muted-foreground">Penalidade: {it.penalidade}</div>}
                              {answers[it.id]?.justification && (
                                <div className="text-[11px] italic">"{answers[it.id].justification}"</div>
                              )}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}

                    {c.qualidadeRuim.length > 0 && (
                      <div className="mb-3">
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Conformes — qualidade a melhorar</div>
                        <ul className="list-disc pl-5 space-y-1">
                          {c.qualidadeRuim.map((it) => (
                            <li key={it.id} className="avoid-break">
                              <span className="font-medium">{it.title}</span>
                              {answers[it.id]?.justification && (
                                <span className="text-[11px] italic"> — "{answers[it.id].justification}"</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {c.semResposta.length > 0 && (
                      <div>
                        <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Pendentes de avaliação</div>
                        <ul className="list-disc pl-5 space-y-0.5">
                          {c.semResposta.map((it) => (
                            <li key={it.id} className="text-xs">{it.title}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
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
  // wrapper that owns open state
  return <FinalReportTrigger {...props} />;
}

function FinalReportTrigger({ disabled, ...rest }: Omit<Props, "open" | "onOpenChange"> & { disabled?: boolean }) {
  const [open, setOpen] = useStateOpen();
  return (
    <>
      <Button variant="outline" size="sm" disabled={disabled} onClick={() => setOpen(true)}>
        <FileDown className="w-3.5 h-3.5 mr-1" /> Relatório final
      </Button>
      <FinalReport open={open} onOpenChange={setOpen} {...rest} />
    </>
  );
}

// tiny local hook to avoid importing React for state in this file's top scope
import { useState } from "react";
function useStateOpen() {
  return useState(false);
}

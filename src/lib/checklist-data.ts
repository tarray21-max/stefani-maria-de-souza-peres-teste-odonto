export type Category = "assistencial" | "trabalhista" | "sanitaria";

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  weight: number;
  category: Category;
  /** marks items generated from the TCLE/POP service matrix */
  matrix?: "tcle" | "pop";
  service?: string;
}

export const CATEGORIES: { id: Category; label: string; short: string }[] = [
  { id: "assistencial", label: "Combo Assistencial: Blindagem Jurídica", short: "Assistencial" },
  { id: "trabalhista", label: "Combo Pessoas e Parcerias", short: "Pessoas" },
  { id: "sanitaria", label: "Combo Vigilância Sanitária e Infraestrutura", short: "Sanitária" },
];

// --- Assistencial: perguntas gerais ---
const ASSISTENCIAL_GERAL: { title: string; weight: number }[] = [
  { title: "Ficha de Anamnese Geral", weight: 9 },
  { title: "Ficha de Evolução Clínica", weight: 9 },
  { title: "Termo de Autorização de Uso de Imagem e Voz", weight: 7 },
  { title: "Contrato de Prestação de Serviços Odontológicos", weight: 9 },
  { title: "Recibo e Protocolo de Entrega de Documentos", weight: 6 },
  { title: "Termo de Desistência de Tratamento", weight: 7 },
  { title: "Termo de Satisfação e Resultado", weight: 6 },
  { title: "Termo de Resultado Tímido", weight: 6 },
  { title: "Notificação de Interrupção/Abandono", weight: 7 },
  { title: "Termo de Acordo Extrajudicial (Restituição)", weight: 6 },
  { title: "Termo de Ciência de Acompanhante", weight: 7 },
  { title: "Manual de Prontuário", weight: 8 },
  { title: "Modelo de Receituário e Atestado Padronizado", weight: 8 },
];

// --- Assistencial: serviços com matriz TCLE + POP ---
export const ASSISTENCIAL_SERVICOS: string[] = [
  "Cirurgia Ortognática", "Cirurgia Reconstrutiva", "Cistos e Tumores Bucais", "Fraturas Faciais",
  "Avaliação Facial (HOF)", "Bichectomia", "Bioestimuladores de Colágeno", "Fios de PDO espiculados",
  "Fios de PDO liso", "Jato de Plasma", "Lipo de Papada Enzimática", "Lipo de Papada Mecânica",
  "Microagulhamento", "Otomodelação", "Rinomodelação", "Toxina Botulínica", "Ácido Hialurônico",
  "Bioestimulador (PLLA)", "Bioestimulador (Hidroxiapatita)", "Bioestimulador (Policaprolactona)",
  "Peeling Químico", "Skinbooster", "Hidroxiapatita Cálcio", "PDRN", "Platismo", "Liplift",
  "Otoplastia", "Blefaroplastia", "PMMA", "Cervicoplastia", "Fios de Nylon", "Alinhadores Invisíveis",
  "Alinhadores", "Aparelhos Fixos", "Aparelhos Móveis", "Apneia Obstrutiva do Sono",
  "Atendimento Pacientes Especiais", "Atendimento Hospitalizados", "Atendimento Pré e Pós-Operatório",
  "Atendimento Urgência", "Avaliação e Diagnóstico Bucal", "Avaliação Ortodôntica e Documentação",
  "Biópsia de Lesões Bucais", "Bruxismo", "Cirurgia Guiada 3D", "Cirurgia Parendodôntica",
  "Clareamento Dental", "Consulta Acompanhamento Infantil", "Contenção Ortodôntica",
  "Controle de Dor Aguda", "Controle de Placa/Higiene Periodontal", "Coroas Estéticas",
  "Correção de Mordidas", "Curativos de Urgência", "Distúrbio do Sono", "DTM", "Endodontia",
  "Enxerto Ósseo", "Enxerto Gengival", "Exodontia de Sisos", "Expansão Palatina",
  "Extração Dentes de Leite", "Extrações Simples", "Facetas Resina", "Facetas Laminadas/Lentes",
  "Facetas Porcelana", "Flúor", "Fraturas Dentárias", "Frenectomia", "Gengivoplastia",
  "Hemorragias Pós-Op", "Implante Dentário", "Infiltração ATM", "Laserterapia Alta/Baixa",
  "Laserterapia Dores Orofaciais", "Limpeza Dentária", "Manutenção de Implantes",
  "Oclusão (Ajustes)", "Orientação Higiene Bucal", "Ortodontia", "Placas Miorrelaxantes",
  "Placas Ronco/Apneia", "Procedimentos em UTI", "Prótese Fixa", "Prótese Parcial Removível",
  "Prótese sobre Implante", "Prótese Total", "Pulpotomia Decíduos", "Alisamento Radicular",
  "Remoção Pino Intrarradicular", "Restauração Dentária", "Retratamento de Canal",
  "Sedação Óxido Nitroso", "Sedação Venosa", "Selamento de Perfurações", "Selantes",
  "Terapia Preventiva", "Cáries Decíduos", "Gengivite e Periodontite", "Retração Gengival",
  "Endodôntico (Uni/Bi/Multi)",
];

// --- Trabalhista ---
const TRABALHISTA: { title: string; weight: number }[] = [
  { title: "Confidencialidade - Funcionários (NDA)", weight: 7 },
  { title: "Confidencialidade - Prestadores Serviço", weight: 7 },
  { title: "Contrato de Parceria sem Vínculo Empregatício", weight: 9 },
  { title: "Contrato de Locação para Fins Comerciais", weight: 7 },
  { title: "Contrato de Prestação de Serviços Estéticos", weight: 8 },
  { title: "Contrato de Locação de Equipamentos", weight: 6 },
  { title: "Contrato de Prestação de Serviços CLT", weight: 9 },
  { title: "Termo de Aditivo para Responsável Técnico (RT)", weight: 8 },
  { title: "Regulamento Interno da Clínica", weight: 7 },
  { title: "Política de Privacidade Interna (LGPD)", weight: 9 },
  { title: "Atestados Médicos e Laudos (ASO) dos funcionários", weight: 7 },
  { title: "Comprovantes de Vacinação (Tétano, Difteria, Hepatite B)", weight: 8 },
  { title: "Registro de Capacitação Periódica em Boas Práticas", weight: 7 },
  { title: "Documento de orientação sobre Acidentes Ocupacionais", weight: 7 },
  { title: "Uso de EPIs adequado ao risco", weight: 9 },
];

// --- Sanitária ---
const SANITARIA: { title: string; weight: number }[] = [
  { title: "Alvará Sanitário atualizado e visível", weight: 10 },
  { title: "Projeto Básico de Arquitetura (PBA) aprovado", weight: 9 },
  { title: "Inscrição no CNES com dados atualizados", weight: 8 },
  { title: "Placa de Proibição de Fumar", weight: 4 },
  { title: "Identificação do RT e CRO na fachada/publicidade", weight: 6 },
  { title: "Acesso Independente para resíduos", weight: 7 },
  { title: "Acessibilidade (PcD/Mobilidade reduzida)", weight: 8 },
  { title: "Material liso, lavável e resistente (Piso/Parede/Bancada)", weight: 7 },
  { title: "DML com tanque (Não compartilhado com Copa)", weight: 7 },
  { title: "Copa organizada e isolada", weight: 5 },
  { title: "Sanitários com pia, sabão líquido e papel toalha", weight: 6 },
  { title: "Suporte apropriado para papel toalha", weight: 4 },
  { title: "Lixeira com tampa e pedal", weight: 5 },
  { title: "Ralo com tampa escamoteável", weight: 5 },
  { title: "Sistema de Climatização (PMOC assinado)", weight: 8 },
  { title: "Manual de Boas Práticas e POPs administrativos", weight: 8 },
  { title: "CME com barreira técnica (Setor sujo/limpo)", weight: 9 },
  { title: "Monitoramento Biológico Semanal e Químico", weight: 9 },
  { title: "Incubadora para indicadores biológicos", weight: 8 },
  { title: "Higienização Reservatório de Água (Laudo semestral)", weight: 7 },
  { title: "PGRSS implementado", weight: 10 },
  { title: "Descarte Perfurocortantes (Suporte próprio e rígido)", weight: 9 },
  { title: "Controle de Vetores e Pragas (Empresa licenciada)", weight: 7 },
  { title: "Registro de Manutenção Preventiva e Calibração", weight: 8 },
  { title: "Compressor isento de óleo ou com filtros trocados", weight: 7 },
  { title: "Medicamentos Controlados em armário trancado", weight: 9 },
  { title: "Refrigerador Exclusivo e Termômetro para termolábeis", weight: 8 },
  { title: "Carrinho de Emergência com checklist de checagem", weight: 9 },
  { title: "Notificação de eventos adversos (Sistema ANVISA)", weight: 8 },
];

function buildItems(
  category: Category,
  prefix: string,
  list: { title: string; weight: number }[],
): ChecklistItem[] {
  return list.map((it, idx) => ({
    id: `${prefix}${idx + 1}`,
    category,
    title: it.title,
    description: "",
    weight: it.weight,
  }));
}

const ASSISTENCIAL_ITEMS = buildItems("assistencial", "a", ASSISTENCIAL_GERAL);
const TRABALHISTA_ITEMS = buildItems("trabalhista", "t", TRABALHISTA);
const SANITARIA_ITEMS = buildItems("sanitaria", "s", SANITARIA);

// matrix items: each service generates a TCLE + POP entry counted in maturity
const SERVICO_MATRIX_ITEMS: ChecklistItem[] = ASSISTENCIAL_SERVICOS.flatMap((service, idx) => {
  const slug = `m${idx + 1}`;
  return [
    {
      id: `${slug}-tcle`,
      category: "assistencial" as Category,
      title: `TCLE — ${service}`,
      description: "Termo de Consentimento Livre e Esclarecido específico do procedimento.",
      weight: 8,
      matrix: "tcle" as const,
      service,
    },
    {
      id: `${slug}-pop`,
      category: "assistencial" as Category,
      title: `POP — ${service}`,
      description: "Procedimento Operacional Padrão documentado para o serviço.",
      weight: 7,
      matrix: "pop" as const,
      service,
    },
  ];
});

export const CHECKLIST: ChecklistItem[] = [
  ...ASSISTENCIAL_ITEMS,
  ...SERVICO_MATRIX_ITEMS,
  ...TRABALHISTA_ITEMS,
  ...SANITARIA_ITEMS,
];

export type Answer = "sim" | "nao" | "na" | null;

export interface MaturityResult {
  score: number;
  totalSim: number;
  totalNao: number;
  totalNa: number;
  totalApplicable: number;
  totalItems: number;
}

export function computeMaturity(
  answers: Record<string, Answer>,
  items: ChecklistItem[] = CHECKLIST,
): MaturityResult {
  let sim = 0, nao = 0, na = 0;
  for (const it of items) {
    const a = answers[it.id];
    if (a === "sim") sim++;
    else if (a === "nao") nao++;
    else if (a === "na") na++;
  }
  const applicable = items.length - na;
  const score = applicable > 0 ? (sim / applicable) * 100 : 0;
  return { score, totalSim: sim, totalNao: nao, totalNa: na, totalApplicable: applicable, totalItems: items.length };
}

export function scoreColorVar(score: number): string {
  if (score <= 40) return "var(--danger)";
  if (score <= 75) return "var(--warning)";
  return "var(--success)";
}

export function scoreLabel(score: number): string {
  if (score <= 40) return "Crítico";
  if (score <= 75) return "Em construção";
  return "Maduro";
}

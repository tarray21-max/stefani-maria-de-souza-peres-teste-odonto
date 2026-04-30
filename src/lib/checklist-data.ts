export type Category = "assistencial" | "trabalhista" | "sanitaria";

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  weight: number; // for ranking gargalos
  category: Category;
}

export const CATEGORIES: { id: Category; label: string; short: string }[] = [
  { id: "assistencial", label: "Combo Assistencial", short: "Assistencial" },
  { id: "trabalhista", label: "Pessoas e Parcerias", short: "Pessoas" },
  { id: "sanitaria", label: "Conformidade Sanitária", short: "Sanitária" },
];

export const CHECKLIST: ChecklistItem[] = [
  // Assistencial
  { id: "a1", category: "assistencial", weight: 9, title: "Anamnese", description: "Ficha de anamnese completa e padronizada por especialidade." },
  { id: "a2", category: "assistencial", weight: 9, title: "Evolução Clínica", description: "Registro contínuo das evoluções em prontuário." },
  { id: "a3", category: "assistencial", weight: 10, title: "TCLE", description: "Termo de Consentimento Livre e Esclarecido detalhado conforme riscos do procedimento." },
  { id: "a4", category: "assistencial", weight: 7, title: "Uso de Imagem", description: "Termo específico de autorização de uso de imagem (antes/depois, marketing)." },
  { id: "a5", category: "assistencial", weight: 9, title: "Contrato de Prestação", description: "Contrato de prestação de serviços assinado pelo paciente." },
  { id: "a6", category: "assistencial", weight: 6, title: "Protocolo de Entrega", description: "Protocolo formal de entrega de documentos, exames e prescrições." },
  { id: "a7", category: "assistencial", weight: 7, title: "Desistência", description: "Termo de desistência do tratamento documentado." },
  { id: "a8", category: "assistencial", weight: 6, title: "Satisfação / Alta", description: "Termo de alta e pesquisa de satisfação ao final do tratamento." },
  { id: "a9", category: "assistencial", weight: 7, title: "Abandono", description: "Procedimento e notificação formal de abandono de tratamento." },
  { id: "a10", category: "assistencial", weight: 6, title: "Acordo Extrajudicial", description: "Modelo padrão de acordo extrajudicial para disputas." },
  { id: "a11", category: "assistencial", weight: 7, title: "Ciência de Acompanhante", description: "Termo de ciência assinado por acompanhante quando aplicável." },
  { id: "a12", category: "assistencial", weight: 8, title: "Receituário Padronizado", description: "Receituário com identificação completa do profissional e clínica." },

  // Trabalhista
  { id: "t1", category: "trabalhista", weight: 9, title: "Contrato de Parceria", description: "Contrato com profissionais parceiros (PJ) bem estruturado." },
  { id: "t2", category: "trabalhista", weight: 7, title: "Locação", description: "Contrato de locação de sala/espaço quando aplicável." },
  { id: "t3", category: "trabalhista", weight: 9, title: "CLT Apoio", description: "Equipe de apoio (recepção, técnicos) com vínculo CLT regular." },
  { id: "t4", category: "trabalhista", weight: 8, title: "Aditivo RT", description: "Aditivo de Responsabilidade Técnica formalizado." },
  { id: "t5", category: "trabalhista", weight: 6, title: "Teletrabalho", description: "Política e termo de teletrabalho para funções administrativas remotas." },
  { id: "t6", category: "trabalhista", weight: 7, title: "NDA", description: "Acordo de confidencialidade assinado por toda equipe." },
  { id: "t7", category: "trabalhista", weight: 7, title: "Não Concorrência", description: "Cláusula/termo de não concorrência para profissionais-chave." },
  { id: "t8", category: "trabalhista", weight: 8, title: "Regulamento Interno", description: "Regulamento interno publicado e ciência assinada por todos." },
  { id: "t9", category: "trabalhista", weight: 6, title: "Advertência / Suspensão", description: "Modelos formais de advertência e suspensão disciplinar." },
  { id: "t10", category: "trabalhista", weight: 10, title: "Consentimento LGPD", description: "Consentimento LGPD coletado de pacientes e colaboradores." },
  { id: "t11", category: "trabalhista", weight: 9, title: "Política de Privacidade", description: "Política de privacidade publicada e atualizada." },

  // Sanitária
  { id: "s1", category: "sanitaria", weight: 10, title: "Alvará Sanitário", description: "Alvará da Vigilância Sanitária vigente e visível." },
  { id: "s2", category: "sanitaria", weight: 10, title: "PGRSS", description: "Plano de Gerenciamento de Resíduos de Serviços de Saúde implementado." },
  { id: "s3", category: "sanitaria", weight: 8, title: "PMOC (Climatização)", description: "Plano de Manutenção, Operação e Controle dos sistemas de climatização." },
  { id: "s4", category: "sanitaria", weight: 9, title: "Projeto Arquitetônico Aprovado", description: "Projeto arquitetônico aprovado pela Vigilância Sanitária." },
  { id: "s5", category: "sanitaria", weight: 8, title: "Manual de Rotinas (POPs)", description: "Manual de Procedimentos Operacionais Padrão acessível à equipe." },
  { id: "s6", category: "sanitaria", weight: 9, title: "Manutenção de Equipamentos", description: "Registros de manutenção preventiva e calibração (autoclave, etc.)." },
  { id: "s7", category: "sanitaria", weight: 8, title: "Controle de Temperatura", description: "Registros de temperatura de geladeiras de termolábeis (vacinas/medicamentos)." },
  { id: "s8", category: "sanitaria", weight: 8, title: "Controle de Validade", description: "Rotina de verificação de validade de medicamentos e insumos." },
  { id: "s9", category: "sanitaria", weight: 9, title: "Levantamento Radiométrico", description: "Levantamento radiométrico em dia (se houver Raio-X/imagem)." },
  { id: "s10", category: "sanitaria", weight: 9, title: "Dosimetria", description: "Dosimetria individual dos profissionais expostos à radiação." },
  { id: "s11", category: "sanitaria", weight: 7, title: "Limpeza de Caixa d'Água", description: "Limpeza semestral da caixa d'água com laudo." },
  { id: "s12", category: "sanitaria", weight: 8, title: "Calibração de Autoclaves", description: "Cronograma de calibração e validação de autoclaves cumprido." },
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

export function computeMaturity(answers: Record<string, Answer>, items: ChecklistItem[] = CHECKLIST): MaturityResult {
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

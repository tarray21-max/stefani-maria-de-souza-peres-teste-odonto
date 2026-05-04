export type Category = "assistencial" | "trabalhista" | "sanitaria";

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  weight: number;
  category: Category;
  /** Norma técnica de referência */
  norma?: string;
  /** Consequência jurídica/financeira da não conformidade */
  risco?: string;
  /** Descrição do que a imagem de referência deve mostrar */
  referencia?: string;
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
const ASSISTENCIAL_GERAL: { title: string; weight: number; norma?: string; risco?: string; referencia?: string }[] = [
  { title: "Ficha de Anamnese Geral", weight: 9, norma: "Res. CFO 118/2012; CFM 1.638/2002", risco: "Sem anamnese documentada o profissional perde a defesa técnica em ações por dano. Tribunais aplicam inversão do ônus da prova." },
  { title: "Prontuário", weight: 9, norma: "Res. CFO 118/2012; CFM 1.821/2007; CDC art. 14", risco: "Prontuário ausente ou incompleto provoca INVERSÃO DO ÔNUS DA PROVA contra o profissional em processo judicial. Presunção de culpa; risco de condenação por dano moral e material." },
  { title: "Termo de Autorização de Uso de Imagem e Voz", weight: 7, norma: "CF art. 5º X; CC art. 20; LGPD", risco: "Indenização por dano moral (R$ 5k–50k típicos) e remoção forçada de conteúdo." },
  { title: "Contrato de Prestação de Serviços Odontológicos", weight: 9, norma: "CDC; Código de Ética CFO", risco: "Sem contrato escrito presume-se obrigação de resultado; cliente pode exigir devolução integral + danos." },
  { title: "Recibo e Protocolo de Entrega de Documentos", weight: 6, norma: "CC art. 320", risco: "Risco de duplicidade de cobrança; perda de defesa em alegações de não-entrega." },
  { title: "Termo de Desistência de Tratamento", weight: 7, norma: "CDC art. 49; Código de Ética CFO", risco: "Sem termo, paciente pode alegar abandono e exigir devolução total + indenização." },
  { title: "Termo de Satisfação e Resultado", weight: 6, norma: "CC art. 421", risco: "Sem registro do aceite, paciente pode contestar resultado meses depois alegando insatisfação inicial." },
  { title: "Termo de Resultado Tímido", weight: 6, norma: "Código de Ética CFO art. 8º", risco: "Procedimentos estéticos têm risco de tribunal aceitar obrigação de resultado; sem ressalva o profissional responde objetivamente." },
  { title: "Notificação de Interrupção/Abandono", weight: 7, norma: "Código de Ética CFO art. 9º", risco: "Sem notificação formal o profissional pode ser responsabilizado por abandono de tratamento." },
  { title: "Termo de Acordo Extrajudicial (Restituição)", weight: 6, norma: "CC art. 840; CDC", risco: "Devoluções sem termo deixam o paciente livre para ajuizar ação posterior." },
  { title: "Termo de Ciência de Acompanhante", weight: 7, norma: "ECA; Estatuto do Idoso", risco: "Atendimento de menor/idoso sem ciência do responsável gera nulidade e responsabilização." },
  { title: "Manual de Prontuário", weight: 8, norma: "Res. CFO 118/2012", risco: "Padronização ausente leva a prontuários inconsistentes; falha defensiva em juízo." },
  { title: "Modelo de Receituário e Atestado Padronizado", weight: 8, norma: "Lei 5.991/73; Res. CFO", risco: "Receituário irregular gera autuação sanitária e responsabilização criminal por documento inidôneo." },
  { title: "Termo de Declaração de Intercorrências de Outros Profissionais", weight: 8, norma: "Código de Ética CFO art. 9º", risco: "Sem termo o profissional atual pode ser responsabilizado por sequelas/falhas causadas por colega anterior." },
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
  // Novos TCLEs solicitados
  "Limpeza de Pele", "Bioestimulador Corporal", "Ácido Hialurônico Corporal",
  "HIPRO", "Laser Adhara", "Lavieen", "Pison", "Radiofrequência", "Ultraformer III", "MPT",
];

// --- Pessoas e Parcerias (chave interna trabalhista) ---
const TRABALHISTA: { title: string; weight: number; norma?: string; risco?: string }[] = [
  { title: "Confidencialidade - Funcionários (NDA)", weight: 7, norma: "CC art. 422; CLT art. 482", risco: "Vazamento de dados/protocolos clínicos sem NDA: perda do segredo de empresa e dificuldade de demissão por justa causa." },
  { title: "Confidencialidade - Prestadores Serviço", weight: 7, norma: "CC art. 422; LGPD", risco: "Sem NDA, dados de pacientes compartilhados com terceiros geram responsabilização solidária da clínica." },
  { title: "Contrato de prestação de serviços sem vínculo empregatício", weight: 9, norma: "CLT art. 3º; Súmula 331 TST", risco: "Reconhecimento de vínculo: pagamento retroativo de FGTS, INSS, férias, 13º + multas. Passivo médio R$ 50k–200k por profissional." },
  { title: "Contrato de Locação para Fins Comerciais", weight: 7, norma: "Lei 8.245/91", risco: "Sem contrato escrito, despejo arbitrário, perda do ponto comercial e do investimento." },
  { title: "Contrato de Parcerias/Cessão de Sala", weight: 8, norma: "CC art. 421; Súmula 331 TST", risco: "Cessão informal pode ser caracterizada como vínculo empregatício ou sociedade de fato, gerando passivo trabalhista e tributário." },
  { title: "Contrato de Locação de Equipamentos", weight: 6, norma: "CC art. 565", risco: "Sem contrato, perda do equipamento, dificuldade de cobrança de manutenção e responsabilização por danos a terceiros." },
  { title: "Contrato de Prestação de Serviços CLT", weight: 9, norma: "CLT", risco: "Ausência de contrato formal: presunção de informalidade, multas do MTE e passivo trabalhista." },
  { title: "Termo de Aditivo para Responsável Técnico (RT)", weight: 8, norma: "Res. CFO 63/2005", risco: "RT sem aditivo formal não tem amparo; responsabilização pessoal por irregularidades sanitárias da clínica." },
  { title: "Regulamento Interno da Clínica", weight: 7, norma: "CLT art. 444", risco: "Sem regulamento, dispensa por justa causa fica frágil; condutas inadequadas ficam sem base para sanção." },
  { title: "Política de Privacidade Interna (LGPD)", weight: 9, norma: "Lei 13.709/2018 (LGPD)", risco: "Multa ANPD até 2% do faturamento (limite R$ 50 milhões por infração) + indenizações individuais por vazamento." },
  { title: "Atestados Médicos e Laudos (ASO) dos funcionários", weight: 7, norma: "NR-7 (PCMSO)", risco: "Auto de infração trabalhista, embargo da atividade e responsabilização por doença ocupacional." },
  { title: "Comprovantes de Vacinação (Tétano, Difteria, Hepatite B)", weight: 8, norma: "NR-32; PNI", risco: "Acidente com material biológico em colaborador não vacinado: responsabilidade civil + criminal do empregador." },
  { title: "Registro de Capacitação Periódica em Boas Práticas", weight: 7, norma: "RDC 50; NR-32", risco: "Sem registro de treinamento, infração sanitária e dificuldade defensiva em ações por erro técnico." },
  { title: "Documento de orientação sobre Acidentes Ocupacionais", weight: 7, norma: "NR-32; CAT (Lei 8.213/91)", risco: "Falha em emitir CAT: multa previdenciária + responsabilização por agravamento de doença." },
  { title: "Uso de EPIs adequado ao risco", weight: 9, norma: "NR-6; NR-32", risco: "Auto de infração trabalhista + responsabilização criminal (CP art. 132) em caso de acidente." },
];

// --- Sanitária ---
const SANITARIA: { title: string; weight: number; norma?: string; risco?: string }[] = [
  { title: "Alvará Sanitário atualizado e visível", weight: 10, norma: "RDC 50/2002; Lei 6.437/77", risco: "INTERDIÇÃO IMEDIATA do estabelecimento, multa de R$ 2k a R$ 1,5 mi e responsabilização criminal por exercício irregular." },
  { title: "Projeto Básico de Arquitetura (PBA) aprovado", weight: 9, norma: "RDC 50/2002", risco: "Negativa do alvará; obrigação de reforma; embargo da obra/atividade." },
  { title: "Inscrição no CNES com dados atualizados", weight: 8, norma: "Portaria GM/MS 1.646/2015", risco: "Bloqueio de repasses SUS e dificuldade de credenciamento com convênios." },
  { title: "Placa de Proibição de Fumar", weight: 4, norma: "Lei 9.294/96; Lei 12.546/11", risco: "Multa de R$ 1.500 a R$ 3.000 por evento fiscalizado." },
  { title: "Identificação do RT e CRO na fachada/publicidade", weight: 6, norma: "Código de Ética CFO art. 35", risco: "Processo ético no CRO; multa e suspensão do exercício." },
  { title: "Acesso Independente para resíduos", weight: 7, norma: "RDC 222/2018; RDC 50", risco: "Não conformidade sanitária; risco de contaminação cruzada." },
  { title: "Acessibilidade (PcD/Mobilidade reduzida)", weight: 8, norma: "Lei 10.098/2000; NBR 9050", risco: "Multa, ação civil pública por discriminação e indenização ao MP/PcD." },
  { title: "Material liso, lavável e resistente (Piso/Parede/Bancada)", weight: 7, norma: "RDC 50/2002", risco: "Não conformidade sanitária; obrigação de reforma." },
  { title: "DML com tanque (Não compartilhado com Copa)", weight: 7, norma: "RDC 50/2002", risco: "Risco de contaminação cruzada; auto de infração." },
  { title: "Copa organizada e isolada", weight: 5, norma: "RDC 50/2002", risco: "Auto de infração sanitária." },
  { title: "Sanitários com pia, sabão líquido e papel toalha", weight: 6, norma: "RDC 50/2002", risco: "Auto de infração sanitária." },
  { title: "Suporte apropriado para papel toalha", weight: 4, norma: "RDC 50/2002", risco: "Auto de infração sanitária." },
  { title: "Lixeira com tampa e pedal", weight: 5, norma: "RDC 222/2018", risco: "Auto de infração sanitária; risco de contato manual com resíduo contaminado.", referencia: "Lixeira branca leitosa, com tampa, acionamento por pedal, identificação do tipo de resíduo." },
  { title: "Ralo com tampa escamoteável", weight: 5, norma: "RDC 50/2002", risco: "Auto de infração sanitária; risco de retorno de gases e vetores." },
  { title: "Sistema de Climatização (PMOC assinado)", weight: 8, norma: "Lei 13.589/18; RE ANVISA 9/2003", risco: "Multa sanitária; responsabilização por contaminação aérea (Síndrome do Edifício Doente)." },
  { title: "Manual de Boas Práticas e POPs administrativos", weight: 8, norma: "RDC 63/2011", risco: "Auto de infração sanitária; falha defensiva em ações por dano." },
  { title: "CME com barreira técnica (Setor sujo/limpo)", weight: 9, norma: "RDC 15/2012; RDC 50", risco: "Não conformidade grave; risco de IRAS; interdição parcial do CME." },
  { title: "Monitoramento Biológico Semanal e Químico", weight: 9, norma: "RDC 15/2012", risco: "Esterilização ineficaz: responsabilização por infecção; perda da defesa técnica." },
  { title: "Incubadora para indicadores biológicos", weight: 8, norma: "RDC 15/2012", risco: "Sem teste biológico, esterilização não é certificada; falha em fiscalização." },
  { title: "Higienização Reservatório de Água (Laudo semestral)", weight: 7, norma: "Portaria GM/MS 888/2021", risco: "Risco de contaminação hídrica; auto de infração e indenização." },
  { title: "PGRSS implementado", weight: 10, norma: "RDC 222/2018; Lei 12.305/10", risco: "Multa sanitária + responsabilidade ambiental (Lei 9.605/98) + responsabilização criminal." },
  { title: "Descarte Perfurocortantes (Suporte próprio e rígido)", weight: 9, norma: "RDC 222/2018; NR-32", risco: "Acidente com perfurocortante: responsabilização civil + trabalhista da clínica." },
  { title: "Controle de Vetores e Pragas (Empresa licenciada)", weight: 7, norma: "RDC 52/2009", risco: "Auto de infração; risco de contaminação." },
  { title: "Registro de Manutenção Preventiva e Calibração", weight: 8, norma: "RDC 2/2010", risco: "Equipamento descalibrado gera dano ao paciente; perda da defesa técnica e responsabilização objetiva." },
  { title: "Compressor isento de óleo ou com filtros trocados", weight: 7, norma: "RDC 50; manual fabricante", risco: "Contaminação do ar de instrumentos; risco de infecção pulmonar do paciente." },
  { title: "Medicamentos Controlados em armário trancado", weight: 9, norma: "Portaria SVS/MS 344/98", risco: "Perda do livro de controlados; responsabilização criminal por desvio; perda da autorização." },
  { title: "Refrigerador Exclusivo e Termômetro para termolábeis", weight: 8, norma: "RDC 304/2019", risco: "Medicamento fora de temperatura: responsabilidade objetiva por dano ao paciente." },
  { title: "Carrinho de Emergência com checklist de checagem", weight: 9, norma: "Res. CFM 2.147/2016; CFO", risco: "Óbito por falha em emergência sem material disponível: homicídio culposo + responsabilidade civil." },
  { title: "Notificação de eventos adversos (Sistema ANVISA)", weight: 8, norma: "RDC 36/2013 (NOTIVISA)", risco: "Omissão de notificação de evento adverso: infração sanitária + responsabilização ética." },
];

function buildItems(
  category: Category,
  prefix: string,
  list: { title: string; weight: number; norma?: string; risco?: string; referencia?: string }[],
): ChecklistItem[] {
  return list.map((it, idx) => ({
    id: `${prefix}${idx + 1}`,
    category,
    title: it.title,
    description: "",
    weight: it.weight,
    norma: it.norma,
    risco: it.risco,
    referencia: it.referencia,
  }));
}

const ASSISTENCIAL_ITEMS = buildItems("assistencial", "a", ASSISTENCIAL_GERAL);
const TRABALHISTA_ITEMS = buildItems("trabalhista", "t", TRABALHISTA);
const SANITARIA_ITEMS = buildItems("sanitaria", "s", SANITARIA);

const TCLE_NORMA = "Código de Ética CFO art. 9º; CDC art. 6º III; CC art. 186";
const TCLE_RISCO = "Sem TCLE específico, o consentimento é nulo. Tribunais aceitam responsabilidade civil OBJETIVA em estética. Inversão do ônus da prova garantida ao paciente.";
const POP_NORMA = "RDC 63/2011; Manual de Boas Práticas";
const POP_RISCO = "Sem POP documentado, falha técnica é presumida culpa do profissional; falha defensiva e auto de infração sanitária.";

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
      norma: TCLE_NORMA,
      risco: TCLE_RISCO,
    },
    {
      id: `${slug}-pop`,
      category: "assistencial" as Category,
      title: `POP — ${service}`,
      description: "Procedimento Operacional Padrão documentado para o serviço.",
      weight: 7,
      matrix: "pop" as const,
      service,
      norma: POP_NORMA,
      risco: POP_RISCO,
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
export type Quality = "bom" | "ruim" | null;

export interface ItemResponse {
  answer: Answer;
  quality: Quality;
  justification: string;
}

export const EMPTY_RESPONSE: ItemResponse = { answer: null, quality: null, justification: "" };

export type ResponseMap = Record<string, ItemResponse>;

export interface MaturityResult {
  score: number;
  totalSim: number;
  totalNao: number;
  totalNa: number;
  totalApplicable: number;
  totalItems: number;
}

export function getResponse(map: ResponseMap, id: string): ItemResponse {
  return map[id] ?? EMPTY_RESPONSE;
}

export function computeMaturity(
  responses: ResponseMap,
  items: ChecklistItem[] = CHECKLIST,
): MaturityResult {
  let simEffective = 0;
  let sim = 0, nao = 0, na = 0;
  for (const it of items) {
    const r = responses[it.id];
    if (!r || !r.answer) continue;
    if (r.answer === "sim") {
      sim++;
      simEffective += r.quality === "ruim" ? 0.5 : 1;
    } else if (r.answer === "nao") {
      nao++;
    } else if (r.answer === "na") {
      na++;
    }
  }
  const applicable = items.length - na;
  const score = applicable > 0 ? (simEffective / applicable) * 100 : 0;
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

/** Sort items alphabetically by title, keeping N/A entries at the bottom */
export function sortItems(items: ChecklistItem[], responses: ResponseMap): ChecklistItem[] {
  return [...items].sort((a, b) => {
    const naA = responses[a.id]?.answer === "na" ? 1 : 0;
    const naB = responses[b.id]?.answer === "na" ? 1 : 0;
    if (naA !== naB) return naA - naB;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

export type BaseCategory = "documentacao" | "infraestrutura" | "procedimentos" | "higienizacao" | "cme";
export type Category = BaseCategory | "tcle_pop";

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  weight: number;
  category: Category;
  /** Norma técnica de referência */
  norma?: string;
  /** Observação padrão (preenchível pelo usuário via override) */
  observacao?: string;
  /** Penalidade aplicável (preenchível pelo usuário via override) */
  penalidade?: string;
  /** Consequência jurídica/financeira (legado) */
  risco?: string;
  /** Descrição do que a imagem de referência deve mostrar */
  referencia?: string;
}

export const CATEGORIES: { id: BaseCategory; label: string; short: string }[] = [
  { id: "documentacao", label: "Grupo 1 — Documentação, Gestão e Responsabilidade Técnica", short: "Documentação" },
  { id: "infraestrutura", label: "Grupo 2 — Infraestrutura e Instalações", short: "Infraestrutura" },
  { id: "procedimentos", label: "Grupo 3 — Procedimentos, Equipamentos e Produtos", short: "Procedimentos" },
  { id: "higienizacao", label: "Grupo 4 — Higienização, Biossegurança, Resíduos e Pragas", short: "Higienização" },
  { id: "cme", label: "Grupo 5 — Processamento de Produtos para Saúde (CME)", short: "CME" },
];

type Seed = { title: string; norma?: string; observacao?: string; penalidade?: string; weight?: number };

const G1_DOCUMENTACAO: Seed[] = [
  { title: "Cadastro na Prefeitura como Profissional Liberal/Autônomo", norma: "Artigo 140 da LC nº 344/2021", observacao: "Impossibilidade de Emitir NF" },
  { title: "Dentista não pode ser MEI", norma: "Resolução CGSN nº 140/2018", observacao: "Fraude Fiscal estrutural" },
  { title: "Contrato Social Atualizado" },
  { title: "CNPJ Ativo com CNAE Compatível", norma: "Art. 10, Inc. IV e XXIV da Lei nº 6.437/1977 c/c Art. 81, Inc. XIX da LM 8741/08", observacao: "Infração Grave" },
  { title: "CNES Atualizado", norma: "Portaria GM/MS 1.646/2015 / Portaria de Consolidação nº 01 de 03/10/2017 (artigos 358 a 362)", observacao: "Bloqueio de repasses SUS e dificuldade de credenciamento com convênios. Consulte: https://cnes.datasus.gov.br/" },
  { title: "Registro da EMPRESA no CONSELHO DE CLASSE", norma: "Lei nº 6.839/1980" },
  { title: "Registro do RESPONSÁVEL Técnico no CONSELHO DE CLASSE - ART/CRT", norma: "Lei nº 6.839/1980" },
  { title: "Registro do RESPONSÁVEL Técnico e Substituto na Vigilância Sanitária (presença obrigatória durante o funcionamento)", norma: "Art. 14 da RDC 63/2011; Art. 115, §1º, Inc. II, alínea I c/c Art. 124 da Lei Est. 16.140/2007; Art. 8º, Inc. IV do DM 4455/09", observacao: "Grave" },
  { title: "CERCON (Certificado de Conformidade do Corpo de Bombeiros)", norma: "Art. 14 da Lei Estadual de Goiás nº 15.802/2006" },
  { title: "Licença de Funcionamento (Alvará de Localização)", norma: "Lei nº 13.874/2019 c/c Art. 139 da LC nº 368/2023 (Código de Posturas de Goiânia)" },
  { title: "Alvará Sanitário", norma: "Lei nº 6.437/1977 e Lei Estadual nº 16.140/2007 (Código Sanitário do Estado)" },
  { title: "Não exerce e/ou permite o exercício de profissões, encargos ou ocupações relacionadas à saúde sem habilitação legal", norma: "Art. 31 da RDC 63/2011; Item I da Res. CNS 287/98; Art. 5º, Inc. I e Art. 6º, Inc. I da LF 13643/18; Item III, alíneas f, g do Parecer PEAJ 4573/24 c/c Art. 81, Inc. XXI da LM 8741/08" },
  { title: "PRONTUÁRIO do paciente com identificação, procedimentos prestados, carimbo e assinatura", norma: "Art. 24, 26 e 27 da RDC 63/2011 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Guarda do PRONTUÁRIO garantindo confidencialidade, integridade, conservação e organização", norma: "Art. 25, § 2º e Art. 28 da RDC 63/2011 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "RASTREABILIDADE dos produtos e tecnologias utilizados (lotes e fabricantes nos prontuários)", norma: "Art. 2º e Art. 5º da RDC nº 509/2021 c/c Art. 24 e 26 da RDC 63/2011 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "ANAMNESE (Geral) — histórico de saúde do paciente documentado no prontuário", norma: "Art. 24 da RDC nº 63/2011" },
  { title: "Declaração de Atividades (caracterização do serviço)", norma: "Art. 8º, Inc. II do Decreto Municipal de Goiânia nº 4.455/2009 c/c Art. 10 da RDC 63/2011" },
  { title: "NOTIFICAÇÃO ANVISA — eventos adversos / queixas técnicas (mensal até o 15º dia útil do mês subsequente)", norma: "Art. 10 da RDC 36/2013 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "NOTIFICAÇÃO ANVISA — eventos com óbito em até 72 horas a partir do ocorrido", norma: "Art. 10 § único da RDC 36/2013 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "MANUAL de rotinas e procedimentos", norma: "Art. 23, Inc. XVIII; Art. 51 da RDC 63/2011 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "POP de todos os procedimentos realizados" },
  { title: "TCLE de todos os procedimentos realizados" },
  { title: "REGIMENTO INTERNO com definição de atividades, responsabilidades e competências", norma: "Art. 9 da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "REG: Registro da temperatura e umidade do ambiente" },
  { title: "REG: Registro da temperatura do refrigerador" },
  { title: "REG: Qualidade do ar — manutenções preventivas e corretivas" },
  { title: "REG: Qualidade da Água — limpezas de caixa d'água" },
  { title: "REG: Registro das Intercorrências" },
  { title: "LISTA dos Saneantes/Desinfetantes" },
  { title: "LISTA dos Equipamentos" },
  { title: "LISTA dos procedimentos realizados e sua complexidade (uso de anestesia)" },
  { title: "LISTA dos serviços terceirizados" },
  { title: "MANUAL de Biossegurança" },
  { title: "MANUAL de Urgência e Emergência" },
  { title: "PROTOCOLOS de Segurança do Paciente" },
  { title: "POP — Higienização das Mãos", norma: "Art. 8, Inc. II, V e VI da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "POP — Administração segura de medicamentos, sangue e hemocomponentes", norma: "Art. 8, Inc. II, V e VI da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "POP — Recolhimento dos Resíduos" },
  { title: "POP — Paramentação e Desparamentação" },
  { title: "POP — Limpeza dos Equipamentos" },
  { title: "POP — Limpeza, Desinfecção e Esterilização por Autoclave" },
  { title: "POP — Acidente com Material Biológico" },
  { title: "POP — Remoção de Pacientes" },
  { title: "POP — Fluxo de Intercorrências" },
  { title: "CONTRATO de Prestação de Serviço (com Anexo I de tipos de serviço)" },
  { title: "RECEITUÁRIOS — prescrição de controlados conforme Portaria SVS/MS nº 344/98 e Portaria nº 06/99" },
  { title: "RECEITUÁRIOS — prescrição de antimicrobianos conforme RDC nº 20/11/ANVISA e atualizações" },
  { title: "PCMSO — Programa de Controle Médico de Saúde Ocupacional", norma: "Art. 31 da RDC nº 63/2011 c/c RDC 503/2021, RDC 916/2024 e NR-32" },
  { title: "ASO — Atestado de Saúde Ocupacional (admissionais e periódicos)", norma: "Art. 31 da RDC nº 63/2011 c/c RDC 503/2021, RDC 916/2024 e NR-32" },
  { title: "PGR — Programa de Gerenciamento de Riscos", norma: "Art. 37 da RDC nº 63/2011 e RDC 916/2024 e NR-32" },
  { title: "Dosimetria Mensal (se possuir RAIO-X)", norma: "Resolução Normativa nº 002/DIVS/SES de 13/05/15" },
  { title: "COMPROVANTE DE VACINA (tétano, difteria e hepatite B) dos profissionais envolvidos" },
  { title: "Fachada e publicidade com nome do RT e nº de inscrição no conselho de classe", norma: "Art. 124 da Lei Est. 16.140/2007" },
  { title: "QUADRO DE DOCUMENTOS — CNPJ" },
  { title: "QUADRO DE DOCUMENTOS — Controle de Pragas" },
  { title: "QUADRO DE DOCUMENTOS — Limpeza Caixa D'Água" },
  { title: "QUADRO DE DOCUMENTOS — Alvará CERCON" },
  { title: "QUADRO DE DOCUMENTOS — Regularidade no Conselho de Classe" },
  { title: "QUADRO DE DOCUMENTOS — Licença de Funcionamento", norma: "Art. 138 da LC nº 368/2023 (Código de Posturas de Goiânia)" },
  { title: "QUADRO DE DOCUMENTOS — Alvará SANITÁRIO", norma: "Art. 10º da RDC 63/11; Art. 7º, § 1º c/c Art. 81, Inc. I da LM 8741/08" },
];

const G2_INFRAESTRUTURA: Seed[] = [
  { title: "PROJETO BÁSICO de Arquitetura", norma: "Art. 23, Inc. I; Art. 34 da RDC 61/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "LAUDO DE CONFORMIDADE" },
  { title: "BANHEIRO separado para público e funcionários, dimensão mínima de 1,6 m²", norma: "RDC 50" },
  { title: "BANHEIRO não usado para guarda de objetos e materiais", norma: "Art. 21 Port. SMS 284/09 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "BANHEIRO — Ralo no piso com tampa escamoteável", norma: "Art. 17 RDC 63/11; Art. 19 Port. SMS 284/09" },
  { title: "BANHEIRO — Vaso sanitário com tampa, lavatório", norma: "Art. 17 RDC 63/11; Art. 19 Port. SMS 284/09" },
  { title: "BANHEIRO — Sabonete líquido, papel toalha e papel higiênico em dispensadores abastecidos", norma: "Art. 17 RDC 63/11; Art. 19 Port. SMS 284/09" },
  { title: "DML exclusivo (mín. 2 m²) com tanque, proibido compartilhar com copa", norma: "Item 8.7 da RDC 50/02; Art. 32 Port. SMS 284/09 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "COPA em local adequado, organizado e limpo", norma: "Art. 4, Inc. IV e Art. 66, § 1º da Port. SMS 284/09 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "TUBULAÇÃO sem aparência (embutida ou protegida com material resistente)", norma: "RDC 50" },
  { title: "ÁREA CRÍTICA — acabamento monolítico (sem rejuntes abertos)", norma: "RDC 50" },
  { title: "ÁREA CRÍTICA — forro contínuo (proibido removível)" },
  { title: "ÁREA CRÍTICA — pisos, paredes e tetos resistentes a lavagem e desinfetantes", norma: "RDC 50" },
  { title: "ÁREA CRÍTICA — pias com acionamento por pedal", norma: "RDC 50" },
  { title: "ÁREA CRÍTICA — ventilação que não recircule ar contaminado", norma: "RDC 50" },
  { title: "ÁREA CRÍTICA — proibido divisórias removíveis (paredes pré-fabricadas só com acabamento monolítico)", norma: "RDC 50" },
  { title: "ÁREA SEMICRÍTICA — pisos, paredes e tetos resistentes a lavagem e desinfetantes", norma: "RDC 50" },
  { title: "ÁREA SEMICRÍTICA — forro pode ser removível, mas resistente à limpeza" },
  { title: "ÁREA SEMICRÍTICA — divisórias resistentes a desinfetantes e lavagem" },
  { title: "PCD — Acesso adaptado permitindo ingresso sem ajuda de terceiro", norma: "NBR-9050; RDC 50; Lei 10.098/00" },
  { title: "PORTA — mínimo 0,80 x 2,10", norma: "RDC 50" },
  { title: "PORTA — banheiro abre para fora", norma: "RDC 50" },
  { title: "PORTA — ajustada ao batente, fechamento automático e material liso e impermeável", norma: "RDC 50" },
  { title: "MAÇANETA — tipo alavanca", norma: "RDC 50" },
  { title: "CONFORTO ACÚSTICO" },
  { title: "CONFORTO TÉRMICO compatível com as atividades", norma: "Art. 38 da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "MANUTENÇÃO AR-CONDICIONADO — limpeza mensal de filtros e semestral de bandejas e serpentinas", norma: "Item 4 do Anexo da Res. ANVISA 9/03; LF 13.589/18; ABNT 17037/23 v.2 c/c LM 8741/08, Art. 81, Inc. XIX" },
  { title: "CONFORTO LUMINOSO — lâmpadas em adequado funcionamento e protegidas", norma: "NR-15, Anexo 4, Portaria 08/06/78 do MTE" },
  { title: "CONFORTO LUMINOSO — iluminação compatível com as atividades", norma: "Art. 38 da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "QUALIDADE DA ÁGUA — comprovante de limpeza/desinfecção dos reservatórios a cada 6 meses" },
  { title: "ÁGUA POTÁVEL — copos descartáveis em dispensadores adequados", norma: "Art. 9º, Inc. II; Art. 11 § 1º da Port. SMS 284/09 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "ÁGUA POTÁVEL — troca dos filtros dos bebedouros", norma: "Art. 15 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "LOCALIZAÇÃO — proibido perto de depósitos de lixo, indústrias ruidosas ou poluentes", norma: "RDC 50" },
  { title: "RODAPÉ — embutido ou arredondado", norma: "RDC 50" },
  { title: "Estabelecimento com ACESSO DIRETO e independente (não usado como residência)", norma: "Art. 4º, Inc. I; Art. 3º Port. SMS 284/09 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "IDENTIFICAÇÃO EXTERNA visível do estabelecimento", norma: "Art. 4º, Inc. II Port. SMS 284/09 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "REQUISITOS DA PLACA pelo Conselho de Classe" },
  { title: "INSTALAÇÕES FÍSICAS internas e externas conservadas, seguras, organizadas, confortáveis e limpas", norma: "Art. 36 e 42 da RDC 61/11" },
  { title: "INSTALAÇÕES ELÉTRICAS protegidas por tubulações", norma: "Art. 35 da RDC 63/11; Art. 24 Port. SMS 284/09 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "SALA DE PROCEDIMENTO com pia, sabão líquido, papel toalha e lixeira com pedal", norma: "Item B 4.8 RDC 50/02; Art. 14, Inc. V c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "CONSULTÓRIO com área mínima de 9 m²", norma: "RDC 50" },
  { title: "Piso, teto, paredes e divisórias livres de infiltrações, trincas e rachaduras; material liso e resistente" },
  { title: "Sala de recepção em boas condições higiênico-sanitárias e com lugares para sentar" },
  { title: "Manutenções preventivas e corretivas das instalações prediais, elétricas e hidráulicas (próprias ou terceirizadas)" },
  { title: "Área externa livre de focos de insalubridade, lixo, vetores, pragas e animais" },
  { title: "Instalações separadas por barreiras físicas que facilitem a higienização" },
  { title: "Comprovante de higienização das CAIXAS D'ÁGUA a cada seis meses", norma: "Art. 39, § 1º e § 2º da RDC 61/2011 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Sistema de ventilação suficiente para manter temperatura adequada e circulação de ar" },
  { title: "MOBILIÁRIOS almofadados revestidos de material lavável e impermeável, sem furos, rasgos ou reentrâncias", norma: "Art. 56 da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
];

const G3_PROCEDIMENTOS: Seed[] = [
  { title: "PGE — Plano de Gerenciamento de Equipamentos com inventário", norma: "Art. 3º, Inc. XI e XIV; Art. 5º, Inc. I da RDC 509/21 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Equipamentos e acessórios em boas condições de uso (sem ferrugem ou sujidades)" },
  { title: "Mocho, refletor e cadeira odontológica em perfeito estado de conservação e limpeza" },
  { title: "Cuspideira com água corrente, conservação e limpeza" },
  { title: "Equipamentos e acessórios regularizados na ANVISA", norma: "Art. 126, Inc. VII e VIII da L.E. 16.140/07; Art. 25 da L.F. 6360/76 c/c Art. 81, Inc. IV; Art. 82, § 1º da LM 8741/08" },
  { title: "MANUTENÇÃO PROGRAMADA periódica e calibração de instrumentos com registros", norma: "Art. 23, Inc. IX da RDC 63/11; Art. 116, Inc. III da Lei Est. 16.140/07 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Compressor de ar do equipo preferencialmente isento de óleo e em local com captação de ar externo" },
  { title: "Compressor não isento de óleo: filtros e registros de troca/limpeza conforme fabricante" },
  { title: "Compressor instalado com duto à tomada direta de ar externo (ventilação forçada)" },
  { title: "Materiais e equipamentos utilizados exclusivamente para os fins a que se destinam", norma: "Art. 55 da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "RAIO-X (intra/extra oral): laudo de radioproteção, teste de fuga de cabeçote e dosimetria mensal", norma: "Resolução Normativa nº 002/DIVS/SES de 13/05/15" },
  { title: "SUPORTE À VIDA — KIT DE EMERGÊNCIA disponível", norma: "Art. 58 da RDC 63/2011" },
  { title: "MEDICAMENTOS controlados em armário trancado", norma: "Art. 67, 98 da Portaria 344/98 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Não reutiliza medicamento estéril após abertura do frasco", norma: "Art. 8º Inc. V e Art. 55 da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Medicamentos protegidos da incidência solar e umidade, dentro do prazo de validade" },
  { title: "Medicamentos/produtos TERMOLÁBEIS acondicionados em refrigerador exclusivo" },
  { title: "Medicamentos termossensíveis em temperatura compatível com sua conservação (registros e controles)", norma: "Item 13.1 RDC 67/07; Art. 78, 83, 84 RDC 430/20; Art. 116, Inc. I LE 16.140/07 c/c Art. 14, Inc. III; Art. 81 Inc. XVI 'h'; Art. 82 § 2º LM 8741/08" },
  { title: "Controle de temperatura (mín. 2 leituras diárias) em todos os locais de armazenamento", norma: "Item 13.1 RDC 67/07; Art. 78, 83, 84 RDC 430/20; Art. 116, Inc. I LE 16.140/07" },
  { title: "Medicamento manipulado em nome da empresa com Alvará Sanitário, teste de esterilidade e estabilidade", norma: "Itens 5.10, 5.10.1, 5.10.2 e 5.10.3.1; Anexo IV, item 9.3 'c' da RDC 67/07" },
  { title: "Produtos/medicamentos rotulados conforme legislação", norma: "Art. 54 e Art. 8º Inc. V da RDC 63/11; Art. 81, Inc. XVI 'e' e 'f' c/c Art. 82 § 2º e § 3º da LM 8741/08" },
  { title: "Utiliza produtos com registro ANVISA para desinfecção (não usa produtos domésticos)", norma: "Art. 55 c/c Art. 57 RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Produtos fracionados rotulados (nome, lote, validade até 7 dias) e embalagem original mantida", norma: "Art. 29, Inc. IV Port. 284/09 c/c LM 8741/08, Art. 81, Inc. XIX" },
  { title: "Produtos dentro do prazo de validade; não reutiliza produto estéril após uso definido pelo fabricante", norma: "Art. 3º, Inc. I da Port. SMS 284/09 c/c Art. 81, Inc. XII; Art. 82, § 2º e § 3º da LM 8741/08" },
  { title: "Dispensadores com preparações alcoólicas em consultórios, salas de procedimento e leitos", norma: "Art. 4º, Inc. IX e X; Art. 5º, Inc. II e IV; Art. 6º, Inc. I e II da RDC 42/10 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Disponibilidade de equipamentos, materiais, insumos e medicamentos compatíveis com a demanda", norma: "Art. 17 da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "PRODUTO COSMÉTICO usado apenas em pele íntegra (sem injeção ou microagulhamento)", norma: "Art. 3º Inc. V da Lei 6360/76 c/c Art. 55 da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Compra, vende, utiliza e armazena apenas produtos com registro ANVISA", norma: "LM 8741/08, Art. 81, Inc. XVI 'e' e 'f' c/c Art. 82 § 2º e § 3º c/c Port. SMS 283/09, Art. 12" },
  { title: "TOALHAS limpas em local fechado e usadas em cesto com tampa; contrato de lavanderia regularizado", norma: "Art. 11 e 23, Inc. V da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
];

const G4_HIGIENIZACAO: Seed[] = [
  { title: "Higienização de materiais de limpeza ocorre fora da área de procedimentos" },
  { title: "Instalações, equipamentos, móveis e utensílios em condições higiênico-sanitárias apropriadas (livres de resíduos e odores)", norma: "Art. 52 da RDC 63/11" },
  { title: "Saneantes regularizados pelo Ministério da Saúde; diluição, tempo de contato e modo de uso conforme fabricante" },
  { title: "Saneantes e produtos de limpeza armazenados em local apropriado, separados dos demais" },
  { title: "Utensílios de higienização próprios, conservados, em número suficiente e armazenados em local reservado" },
  { title: "Operações de limpeza e desinfecção possuem registro de frequência" },
  { title: "Não permite COMER ou guardar alimentos no local de armazenamento de medicamentos, cosméticos e produtos para saúde", norma: "Art. 64 da RDC 63/11; Art. 14 RDC 509/21 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Cartazes informando o modo correto de lavar e higienizar as mãos nas instalações sanitárias dos funcionários" },
  { title: "PGRSS — Plano de Gerenciamento de Resíduos de Serviço de Saúde", norma: "Art. 5º da RDC 222/18 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "COLETA DE RESÍDUO — contrato com empresa especializada para recolhimento e destinação final" },
  { title: "COLETA DE RESÍDUO — Manifesto de Transporte de Resíduos (MTR)" },
  { title: "COLETA DE RESÍDUO — empresa possui Licença Ambiental de Operação (LAO)" },
  { title: "LIXEIRAS identificadas conforme o tipo de lixo gerado", norma: "Art. 3º, Inc. XXIX, Anexo II 22 da RDC 222/2018 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "LIXEIRAS de material liso, íntegras, resistentes, com cantos arredondados e em número suficiente", norma: "Art. 17 da RDC 222/2018 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "LIXEIRAS com tampas acionadas por pedal (sem contato manual)", norma: "RDC nº 306/04/ANVISA; RDC 50" },
  { title: "PERFUROCORTANTES descartados em recipiente rígido, identificado, com tampa, em suporte específico", norma: "Art. 86 e 87 da RDC 222/18 c/c Art. 81, Inc. XI da LM 8741/08" },
  { title: "PERFUROCORTANTES descartados ao atingir 3/4 da capacidade, sem esvaziamento manual ou reaproveitamento", norma: "Art. 86 e 87 da RDC 222/18 c/c Art. 81, Inc. XI da LM 8741/08" },
  { title: "Não utiliza resíduos PERFUROCORTANTES como peça de decoração", norma: "Art. 86 e 89 da RDC 222/18 c/c Art. 81, Inc. XI da LM 8741/08" },
  { title: "Sacos para RESÍDUOS DO GRUPO A substituídos a 2/3 da capacidade ou a cada 48 horas", norma: "Art. 14 da RDC 222/18" },
  { title: "Sacos com resíduos de fácil putrefação substituídos no máximo a cada 24 horas", norma: "Art. 14, § p.u. da RDC 222/18 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Saco branco leitoso utilizado para RESÍDUOS DO GRUPO A (infectante)", norma: "Art. 15 da RDC 222/18 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "LOCAL exclusivo para guarda temporária de lixo INFECTANTE com coletores tampados", norma: "Art. 15 e 27 da RDC 222/18 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "RECICLÁVEIS e LIXO COMUM armazenados de forma adequada, evitando atração de pragas" },
  { title: "ESGOTAMENTO SANITÁRIO — sistema de esgoto adequado" },
  { title: "Comprovante do CONTROLE DE PRAGAS (empresa regular na Vigilância Sanitária)", norma: "Art. 63, § único da RDC e Port. SMS 284/09 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Empresa de controle químico estabelece procedimentos pré e pós-tratamento; equipamentos higienizados antes do reuso" },
  { title: "Resíduos de amálgama acondicionados em recipiente com selo d'água e encaminhados para recuperação", norma: "RDC nº 306/04 ou substituta" },
];

const G5_CME: Seed[] = [
  { title: "BARREIRA FÍSICA separando setor sujo (expurgo) do setor limpo (preparo/esterilização)", norma: "RDC 50" },
  { title: "BARREIRA FÍSICA permite passagem direta dos materiais por guichê ou similar", norma: "RDC 50" },
  { title: "AUTOCLAVE com monitoramento biológico semanal e químico em cada carga", norma: "RDC 50" },
  { title: "Garante a qualidade dos processos de DESINFECÇÃO E ESTERILIZAÇÃO", norma: "Art. 57 RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Consultório individualizado: bancada molhada exclusiva, bancada seca; só esteriliza DM não complexo (CME1)", norma: "Art. 122, 123, 126 Inc. VII e VIII e 151 da LE 16.140/07 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Terceirização do processamento: sala de utilidades para pré-limpeza e contrato com empresa processadora", norma: "Art. 10º da RDC 156/06; Art. 11 e 23 Inc. V da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Não realiza atividades comerciais de reprocessamento para outras instituições", norma: "Art. 13º da RDC 156/06 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Não processa DM em DML, copa ou sanitário", norma: "Art. 17º da RDC 63/11 c/c RDC 50/02 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Usa apenas detergentes indicados para processamento de DM", norma: "Art. 55 da RDC 63/2011 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Selagem das embalagens tipo envelope feita por termosseladora ou conforme fabricante", norma: "Art. 80 da RDC 15/12 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Não utiliza fita crepe para fechar embalagem grau cirúrgico", norma: "Art. 80 da RDC 15/12 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Embalagens identificadas com nome do produto, data de esterilização, validade e responsável", norma: "Art. 83, 84 e 85 da RDC 15/12 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Não utiliza estufa para esterilização de produtos para saúde", norma: "Art. 92 da RDC 15/12 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Monitoramento de cada carga com pacote teste desafio (integradores químicos classes 5 ou 6)", norma: "Art. 96 da RDC 15/12 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Cirurgias com implantáveis: integradores químicos (classe 5 ou 6) em cada pacote e indicador biológico a cada carga", norma: "Art. 99 da RDC 15/12 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Desinfetante com registro ANVISA para materiais semicríticos", norma: "Art. 55 da RDC 63/11 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Instrumentos contaminados por fluidos orgânicos esterilizados após cada uso", norma: "Art. 5º, §1º Port. SMS 283/2009 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Instrumentos esterilizados mantidos nos invólucros e guardados em armário/gaveta exclusivo", norma: "Art. 6º §5º da Port. SMS 283/09 c/c Art. 81, Inc. XIX da LM 8741/08" },
  { title: "Registros de monitoramento do processamento mantidos em livro próprio ou planilha" },
  { title: "Documento escrito de processamento com rotinas, EPIs e procedimentos acessível aos funcionários" },
  { title: "Produtos críticos submetidos à esterilização após limpeza" },
  { title: "Produtos semicríticos submetidos no mínimo à desinfecção de alto nível antes do uso" },
  { title: "Produtos não críticos submetidos no mínimo à limpeza antes do uso" },
  { title: "Consultórios multiprofissionais: CME simplificada com áreas de recepção/limpeza, preparo/esterilização, desinfecção química (quando aplicável) e armazenamento; barreira técnica entre sujo e limpo" },
  { title: "Consultórios odontológicos isolados: processamento em bancada na sala de atendimento, respeitando barreira técnica e fluxo" },
  { title: "Produtos e saneantes utilizados na limpeza/desinfecção regularizados pela ANVISA/MS" },
  { title: "Limpeza manual feita com acessórios não abrasivos e que não liberam partículas" },
  { title: "Utensílios de limpeza compatíveis com os produtos, incluindo escovas para canulados e brocas" },
  { title: "Embalagens para esterilização regularizadas pela ANVISA e que mantêm a esterilidade" },
  { title: "Caixas metálicas com perfurações que permitem a penetração do vapor" },
  { title: "Produtos esterilizados armazenados em local exclusivo, limpo, seco e protegido da luz solar" },
  { title: "Monitoramento microbiológico do processo de esterilização (mín. uma vez por semana) com registros" },
  { title: "Possui incubadora para as ampolas de indicadores biológicos" },
  { title: "Moldes, modelos, próteses e materiais com possível contaminação previamente desinfetados antes do laboratório" },
  { title: "Materiais e próteses recebidos do laboratório sofrem desinfecção/esterilização conforme finalidade" },
];

function buildItems(category: Category, prefix: string, list: Seed[]): ChecklistItem[] {
  return list.map((it, idx) => ({
    id: `${prefix}${idx + 1}`,
    category,
    title: it.title,
    description: "",
    weight: it.weight ?? 6,
    norma: it.norma,
    observacao: it.observacao,
    penalidade: it.penalidade,
  }));
}

export const CHECKLIST: ChecklistItem[] = [
  ...buildItems("documentacao", "doc", G1_DOCUMENTACAO),
  ...buildItems("infraestrutura", "inf", G2_INFRAESTRUTURA),
  ...buildItems("procedimentos", "pro", G3_PROCEDIMENTOS),
  ...buildItems("higienizacao", "hig", G4_HIGIENIZACAO),
  ...buildItems("cme", "cme", G5_CME),
];

export type Answer = "sim" | "nao" | "na" | null;
export type Quality = "bom" | "ruim" | null;

export interface ItemResponse {
  answer: Answer;
  quality: Quality;
  justification: string;
  validity_date: string | null;
  validity_indeterminate: boolean;
}

export const EMPTY_RESPONSE: ItemResponse = {
  answer: null,
  quality: null,
  justification: "",
  validity_date: null,
  validity_indeterminate: false,
};

export type ValidityStatus = "none" | "indeterminate" | "expired" | "d15" | "d30" | "d60" | "ok";

export function getValidityStatus(
  r: Pick<ItemResponse, "validity_date" | "validity_indeterminate"> | undefined | null,
  today: Date = new Date(),
): { status: ValidityStatus; days: number | null } {
  if (!r) return { status: "none", days: null };
  if (r.validity_indeterminate) return { status: "indeterminate", days: null };
  if (!r.validity_date) return { status: "none", days: null };
  const d = new Date(r.validity_date + "T00:00:00");
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round((d.getTime() - t.getTime()) / 86400000);
  if (days < 0) return { status: "expired", days };
  if (days <= 15) return { status: "d15", days };
  if (days <= 30) return { status: "d30", days };
  if (days <= 60) return { status: "d60", days };
  return { status: "ok", days };
}

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

export function sortItems(items: ChecklistItem[], responses: ResponseMap): ChecklistItem[] {
  return [...items].sort((a, b) => {
    const naA = responses[a.id]?.answer === "na" ? 1 : 0;
    const naB = responses[b.id]?.answer === "na" ? 1 : 0;
    if (naA !== naB) return naA - naB;
    return a.title.localeCompare(b.title, "pt-BR");
  });
}

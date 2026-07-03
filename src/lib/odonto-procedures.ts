/**
 * Mapeamento de procedimentos por especialidade odontológica.
 * Usado para popular automaticamente a matriz TCLE×POP quando uma clínica
 * é cadastrada com uma ou mais especialidades.
 */

export const UNIVERSAL_PROCEDURES: string[] = [
  "Limpeza de pele",
  "Peeling químico",
  "Microagulhamento",
  "Jato de plasma",
  "Fotodepilação a laser (Laser Adhara – alta potência)",
  "Laser Lavien",
  "Laser de baixa potência (Laser Pison)",
  "Ultrassom microfocado e macrofocado (HIPRO)",
  "Ultrassom microfocado e macrofocado (Ultraformer III / MPT)",
];

export const PROCEDURES_BY_SPECIALTY: Record<string, string[]> = {
  "Dentística": [
    "Restauração em resina (dente da frente e de trás)",
    "Faceta de resina",
    "Faceta de porcelana",
    "Lente de contato dental",
    "Clareamento dental de consultório",
    "Clareamento dental caseiro",
    "Fechamento de espaço entre os dentes (diastema)",
    "Reanatomização / recontorno dental",
    "Troca de restaurações antigas",
  ],
  "Endodontia": [
    "Tratamento de canal",
    "Retratamento de canal",
    "Clareamento interno (dente escurecido)",
    "Capeamento pulpar",
    "Remoção de instrumento fraturado no canal",
    "Cirurgia de ponta de raiz (apicectomia)",
  ],
  "Periodontia": [
    "Limpeza profunda / raspagem de tártaro (raspagem radicular)",
    "Cirurgia de gengiva (gengivoplastia / gengivectomia)",
    "Enxerto de gengiva",
    "Tratamento de retração gengival",
    "Aumento de coroa clínica (correção de sorriso gengival)",
    "Remoção de \"freio\" da boca (frenectomia)",
    "Tratamento de gengivite e periodontite",
  ],
  "Prótese Dentária": [
    "Dentadura (prótese total)",
    "Prótese parcial removível (ponte móvel)",
    "Coroa / \"capa\" de porcelana",
    "Ponte fixa",
    "Prótese sobre implante",
    "Protocolo (prótese fixa sobre implantes)",
    "Placa de bruxismo (placa miorrelaxante)",
    "Reabilitação oral completa",
  ],
  "Ortodontia": [
    "Aparelho fixo metálico",
    "Aparelho fixo estético",
    "Alinhador transparente (tipo Invisalign)",
    "Aparelho móvel",
    "Expansor de palato (disjuntor)",
    "Contenção pós-tratamento",
    "Mini-implante ortodôntico",
  ],
  "Implantodontia": [
    "Implante dentário unitário",
    "Implante de vários dentes",
    "Enxerto ósseo",
    "Levantamento de seio maxilar",
    "Carga imediata (dente no mesmo dia)",
    "Protocolo \"All-on-Four\" / \"All-on-Six\"",
    "Cirurgia guiada por computador",
    "Tratamento de peri-implantite",
  ],
  "Odontopediatria": [
    "Atendimento odontológico infantil",
    "Restauração em dente de leite",
    "Tratamento de canal em dente de leite",
    "Coroa de aço para criança",
    "Aplicação de flúor",
    "Selante (proteção dos dentes)",
    "Atendimento de trauma dental infantil",
  ],
  "Odontogeriatria": [
    "Atendimento odontológico do idoso",
    "Adaptação de prótese para boca seca",
    "Tratamento de cárie de raiz",
    "Reabilitação com prótese em idosos",
    "Atendimento a paciente com limitação de mobilidade",
  ],
  "Estomatologia": [
    "Diagnóstico de feridas/lesões na boca",
    "Biópsia de lesão bucal",
    "Acompanhamento de lesões com risco de câncer",
    "Tratamento de aftas e infecções na boca (herpes, candidíase)",
    "Avaliação da boca antes de quimio/radioterapia",
  ],
  "Ortopedia Funcional dos Maxilares": [
    "Aparelho ortopédico funcional",
    "Correção do crescimento dos maxilares (em crianças)",
    "Tratamento precoce de mordida errada",
    "Reeducação de respiração e deglutição",
  ],
  "Disfunção Temporomandibular e Dor Orofacial (DTM)": [
    "Tratamento de dor na ATM (articulação da mandíbula)",
    "Placa de bruxismo",
    "Tratamento de bruxismo",
    "Toxina botulínica para bruxismo / apertamento",
    "Tratamento de dor de cabeça e dor facial de origem dental",
  ],
  "Odontologia para Pacientes com Necessidades Especiais": [
    "Atendimento a pacientes com deficiência",
    "Atendimento a pacientes com autismo (TEA)",
    "Atendimento sob sedação",
    "Atendimento sob anestesia geral (hospitalar)",
  ],
  "Cirurgia e Traumatologia Bucomaxilofacial (CTBMF)": [
    "Extração de siso (dente do siso)",
    "Extração de dente incluso",
    "Cirurgia ortognática (correção de mordida e face)",
    "Tratamento de fratura de face",
    "Remoção de cisto ou tumor na boca/maxilar",
    "Biópsia",
    "Enxerto ósseo",
    "Cirurgia da articulação da mandíbula (ATM)",
  ],
  "Cirurgia Estética Orofacial (CEOF)": [
    "Bichectomia",
    "Blefaroplastia (cirurgia das pálpebras)",
    "Otoplastia (cirurgia da orelha)",
    "Lifting facial (ritidoplastia)",
    "Rinoplastia (cirurgia do nariz)",
    "Rinoplastia da ponta do nariz (alectomia)",
    "Lipoaspiração de papada",
    "Lipoaspiração facial",
    "Lipoaspiração do pescoço (cervical)",
    "Lipectomia facial",
    "Lipectomia do pescoço",
    "Enxerto de gordura no rosto (lipoenxertia facial)",
    "Lifting de pescoço (platismoplastia)",
    "Elevação de sobrancelha (cirúrgica)",
    "Fios de sustentação não absorvíveis (nylon)",
    "Otomodelação com fio",
    "Lifting de lábio (lip lifting)",
    "Reconstrução labial",
    "Cirurgia dos lábios (queiloplastia)",
  ],
  "Harmonização Orofacial (HOF)": [
    "Toxina botulínica (Botox)",
    "Preenchimento com ácido hialurônico",
    "Preenchimento labial",
    "Rinomodelação (harmonização do nariz sem cirurgia)",
    "Bichectomia",
    "Bioestimulador de colágeno (Sculptra / PLLA)",
    "Bioestimulador de colágeno (Radiesse / hidroxiapatita de cálcio)",
    "Bioestimulador de colágeno (Ellansé / policaprolactona)",
    "Skinbooster (hidratação profunda da pele)",
    "PDRN (regeneração da pele / \"salmão\")",
    "Fios de sustentação (fios de PDO lisos)",
    "Fios de sustentação (fios de PDO espiculados)",
    "Lipo de papada enzimática (lipólise / intradermoterapia)",
  ],
  "Radiologia Odontológica e Imaginologia": [
    "Radiografia panorâmica",
    "Radiografia periapical / interproximal",
    "Documentação ortodôntica",
    "Tomografia odontológica (feixe cônico)",
    "Laudo radiográfico / tomográfico",
  ],
  "Patologia Oral (Patologia Bucal)": [
    "Biópsia de lesão bucal",
    "Exame histopatológico (análise da lesão em laboratório)",
    "Diagnóstico de lesões com risco de câncer",
    "Citologia (raspado da lesão)",
  ],
  "Odontologia em Saúde Coletiva": [
    "Programas de saúde bucal em escolas / empresas / SUS",
    "Ações de prevenção em massa",
    "Planejamento e gestão de serviços odontológicos",
  ],
  "Odontologia Legal": [
    "Perícia odontológica",
    "Identificação de pessoas pela arcada dentária",
    "Estimativa de idade por exame dental",
    "Laudo pericial",
    "Avaliação de dano / erro odontológico",
  ],
  "Odontologia do Trabalho": [
    "Exame odontológico admissional / demissional",
    "Laudo de doença ocupacional",
    "Perícia trabalhista odontológica",
    "Programa de saúde bucal na empresa",
  ],
  "Odontologia Hospitalar": [
    "Atendimento odontológico em hospital / UTI",
    "Avaliação da boca antes de cirurgias",
    "Atendimento sob anestesia geral",
    "Cuidado bucal de pacientes oncológicos e transplantados",
  ],
  "Homeopatia": [
    "Prescrição de medicamento homeopático",
    "Tratamento complementar de ansiedade e dor",
  ],
  "Acupuntura": [
    "Acupuntura para dor facial",
    "Acupuntura para ansiedade / enjoo no atendimento",
    "Auriculoterapia",
  ],
};

/**
 * Retorna a lista deduplicada de procedimentos aos quais a clínica está apta,
 * considerando as especialidades selecionadas + procedimentos universais.
 */
export function proceduresForSpecialties(especialidades: string[]): string[] {
  const set = new Set<string>();
  for (const p of UNIVERSAL_PROCEDURES) set.add(p);
  for (const esp of especialidades) {
    const list = PROCEDURES_BY_SPECIALTY[esp];
    if (list) for (const p of list) set.add(p);
  }
  return Array.from(set);
}

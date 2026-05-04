## Visão geral

Vou ativar o Lovable Cloud (banco + auth) e reconstruir o painel para suportar múltiplos clientes, sincronização em tempo real, link de visitante, relatório mensal e todas as melhorias de UX pedidas. Entregarei em uma única implementação completa.

## 1. Backend (Lovable Cloud)

**Tabelas:**
- `clients` — dados da clínica (nome, CNPJ, profissional, área, especialidade, endereço, telefone, tipo de contrato, owner_id).
- `client_members` — vincula usuários ao cliente com `role` (`owner` | `editor` | `viewer`).
- `responses` — uma linha por item do checklist por cliente: `client_id`, `item_id`, `answer` (sim/nao/na), `quality` (bom/ruim), `justification` (texto), `updated_at`.
- `monthly_snapshots` — snapshot mensal automático: `client_id`, `month` (YYYY-MM), `score`, `score_by_category` (jsonb), `created_at`.
- `visitor_links` — tokens de acesso externo: `client_id`, `token`, `mode` (view/edit), `expires_at`.
- `reset_log` — auditoria das resets: `client_id`, `user_id`, `justification`, `created_at`.

**Auth:** email/senha + Google. Quem cria o primeiro cliente vira owner.

**RLS:** todas as tabelas protegidas. Usuário só vê clientes onde é membro. Visitante usa token público que dá acesso a um cliente específico (via server function que valida o token, não RLS direto).

**Realtime:** habilitado em `responses` para sincronização instantânea entre painel principal e link de visitante.

## 2. Identificação do Cliente (Dashboard topo)

Card de identificação editável com: Nome da Clínica, Profissional Responsável, CNPJ, Área (select Odontologia/Medicina) + Especialidade (texto), Endereço, Telefone, Tipo de Contrato (Assessoria Odontológica / Regularização Sanitária). Salva em `clients`.

Seletor de cliente no header (caso o usuário gerencie mais de uma clínica).

## 3. Refino da Interface

**Visão Consolidada unificada:** ícone odontológico (dente estilizado SVG) centralizado com o % global de maturidade dentro. Substitui o gauge separado + shield builder por uma única visualização forte. Stats e gargalos abaixo.

**Por item do checklist, adicionar:**
- **Justificativa/Implementação** — textarea expansível.
- **Avaliação Qualitativa** — toggle Bom/Ruim. Se "Ruim", item conta como 0.5 no cálculo (50% do peso).
- **Ícone de norma (alerta)** — popover ao hover mostra: norma técnica + consequência jurídico-financeira.
- **Modal de imagem de referência** — clique no nome abre modal com placeholder ("Imagem a ser anexada") e descrição do que observar.

**Recálculo do score:** `(simBom*1 + simRuim*0.5) / aplicáveis * 100`.

## 4. Conteúdo normativo (proposta inicial)

Vou mapear normas para os itens principais. Exemplos:
- Alvará Sanitário → RDC 50/2002 + Lei 6.437/77 → "Interdição do estabelecimento e multa".
- Prontuário → Res. CFO 118/2012 + CFM 1.821/2007 → "Inversão do ônus da prova em processo judicial; presunção contra o profissional".
- PGRSS → RDC 222/2018 → "Multa sanitária + responsabilidade ambiental".
- TCLE → Código de Ética CFO Art. 9º + CDC → "Nulidade do consentimento, responsabilidade civil objetiva".
- LGPD → Lei 13.709/2018 → "Multa até 2% faturamento, limitada a R$ 50 milhões".
- EPI → NR-32 → "Auto de infração trabalhista + responsabilidade por acidente".

(Vou cobrir todos os itens; usuário revisa depois.)

## 5. Trava de Reset

Botão "Reiniciar" abre AlertDialog em 2 etapas:
1. Aviso forte ("Esta ação apagará todas as respostas").
2. Campo obrigatório de justificativa (mínimo 20 caracteres). Só habilita o botão "Confirmar Reset" se preenchido.
3. Grava em `reset_log` com user_id e justificativa antes de limpar `responses`.

## 6. Ajustes nos itens

- Ordenação alfabética automática por título em **Assistencial**, **Pessoas e Parcerias** e **Sanitária** (mantendo N/A no fim como já existe).
- Search bar no topo de cada aba (filtra por título, em tempo real).
- Renomear "Ficha de Evolução Clínica" → **"Prontuário"**.
- Pessoas e Parcerias item 3 → **"Contrato de prestação de serviços sem vínculo empregatício"**.
- Pessoas e Parcerias item 5 → **"Contrato de Parcerias/Cessão de Sala"**.

## 7. Expansão Assistencial

Adicionar item geral: **"Termo de Declaração de Intercorrências de Outros Profissionais"**.

Adicionar à matriz TCLE/POP os serviços: Limpeza de Pele, Bioestimulador Corporal, Ácido Hialurônico Corporal, HIPRO, Laser Adhara, Lavieen, Pison, Radiofrequência, Ultraformer III, MPT.

## 8. Relatório Mensal (nova aba)

- Aba "Relatório de Evolução".
- Server function diária verifica se já existe snapshot para o mês corrente; se não, cria.
- Gráfico de linha (Recharts) com score por mês.
- Card comparativo: "Mês atual: X% / Mês anterior: Y% / Δ +Z pp".
- Breakdown por categoria.
- Histórico começa do momento da implementação (sem dados retroativos, conforme escolhido).

## 9. Link de Visitante + Sincronização em Tempo Real

- Botão "Gerar link de visitante" no header → cria token em `visitor_links` (modo view ou edit, validade configurável).
- Rota pública `/v/$token` carrega o painel sem auth, validando o token via server function.
- Mutações do visitante passam por server function que valida token antes de gravar (RLS bypass controlado).
- Painel principal e visitante assinam o canal Realtime de `responses` filtrado pelo `client_id` → mudanças aparecem instantaneamente em ambos.

## 10. Migração de dados existentes

Detecto se há `localStorage` com a chave atual e ofereço importar como respostas iniciais do primeiro cliente criado.

---

## Detalhes técnicos

- **Stack:** Lovable Cloud (Supabase), TanStack Start, server functions com `requireSupabaseAuth`, Realtime channels.
- **Cálculo de score atualizado:**
  ```ts
  const effectiveSim = items.reduce((acc, it) => {
    const a = answers[it.id];
    if (a?.answer !== "sim") return acc;
    return acc + (a.quality === "ruim" ? 0.5 : 1);
  }, 0);
  const score = applicable > 0 ? (effectiveSim / applicable) * 100 : 0;
  ```
- **Snapshot mensal:** `getOrCreateMonthlySnapshot` chamado no carregamento do dashboard.
- **Visitante:** rota `/v/$token` fora de `_authenticated`, server function `getStateByToken` / `setAnswerByToken`.
- **Ícone do dashboard:** SVG inline de dente com texto centralizado (sem dependência externa).

## Ordem de execução

1. Habilitar Lovable Cloud + criar tabelas + RLS.
2. Atualizar `checklist-data.ts` (renomeações, novos itens, normas, ordem alfabética).
3. Criar server functions (clientes, respostas, snapshots, visitante, reset).
4. Refatorar store para Cloud + migração do localStorage.
5. Auth (login/signup) + rota `/_authenticated`.
6. Reconstruir Dashboard (ícone unificado, identificação do cliente).
7. Reconstruir ChecklistSection (justificativa, qualitativa, normas, modal imagem, busca).
8. Trava de reset com 2 etapas.
9. Aba Relatório de Evolução.
10. Link de visitante + Realtime.

## O que NÃO está no escopo

- Imagens reais nos modais (placeholders por enquanto, conforme escolhido).
- Histórico retroativo (snapshots começam do momento da implementação).
- Integração com EasyJur (é um prompt para outra ferramenta, fora do app).
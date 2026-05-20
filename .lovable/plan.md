
## 1. Tipos de contrato personalizados (lista global por usuário)

**Banco**
- Nova tabela `contract_types` (`id`, `owner_id`, `label`, `created_at`). RLS: dono vê/edita os próprios.
- Nova coluna `clients.contract_type_label text` (opcional). Quando preenchida, substitui o rótulo do enum `tipo_contrato`. Mantém o enum para compat.

**UI**
- Novo diálogo "Gerenciar tipos de contrato" acessível pelo cadastro/edição da clínica (botão ao lado do Select).
- O `Select` de tipo de contrato passa a listar: presets fixos ("Assessoria Odontológica", "Regularização Sanitária") + tipos personalizados do usuário. Ao selecionar um custom, gravamos `contract_type_label` (e mantemos `tipo_contrato` como default).
- Exibições (`ClientIdentification`, sidebar, dashboard) usam `contract_type_label ?? labelDoEnum`.

## 2. Compartilhamento por e-mail (papel: editor/viewer)

**Banco**
- Nova tabela `client_invitations` (`id`, `client_id`, `email` lowercased, `role` member_role, `invited_by`, `created_at`, `accepted_at`). RLS:
  - Owner/editor da clínica: select/insert/delete.
  - Convidado: select próprias (where lower(email)=lower(jwt email)).
- Função `accept_client_invitations()` SECURITY DEFINER: para o `auth.uid()` atual, lê seu e-mail, encontra convites pendentes, insere em `client_members` e marca `accepted_at`.

**UI**
- Botão "Compartilhar" no card de identificação da clínica → diálogo lista membros atuais (`client_members` + profile lookup) e convites pendentes, com formulário "email + papel".
- Ao logar (efeito em `AuthProvider` ou `ClientProvider`) chama `accept_client_invitations()` e dá refresh.

## 3. Realtime

Habilitar publicação `supabase_realtime` para: `clients`, `client_members`, `client_invitations`, `responses`, `custom_items`, `checklist_blocks`, `disabled_items`, `item_overrides`, `item_positions`.

**Wiring**
- `ClientProvider`: subscribe em `clients` + `client_members` → chama `refresh()` em qualquer mudança.
- `use-checklist-store`, `use-blocks`, `use-items`: cada hook subscribe nas tabelas que lê, filtrado por `client_id=eq.${currentClientId}`, e reexecuta o fetch.

## Arquivos afetados (resumo)
- Migration: contract_types, client_invitations, função accept, alter clients add column, alter publication realtime + RLS.
- `src/lib/contract-types.ts` (novo hook).
- `src/lib/use-invitations.ts` (novo hook).
- `src/components/ContractTypesDialog.tsx` (novo).
- `src/components/ShareClientDialog.tsx` (novo).
- `src/components/ClientIdentification.tsx` + `ClientSidebar.tsx`: integrar gerenciador de tipos + botão compartilhar + exibir label custom.
- `src/lib/client-context.tsx`: realtime + auto-aceite de convites no login.
- `src/lib/use-checklist-store.ts`, `src/lib/use-blocks.ts`, `src/lib/use-items.ts`: subscriptions realtime.

Confirma para eu seguir?

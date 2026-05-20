# Plano

## 1. Copiar estrutura entre painéis

Nova função `copyClientStructure(sourceId, targetIds[])` que copia, sem tocar nas respostas:

- `custom_items` (perguntas customizadas)
- `checklist_blocks` (blocos e ordem)
- `item_overrides` (edições de itens padrão)
- `item_positions` (ordem dos itens)
- `disabled_items` (itens desativados)
- `service_matrix_items` (matriz TCLE×POP)
- `contract_types` (tipos de contrato — já são por usuário, mas garantimos sincronia)
- Rótulos das abas e ordem das abas (hoje em `localStorage` por clientId) → migrar para nova tabela `client_ui_prefs` (`client_id`, `tab_labels jsonb`, `tab_order jsonb`) para serem sincronizáveis e copiáveis.

Estratégia para evitar duplicatas no destino:
- `custom_items`: deletar todos do destino e reinserir cópia (mantém `responses` porque elas usam `item_id` por texto/uuid — verificar; se houver risco, fazer upsert por `id` reciclado).
- `checklist_blocks`: deletar e recriar com novos UUIDs preservando `item_ids` e `position`.
- `item_overrides`, `item_positions`, `disabled_items`, `service_matrix_items`: upsert por chave natural (`client_id`+`item_id`).

UI:
- Novo botão **"Aplicar estrutura a outros painéis"** no `ClientIdentification` (e no header de `ClientWorkspace`).
- Abre `PropagateStructureDialog`: lista as outras clínicas com checkbox, botão "Aplicar".
- Mostra confirmação ("Isso vai substituir a estrutura — perguntas, blocos, abas — das clínicas selecionadas. Respostas não serão alteradas.").

## 2. Acesso por conta (account-level)

Mantém o convite por clínica existente. Adiciona um **segundo modo**:

### Schema
- Nova tabela `account_members` (`owner_id`, `member_id`, `role`, `created_at`).
- Nova tabela `account_invitations` (`owner_id`, `email`, `role`, `invited_by`, `accepted_at`).
- Nova função `accept_account_invitations()` (estilo da de clínicas).
- Nova função `is_account_member(_owner_id, _user_id)` SECURITY DEFINER.

### RLS
Atualizar políticas em `clients` e dependentes (`custom_items`, `responses`, `checklist_blocks`, `item_*`, `disabled_items`, `service_matrix_items`, `monthly_snapshots`, `reset_log`, `visitor_links`, `client_ui_prefs`) para incluir OR `public.is_account_member(clients.owner_id, auth.uid())`.

Para evitar reescrever 30+ políticas com subqueries que checam `clients.owner_id`, criar função:
```sql
public.can_access_client(_client_id, _user_id) -- membro direto OU account_member do owner
```
e substituir `is_client_member(...)` por `can_access_client(...)` nas políticas SELECT.

Para edição, `has_client_role(...)` ganha versão equivalente que aceita account_members com role `editor`/`owner`.

### UI
No `ClientSidebar`, novo botão **"Compartilhar conta inteira"** abrindo `AccountShareDialog`:
- Listar membros da conta + convites pendentes
- Convidar por e-mail (role editor/viewer)
- Aceitação automática no login via `accept_account_invitations()` (chamada já existente expandida)

No Dashboard / Sidebar, mostrar badge "Conta compartilhada por X" quando o `current.owner_id !== user.id` mas o usuário é account_member.

### Realtime
Adicionar `account_members` e `account_invitations` à publicação realtime e ao subscribe do `client-context` para refazer `refresh()` quando novos vínculos forem aceitos.

## Arquivos

**Migração** (`supabase/migrations/...sql`):
- Cria `account_members`, `account_invitations`, `client_ui_prefs`
- Cria `is_account_member`, `can_access_client`, `can_edit_client`, `accept_account_invitations`
- Substitui políticas SELECT/INSERT/UPDATE/DELETE em todas as tabelas dependentes
- Adiciona tabelas novas à publicação realtime

**Novos arquivos**:
- `src/lib/use-account-share.ts`
- `src/lib/use-ui-prefs.ts` (substitui `useTabLabels`/`useTabOrder` baseado em localStorage)
- `src/lib/copy-structure.ts`
- `src/components/AccountShareDialog.tsx`
- `src/components/PropagateStructureDialog.tsx`

**Edições**:
- `src/routes/index.tsx`: usar `use-ui-prefs`, botão de propagar
- `src/components/ClientSidebar.tsx`: botão "Compartilhar conta"
- `src/components/ClientIdentification.tsx`: botão "Aplicar a outros painéis"
- `src/lib/client-context.tsx`: realtime de `account_members`, aceitar convites no login

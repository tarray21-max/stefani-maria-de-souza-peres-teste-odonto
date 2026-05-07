-- Recriar policy de INSERT em clients usando o padrão (select auth.uid()) 
-- e aplicar explicitamente ao role authenticated
DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;

CREATE POLICY "Authenticated users can create clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK ((select auth.uid()) = owner_id);

-- Mesma coisa para client_members (insert do owner pelo trigger não passa por RLS por ser SECURITY DEFINER,
-- mas garantir que usuários autenticados possam ver/gerenciar)
DROP POLICY IF EXISTS "Members view membership of their clients" ON public.client_members;
CREATE POLICY "Members view membership of their clients"
ON public.client_members
FOR SELECT
TO authenticated
USING (public.is_client_member(client_id, (select auth.uid())));

DROP POLICY IF EXISTS "Members view their clients" ON public.clients;
CREATE POLICY "Members view their clients"
ON public.clients
FOR SELECT
TO authenticated
USING (public.is_client_member(id, (select auth.uid())));
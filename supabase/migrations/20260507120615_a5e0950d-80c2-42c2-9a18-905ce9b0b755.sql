DROP POLICY IF EXISTS "Authenticated users can create clients" ON public.clients;

CREATE POLICY "Authenticated users can create clients"
ON public.clients
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = owner_id);
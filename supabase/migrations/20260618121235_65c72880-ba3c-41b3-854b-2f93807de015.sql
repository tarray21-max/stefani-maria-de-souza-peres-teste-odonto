
-- 1. Fix storage RLS so users com acesso via account_members também consigam enviar/remover imagens
DROP POLICY IF EXISTS "Members upload checklist images" ON storage.objects;
DROP POLICY IF EXISTS "Members delete checklist images" ON storage.objects;

CREATE POLICY "Editors upload checklist images" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'checklist-images'
    AND auth.uid() IS NOT NULL
    AND public.can_edit_client(((storage.foldername(name))[1])::uuid, auth.uid())
  );

CREATE POLICY "Editors delete checklist images" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'checklist-images'
    AND auth.uid() IS NOT NULL
    AND public.can_edit_client(((storage.foldername(name))[1])::uuid, auth.uid())
  );

-- 2. Novos campos na clínica: CRM/CRO geral + números por especialidade
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS crm_cro text,
  ADD COLUMN IF NOT EXISTS especialidades_numeros text[] NOT NULL DEFAULT '{}'::text[];

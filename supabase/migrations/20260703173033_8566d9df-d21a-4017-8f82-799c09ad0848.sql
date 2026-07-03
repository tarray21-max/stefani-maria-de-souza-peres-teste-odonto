
CREATE POLICY "Client members can view logos" ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'client-logos'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.client_members m WHERE m.client_id = c.id AND m.user_id = auth.uid()
      ))
  )
);

CREATE POLICY "Client members can upload logos" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'client-logos'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.client_members m WHERE m.client_id = c.id AND m.user_id = auth.uid()
      ))
  )
);

CREATE POLICY "Client members can update logos" ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.client_members m WHERE m.client_id = c.id AND m.user_id = auth.uid()
      ))
  )
);

CREATE POLICY "Client members can delete logos" ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'client-logos'
  AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id::text = (storage.foldername(name))[1]
      AND (c.owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.client_members m WHERE m.client_id = c.id AND m.user_id = auth.uid()
      ))
  )
);

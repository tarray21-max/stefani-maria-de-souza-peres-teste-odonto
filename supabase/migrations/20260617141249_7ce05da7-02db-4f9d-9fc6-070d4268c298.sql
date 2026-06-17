
ALTER TABLE public.service_matrix_items
  ADD COLUMN IF NOT EXISTS norma text,
  ADD COLUMN IF NOT EXISTS observacao text;

CREATE TABLE IF NOT EXISTS public.service_matrix_item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  item_id text NOT NULL,
  path text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_matrix_item_images TO authenticated;
GRANT ALL ON public.service_matrix_item_images TO service_role;

ALTER TABLE public.service_matrix_item_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members read service item images" ON public.service_matrix_item_images
  FOR SELECT TO authenticated USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "editors insert service item images" ON public.service_matrix_item_images
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_client(client_id, auth.uid()));
CREATE POLICY "editors update service item images" ON public.service_matrix_item_images
  FOR UPDATE TO authenticated USING (public.can_edit_client(client_id, auth.uid())) WITH CHECK (public.can_edit_client(client_id, auth.uid()));
CREATE POLICY "editors delete service item images" ON public.service_matrix_item_images
  FOR DELETE TO authenticated USING (public.can_edit_client(client_id, auth.uid()));

CREATE INDEX IF NOT EXISTS service_matrix_item_images_client_item_idx
  ON public.service_matrix_item_images (client_id, item_id);

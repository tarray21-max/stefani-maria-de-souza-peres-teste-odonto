
-- 1. Item overrides for built-in items
CREATE TABLE public.item_overrides (
  client_id uuid NOT NULL,
  item_id text NOT NULL,
  title text,
  weight integer,
  norma text,
  risco text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, item_id)
);
ALTER TABLE public.item_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view overrides" ON public.item_overrides FOR SELECT
  USING (public.is_client_member(client_id, auth.uid()));
CREATE POLICY "Editors insert overrides" ON public.item_overrides FOR INSERT
  WITH CHECK (public.has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));
CREATE POLICY "Editors update overrides" ON public.item_overrides FOR UPDATE
  USING (public.has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));
CREATE POLICY "Editors delete overrides" ON public.item_overrides FOR DELETE
  USING (public.has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));

-- 2. Item images
CREATE TABLE public.item_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  item_id text NOT NULL,
  path text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_item_images_client_item ON public.item_images(client_id, item_id);
ALTER TABLE public.item_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members view images" ON public.item_images FOR SELECT
  USING (public.is_client_member(client_id, auth.uid()));
CREATE POLICY "Editors insert images" ON public.item_images FOR INSERT
  WITH CHECK (public.has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));
CREATE POLICY "Editors delete images" ON public.item_images FOR DELETE
  USING (public.has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));

-- 3. Snapshot enhancements
ALTER TABLE public.monthly_snapshots
  ADD COLUMN note text,
  ADD COLUMN is_baseline boolean NOT NULL DEFAULT false;

-- Allow editors to update notes
CREATE POLICY "Editors update snapshots" ON public.monthly_snapshots FOR UPDATE
  USING (public.has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));
CREATE POLICY "Editors delete snapshots" ON public.monthly_snapshots FOR DELETE
  USING (public.has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));

-- 4. Storage bucket for checklist images (public read; member-only write/delete)
INSERT INTO storage.buckets (id, name, public) VALUES ('checklist-images','checklist-images', true)
  ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read checklist images" ON storage.objects FOR SELECT
  USING (bucket_id = 'checklist-images');

CREATE POLICY "Members upload checklist images" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'checklist-images'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.client_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.client_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Members delete checklist images" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'checklist-images'
    AND EXISTS (
      SELECT 1 FROM public.client_members cm
      WHERE cm.user_id = auth.uid()
        AND cm.client_id::text = (storage.foldername(name))[1]
    )
  );

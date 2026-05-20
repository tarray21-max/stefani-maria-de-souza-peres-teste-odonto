CREATE TABLE IF NOT EXISTS public.checklist_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  item_ids text[] NOT NULL DEFAULT '{}',
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view checklist blocks" ON public.checklist_blocks;
DROP POLICY IF EXISTS "Editors insert checklist blocks" ON public.checklist_blocks;
DROP POLICY IF EXISTS "Editors update checklist blocks" ON public.checklist_blocks;
DROP POLICY IF EXISTS "Editors delete checklist blocks" ON public.checklist_blocks;

CREATE POLICY "Members view checklist blocks"
ON public.checklist_blocks
FOR SELECT
TO authenticated
USING (is_client_member(client_id, auth.uid()));

CREATE POLICY "Editors insert checklist blocks"
ON public.checklist_blocks
FOR INSERT
TO authenticated
WITH CHECK (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]));

CREATE POLICY "Editors update checklist blocks"
ON public.checklist_blocks
FOR UPDATE
TO authenticated
USING (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]))
WITH CHECK (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]));

CREATE POLICY "Editors delete checklist blocks"
ON public.checklist_blocks
FOR DELETE
TO authenticated
USING (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]));

CREATE INDEX IF NOT EXISTS idx_checklist_blocks_client_category ON public.checklist_blocks (client_id, category, position);

DROP TRIGGER IF EXISTS update_checklist_blocks_updated_at ON public.checklist_blocks;
CREATE TRIGGER update_checklist_blocks_updated_at
BEFORE UPDATE ON public.checklist_blocks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.service_matrix_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  name text NOT NULL,
  area text NOT NULL DEFAULT 'ambas' CHECK (area IN ('medica', 'odontologica', 'ambas')),
  is_default boolean NOT NULL DEFAULT false,
  default_key text,
  disabled boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (client_id, default_key)
);

ALTER TABLE public.service_matrix_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members view service matrix items" ON public.service_matrix_items;
DROP POLICY IF EXISTS "Editors insert service matrix items" ON public.service_matrix_items;
DROP POLICY IF EXISTS "Editors update service matrix items" ON public.service_matrix_items;
DROP POLICY IF EXISTS "Editors delete service matrix items" ON public.service_matrix_items;

CREATE POLICY "Members view service matrix items"
ON public.service_matrix_items
FOR SELECT
TO authenticated
USING (is_client_member(client_id, auth.uid()));

CREATE POLICY "Editors insert service matrix items"
ON public.service_matrix_items
FOR INSERT
TO authenticated
WITH CHECK (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]));

CREATE POLICY "Editors update service matrix items"
ON public.service_matrix_items
FOR UPDATE
TO authenticated
USING (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]))
WITH CHECK (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]));

CREATE POLICY "Editors delete service matrix items"
ON public.service_matrix_items
FOR DELETE
TO authenticated
USING (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]));

CREATE INDEX IF NOT EXISTS idx_service_matrix_items_client_position ON public.service_matrix_items (client_id, position);

DROP TRIGGER IF EXISTS update_service_matrix_items_updated_at ON public.service_matrix_items;
CREATE TRIGGER update_service_matrix_items_updated_at
BEFORE UPDATE ON public.service_matrix_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
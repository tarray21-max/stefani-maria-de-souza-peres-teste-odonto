CREATE TABLE public.item_positions (
  client_id UUID NOT NULL,
  item_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, item_id)
);

CREATE INDEX idx_item_positions_client ON public.item_positions(client_id);

ALTER TABLE public.item_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members view positions"
  ON public.item_positions FOR SELECT
  USING (is_client_member(client_id, auth.uid()));

CREATE POLICY "Editors insert positions"
  ON public.item_positions FOR INSERT
  WITH CHECK (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]));

CREATE POLICY "Editors update positions"
  ON public.item_positions FOR UPDATE
  USING (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]));

CREATE POLICY "Editors delete positions"
  ON public.item_positions FOR DELETE
  USING (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]));

ALTER PUBLICATION supabase_realtime ADD TABLE public.item_positions;
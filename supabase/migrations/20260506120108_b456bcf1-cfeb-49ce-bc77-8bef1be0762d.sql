CREATE TABLE IF NOT EXISTS public.custom_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id uuid NOT NULL,
  category text NOT NULL CHECK (category IN ('assistencial','trabalhista','sanitaria')),
  title text NOT NULL,
  weight integer NOT NULL DEFAULT 5 CHECK (weight BETWEEN 1 AND 10),
  norma text,
  risco text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members view custom items" ON public.custom_items;
DROP POLICY IF EXISTS "Editors insert custom items" ON public.custom_items;
DROP POLICY IF EXISTS "Editors update custom items" ON public.custom_items;
DROP POLICY IF EXISTS "Editors delete custom items" ON public.custom_items;
CREATE POLICY "Members view custom items" ON public.custom_items FOR SELECT USING (is_client_member(client_id, auth.uid()));
CREATE POLICY "Editors insert custom items" ON public.custom_items FOR INSERT WITH CHECK (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));
CREATE POLICY "Editors update custom items" ON public.custom_items FOR UPDATE USING (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));
CREATE POLICY "Editors delete custom items" ON public.custom_items FOR DELETE USING (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));
DROP TRIGGER IF EXISTS trg_custom_items_updated ON public.custom_items;
CREATE TRIGGER trg_custom_items_updated BEFORE UPDATE ON public.custom_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.disabled_items (
  client_id uuid NOT NULL,
  item_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (client_id, item_id)
);
ALTER TABLE public.disabled_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Members view disabled" ON public.disabled_items;
DROP POLICY IF EXISTS "Editors insert disabled" ON public.disabled_items;
DROP POLICY IF EXISTS "Editors delete disabled" ON public.disabled_items;
CREATE POLICY "Members view disabled" ON public.disabled_items FOR SELECT USING (is_client_member(client_id, auth.uid()));
CREATE POLICY "Editors insert disabled" ON public.disabled_items FOR INSERT WITH CHECK (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));
CREATE POLICY "Editors delete disabled" ON public.disabled_items FOR DELETE USING (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role,'editor'::member_role]));

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.disabled_items;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE OR REPLACE FUNCTION public.visitor_get_state(_token text)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_link record;
  v_client jsonb;
  v_responses jsonb;
  v_custom jsonb;
  v_disabled jsonb;
BEGIN
  SELECT * INTO v_link FROM public.visitor_links WHERE token = _token LIMIT 1;
  IF v_link IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN RAISE EXCEPTION 'expired'; END IF;

  SELECT to_jsonb(c) - 'owner_id' INTO v_client FROM public.clients c WHERE c.id = v_link.client_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(r)), '[]'::jsonb) INTO v_responses FROM public.responses r WHERE r.client_id = v_link.client_id;
  SELECT COALESCE(jsonb_agg(to_jsonb(ci)), '[]'::jsonb) INTO v_custom FROM public.custom_items ci WHERE ci.client_id = v_link.client_id;
  SELECT COALESCE(jsonb_agg(item_id), '[]'::jsonb) INTO v_disabled FROM public.disabled_items WHERE client_id = v_link.client_id;

  RETURN jsonb_build_object(
    'client_id', v_link.client_id,
    'mode', v_link.mode,
    'client', v_client,
    'responses', v_responses,
    'custom_items', v_custom,
    'disabled_items', v_disabled
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.visitor_set_answer(_token text, _item_id text, _answer text, _quality text, _justification text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_link record;
BEGIN
  SELECT * INTO v_link FROM public.visitor_links WHERE token = _token LIMIT 1;
  IF v_link IS NULL THEN RAISE EXCEPTION 'invalid token'; END IF;
  IF v_link.expires_at IS NOT NULL AND v_link.expires_at < now() THEN RAISE EXCEPTION 'expired'; END IF;
  IF v_link.mode <> 'edit' THEN RAISE EXCEPTION 'read-only link'; END IF;

  INSERT INTO public.responses(client_id, item_id, answer, quality, justification)
  VALUES (v_link.client_id, _item_id, NULLIF(_answer,'')::answer_value, NULLIF(_quality,'')::quality_value, NULLIF(_justification, ''))
  ON CONFLICT (client_id, item_id) DO UPDATE
    SET answer = EXCLUDED.answer,
        quality = EXCLUDED.quality,
        justification = EXCLUDED.justification,
        updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.visitor_get_state(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.visitor_set_answer(text, text, text, text, text) TO anon, authenticated;
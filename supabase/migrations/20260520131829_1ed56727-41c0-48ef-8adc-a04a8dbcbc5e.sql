ALTER TABLE public.custom_items DROP CONSTRAINT IF EXISTS custom_items_category_check;
ALTER TABLE public.custom_items ADD CONSTRAINT custom_items_category_check
  CHECK (category = ANY (ARRAY['documentacao'::text, 'infraestrutura'::text, 'procedimentos'::text, 'higienizacao'::text, 'cme'::text]))
  NOT VALID;
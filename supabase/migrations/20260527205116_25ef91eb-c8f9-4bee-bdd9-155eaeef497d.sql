
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS areas text[] NOT NULL DEFAULT ARRAY[]::text[];

UPDATE public.clients
  SET areas = ARRAY[area::text]
  WHERE cardinality(areas) = 0;

ALTER TABLE public.clients
  DROP CONSTRAINT IF EXISTS clients_areas_valid;

ALTER TABLE public.clients
  ADD CONSTRAINT clients_areas_valid CHECK (
    areas <@ ARRAY['odontologia','medicina','biomedicina']::text[]
    AND cardinality(areas) >= 1
  );

ALTER TYPE tipo_contrato ADD VALUE IF NOT EXISTS 'assessoria_medica';

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS especialidades text[] NOT NULL DEFAULT ARRAY[]::text[];
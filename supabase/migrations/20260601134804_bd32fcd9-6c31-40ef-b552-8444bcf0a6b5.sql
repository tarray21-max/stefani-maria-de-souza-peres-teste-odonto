ALTER TABLE public.responses
  ADD COLUMN IF NOT EXISTS validity_date date,
  ADD COLUMN IF NOT EXISTS validity_indeterminate boolean NOT NULL DEFAULT false;
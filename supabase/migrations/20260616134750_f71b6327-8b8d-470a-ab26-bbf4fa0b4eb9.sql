
CREATE TABLE public.service_category_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category text NOT NULL,
  norma text,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_id, category)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.service_category_info TO authenticated;
GRANT ALL ON public.service_category_info TO service_role;
ALTER TABLE public.service_category_info ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sci_select" ON public.service_category_info FOR SELECT TO authenticated USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "sci_insert" ON public.service_category_info FOR INSERT TO authenticated WITH CHECK (public.can_edit_client(client_id, auth.uid()));
CREATE POLICY "sci_update" ON public.service_category_info FOR UPDATE TO authenticated USING (public.can_edit_client(client_id, auth.uid())) WITH CHECK (public.can_edit_client(client_id, auth.uid()));
CREATE POLICY "sci_delete" ON public.service_category_info FOR DELETE TO authenticated USING (public.can_edit_client(client_id, auth.uid()));
CREATE TRIGGER update_service_category_info_updated_at BEFORE UPDATE ON public.service_category_info FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Split old combined category into two separate ones in existing items
UPDATE public.service_matrix_items
SET categories = (
  SELECT array_agg(DISTINCT cat ORDER BY cat) FROM unnest(
    array_remove(categories, 'cirurgiao_dentista_bucomaxilo_ceof')
    || ARRAY['cirurgiao_dentista_buco','cirurgiao_dentista_ceof']
  ) AS cat
)
WHERE 'cirurgiao_dentista_bucomaxilo_ceof' = ANY(categories);

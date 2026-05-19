ALTER PUBLICATION supabase_realtime ADD TABLE public.item_images;
ALTER PUBLICATION supabase_realtime ADD TABLE public.item_overrides;
ALTER TABLE public.item_images REPLICA IDENTITY FULL;
ALTER TABLE public.item_overrides REPLICA IDENTITY FULL;
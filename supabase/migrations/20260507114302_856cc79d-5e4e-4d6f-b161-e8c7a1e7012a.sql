-- Register the missing trigger so new clients automatically get an owner membership
DROP TRIGGER IF EXISTS on_client_created ON public.clients;
CREATE TRIGGER on_client_created
  AFTER INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_client();

-- Backfill: ensure existing clients have their owner as a member
INSERT INTO public.client_members (client_id, user_id, role)
SELECT id, owner_id, 'owner'::member_role
FROM public.clients
ON CONFLICT (client_id, user_id) DO NOTHING;

-- Revoke direct API access; functions still work inside RLS policies via SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.is_client_member(UUID, UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_client_role(UUID, UUID, member_role[]) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_client() FROM PUBLIC, anon, authenticated;

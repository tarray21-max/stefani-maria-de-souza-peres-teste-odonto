GRANT EXECUTE ON FUNCTION public.is_client_member(uuid, uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_client_role(uuid, uuid, public.member_role[]) TO anon, authenticated;
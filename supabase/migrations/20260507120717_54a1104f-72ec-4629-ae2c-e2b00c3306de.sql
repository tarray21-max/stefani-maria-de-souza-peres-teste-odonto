CREATE OR REPLACE FUNCTION public.whoami()
RETURNS jsonb
LANGUAGE sql
STABLE
AS $$
  SELECT jsonb_build_object(
    'auth_uid', auth.uid(),
    'jwt_claims', current_setting('request.jwt.claims', true),
    'jwt_sub', current_setting('request.jwt.claim.sub', true),
    'role', current_setting('role', true)
  );
$$;
GRANT EXECUTE ON FUNCTION public.whoami() TO anon, authenticated;
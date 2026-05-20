
-- 1. contract_types (per-user list)
CREATE TABLE public.contract_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  label text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, label)
);
ALTER TABLE public.contract_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner select contract_types" ON public.contract_types FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner insert contract_types" ON public.contract_types FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner update contract_types" ON public.contract_types FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner delete contract_types" ON public.contract_types FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- 2. clients.contract_type_label
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS contract_type_label text;

-- 3. client_invitations
CREATE TABLE public.client_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL,
  email text NOT NULL,
  role public.member_role NOT NULL DEFAULT 'viewer',
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz,
  UNIQUE (client_id, email)
);
CREATE INDEX idx_client_invitations_email ON public.client_invitations (lower(email));
ALTER TABLE public.client_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Editors view invitations of their clients" ON public.client_invitations
  FOR SELECT TO authenticated
  USING (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]));

CREATE POLICY "Invitee views own invitations" ON public.client_invitations
  FOR SELECT TO authenticated
  USING (lower(email) = lower(coalesce((auth.jwt() ->> 'email'), '')));

CREATE POLICY "Editors create invitations" ON public.client_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role])
    AND invited_by = auth.uid()
  );

CREATE POLICY "Editors delete invitations" ON public.client_invitations
  FOR DELETE TO authenticated
  USING (has_client_role(client_id, auth.uid(), ARRAY['owner'::member_role, 'editor'::member_role]));

-- 4. accept_client_invitations function
CREATE OR REPLACE FUNCTION public.accept_client_invitations()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text;
  v_uid uuid := auth.uid();
  v_count integer := 0;
  r record;
BEGIN
  IF v_uid IS NULL THEN RETURN 0; END IF;
  SELECT lower(coalesce((auth.jwt() ->> 'email'), '')) INTO v_email;
  IF v_email = '' THEN RETURN 0; END IF;

  FOR r IN
    SELECT id, client_id, role
    FROM public.client_invitations
    WHERE lower(email) = v_email AND accepted_at IS NULL
  LOOP
    INSERT INTO public.client_members (client_id, user_id, role)
    VALUES (r.client_id, v_uid, r.role)
    ON CONFLICT (client_id, user_id) DO UPDATE SET role = EXCLUDED.role;

    UPDATE public.client_invitations SET accepted_at = now() WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_client_invitations() TO authenticated;

-- 5. Realtime publication
DO $$
BEGIN
  PERFORM 1;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.clients; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.client_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.client_invitations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.contract_types; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_blocks; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.responses; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.disabled_items; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.item_overrides; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.item_positions; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

ALTER TABLE public.clients REPLICA IDENTITY FULL;
ALTER TABLE public.client_members REPLICA IDENTITY FULL;
ALTER TABLE public.client_invitations REPLICA IDENTITY FULL;
ALTER TABLE public.contract_types REPLICA IDENTITY FULL;
ALTER TABLE public.checklist_blocks REPLICA IDENTITY FULL;

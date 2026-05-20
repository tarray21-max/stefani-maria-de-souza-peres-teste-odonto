
-- =========================================
-- 1. ACCOUNT MEMBERS + ACCOUNT INVITATIONS
-- =========================================

CREATE TABLE IF NOT EXISTS public.account_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  member_id uuid NOT NULL,
  role public.member_role NOT NULL DEFAULT 'viewer',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, member_id)
);
ALTER TABLE public.account_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.account_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  email text NOT NULL,
  role public.member_role NOT NULL DEFAULT 'viewer',
  invited_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  accepted_at timestamptz
);
ALTER TABLE public.account_invitations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS account_invitations_email_idx ON public.account_invitations (lower(email));

-- =========================================
-- 2. CLIENT UI PREFS
-- =========================================
CREATE TABLE IF NOT EXISTS public.client_ui_prefs (
  client_id uuid PRIMARY KEY,
  tab_labels jsonb NOT NULL DEFAULT '{}'::jsonb,
  tab_order jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.client_ui_prefs ENABLE ROW LEVEL SECURITY;

-- =========================================
-- 3. HELPER FUNCTIONS
-- =========================================
CREATE OR REPLACE FUNCTION public.is_account_member(_owner_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner_id = _user_id OR EXISTS (
    SELECT 1 FROM public.account_members
    WHERE owner_id = _owner_id AND member_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_account_editor(_owner_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner_id = _user_id OR EXISTS (
    SELECT 1 FROM public.account_members
    WHERE owner_id = _owner_id AND member_id = _user_id
      AND role IN ('owner','editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_client(_client_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_members
    WHERE client_id = _client_id AND user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.account_members am ON am.owner_id = c.owner_id
    WHERE c.id = _client_id AND am.member_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_client(_client_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_members
    WHERE client_id = _client_id AND user_id = _user_id
      AND role IN ('owner','editor')
  ) OR EXISTS (
    SELECT 1 FROM public.clients c
    JOIN public.account_members am ON am.owner_id = c.owner_id
    WHERE c.id = _client_id AND am.member_id = _user_id
      AND am.role IN ('owner','editor')
  );
$$;

CREATE OR REPLACE FUNCTION public.accept_account_invitations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
    SELECT id, owner_id, role FROM public.account_invitations
    WHERE lower(email) = v_email AND accepted_at IS NULL
  LOOP
    INSERT INTO public.account_members (owner_id, member_id, role)
    VALUES (r.owner_id, v_uid, r.role)
    ON CONFLICT (owner_id, member_id) DO UPDATE SET role = EXCLUDED.role;

    UPDATE public.account_invitations SET accepted_at = now() WHERE id = r.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

-- =========================================
-- 4. RLS for account_members / account_invitations / client_ui_prefs
-- =========================================
DROP POLICY IF EXISTS "Owner manages account members select" ON public.account_members;
DROP POLICY IF EXISTS "Owner manages account members insert" ON public.account_members;
DROP POLICY IF EXISTS "Owner manages account members update" ON public.account_members;
DROP POLICY IF EXISTS "Owner manages account members delete" ON public.account_members;

CREATE POLICY "Owner manages account members select" ON public.account_members
  FOR SELECT TO authenticated USING (auth.uid() = owner_id OR auth.uid() = member_id);
CREATE POLICY "Owner manages account members insert" ON public.account_members
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner manages account members update" ON public.account_members
  FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner manages account members delete" ON public.account_members
  FOR DELETE TO authenticated USING (auth.uid() = owner_id OR auth.uid() = member_id);

DROP POLICY IF EXISTS "Owner manages account invitations select" ON public.account_invitations;
DROP POLICY IF EXISTS "Owner manages account invitations insert" ON public.account_invitations;
DROP POLICY IF EXISTS "Owner manages account invitations delete" ON public.account_invitations;
DROP POLICY IF EXISTS "Invitee views own account invitations" ON public.account_invitations;

CREATE POLICY "Owner manages account invitations select" ON public.account_invitations
  FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Owner manages account invitations insert" ON public.account_invitations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id AND invited_by = auth.uid());
CREATE POLICY "Owner manages account invitations delete" ON public.account_invitations
  FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "Invitee views own account invitations" ON public.account_invitations
  FOR SELECT TO authenticated USING (lower(email) = lower(coalesce(auth.jwt() ->> 'email','')));

DROP POLICY IF EXISTS "Members view ui prefs" ON public.client_ui_prefs;
DROP POLICY IF EXISTS "Editors insert ui prefs" ON public.client_ui_prefs;
DROP POLICY IF EXISTS "Editors update ui prefs" ON public.client_ui_prefs;
DROP POLICY IF EXISTS "Editors delete ui prefs" ON public.client_ui_prefs;

CREATE POLICY "Members view ui prefs" ON public.client_ui_prefs
  FOR SELECT TO authenticated USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Editors insert ui prefs" ON public.client_ui_prefs
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_client(client_id, auth.uid()));
CREATE POLICY "Editors update ui prefs" ON public.client_ui_prefs
  FOR UPDATE TO authenticated USING (public.can_edit_client(client_id, auth.uid()));
CREATE POLICY "Editors delete ui prefs" ON public.client_ui_prefs
  FOR DELETE TO authenticated USING (public.can_edit_client(client_id, auth.uid()));

-- =========================================
-- 5. Update existing RLS to honor account_members
-- =========================================

-- clients
DROP POLICY IF EXISTS "Members view their clients" ON public.clients;
CREATE POLICY "Members view their clients" ON public.clients
  FOR SELECT TO authenticated USING (
    public.is_client_member(id, auth.uid())
    OR public.is_account_member(owner_id, auth.uid())
  );

DROP POLICY IF EXISTS "Owners and editors update client" ON public.clients;
CREATE POLICY "Owners and editors update client" ON public.clients
  FOR UPDATE USING (
    public.has_client_role(id, auth.uid(), ARRAY['owner','editor']::member_role[])
    OR public.is_account_editor(owner_id, auth.uid())
  );

-- contract_types (per owner_id) — account members see/manage owner's types
DROP POLICY IF EXISTS "Owner select contract_types" ON public.contract_types;
DROP POLICY IF EXISTS "Owner insert contract_types" ON public.contract_types;
DROP POLICY IF EXISTS "Owner update contract_types" ON public.contract_types;
DROP POLICY IF EXISTS "Owner delete contract_types" ON public.contract_types;
CREATE POLICY "Members view contract_types" ON public.contract_types
  FOR SELECT TO authenticated USING (public.is_account_member(owner_id, auth.uid()));
CREATE POLICY "Editors insert contract_types" ON public.contract_types
  FOR INSERT TO authenticated WITH CHECK (public.is_account_editor(owner_id, auth.uid()) AND owner_id = COALESCE(owner_id, auth.uid()));
CREATE POLICY "Editors update contract_types" ON public.contract_types
  FOR UPDATE TO authenticated USING (public.is_account_editor(owner_id, auth.uid()));
CREATE POLICY "Editors delete contract_types" ON public.contract_types
  FOR DELETE TO authenticated USING (public.is_account_editor(owner_id, auth.uid()));

-- Helper macro tables: replace SELECT (is_client_member) and editor (has_client_role) with can_access/can_edit.
DO $$
DECLARE
  t text;
  -- tables with (client_id, *) using is_client_member for SELECT
  tables_member text[] := ARRAY[
    'custom_items','disabled_items','item_overrides','item_positions',
    'item_images','responses','checklist_blocks','service_matrix_items',
    'monthly_snapshots','reset_log','visitor_links','client_members'
  ];
BEGIN
  FOREACH t IN ARRAY tables_member LOOP
    -- Recreate SELECT policy to include account members
    EXECUTE format('DROP POLICY IF EXISTS "Members view %s" ON public.%I', t, t);
  END LOOP;
END $$;

-- Per-table SELECT (account-aware)
CREATE POLICY "Members view custom_items" ON public.custom_items
  FOR SELECT USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Members view disabled_items" ON public.disabled_items
  FOR SELECT USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Members view item_overrides" ON public.item_overrides
  FOR SELECT USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Members view item_positions" ON public.item_positions
  FOR SELECT USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Members view item_images" ON public.item_images
  FOR SELECT USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Members view responses" ON public.responses
  FOR SELECT USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Members view checklist_blocks" ON public.checklist_blocks
  FOR SELECT TO authenticated USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Members view service_matrix_items" ON public.service_matrix_items
  FOR SELECT TO authenticated USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Members view monthly_snapshots" ON public.monthly_snapshots
  FOR SELECT USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Members view reset_log" ON public.reset_log
  FOR SELECT USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Members view visitor_links" ON public.visitor_links
  FOR SELECT USING (public.can_access_client(client_id, auth.uid()));
CREATE POLICY "Members view client_members" ON public.client_members
  FOR SELECT USING (
    public.is_client_member(client_id, auth.uid())
    OR EXISTS (SELECT 1 FROM public.clients c
               JOIN public.account_members am ON am.owner_id = c.owner_id
               WHERE c.id = client_members.client_id AND am.member_id = auth.uid())
  );

-- Editor (insert/update/delete) replace has_client_role with can_edit_client
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'custom_items','disabled_items','item_overrides','item_positions',
        'item_images','responses','checklist_blocks','service_matrix_items',
        'monthly_snapshots','reset_log','visitor_links'
      )
      AND (policyname LIKE 'Editors %' OR policyname LIKE 'Owners %')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- Recreate editor policies via can_edit_client
DO $$
DECLARE
  t text;
  tables_edit text[] := ARRAY[
    'custom_items','disabled_items','item_overrides','item_positions',
    'item_images','responses','checklist_blocks','service_matrix_items',
    'monthly_snapshots','visitor_links'
  ];
BEGIN
  FOREACH t IN ARRAY tables_edit LOOP
    EXECUTE format('CREATE POLICY "Editors insert %s" ON public.%I FOR INSERT WITH CHECK (public.can_edit_client(client_id, auth.uid()))', t, t);
    EXECUTE format('CREATE POLICY "Editors delete %s" ON public.%I FOR DELETE USING (public.can_edit_client(client_id, auth.uid()))', t, t);
  END LOOP;
  -- UPDATE only for tables that support it
  FOREACH t IN ARRAY ARRAY['custom_items','item_overrides','item_positions','responses','checklist_blocks','service_matrix_items','monthly_snapshots']::text[] LOOP
    EXECUTE format('CREATE POLICY "Editors update %s" ON public.%I FOR UPDATE USING (public.can_edit_client(client_id, auth.uid())) WITH CHECK (public.can_edit_client(client_id, auth.uid()))', t, t);
  END LOOP;
END $$;

-- reset_log: insert only (special check)
CREATE POLICY "Editors insert reset log" ON public.reset_log
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.can_edit_client(client_id, auth.uid()));

-- =========================================
-- 6. Realtime
-- =========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.account_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.account_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_ui_prefs;


-- =========================================================
-- 1. PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- =========================================================
-- 2. updated_at helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 3. Auto-create profile on signup
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- 4. CLIENTS
-- =========================================================
CREATE TYPE public.area_atuacao AS ENUM ('odontologia', 'medicina');
CREATE TYPE public.tipo_contrato AS ENUM ('assessoria_odontologica', 'regularizacao_sanitaria');
CREATE TYPE public.member_role AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  profissional_responsavel TEXT,
  cnpj TEXT,
  area area_atuacao NOT NULL DEFAULT 'odontologia',
  especialidade TEXT,
  endereco TEXT,
  telefone TEXT,
  tipo_contrato tipo_contrato NOT NULL DEFAULT 'assessoria_odontologica',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 5. CLIENT_MEMBERS
-- =========================================================
CREATE TABLE public.client_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role member_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, user_id)
);
ALTER TABLE public.client_members ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_client_members_user ON public.client_members(user_id);
CREATE INDEX idx_client_members_client ON public.client_members(client_id);

-- =========================================================
-- 6. Security definer helpers (avoid recursive RLS)
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_client_member(_client_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_members
    WHERE client_id = _client_id AND user_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.has_client_role(_client_id UUID, _user_id UUID, _roles member_role[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.client_members
    WHERE client_id = _client_id AND user_id = _user_id AND role = ANY(_roles)
  );
$$;

-- =========================================================
-- 7. Auto-add owner as member when client created
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_client()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.client_members (client_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner')
  ON CONFLICT (client_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_client_created
  AFTER INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_client();

-- =========================================================
-- 8. CLIENTS RLS
-- =========================================================
CREATE POLICY "Members view their clients" ON public.clients
  FOR SELECT USING (public.is_client_member(id, auth.uid()));
CREATE POLICY "Authenticated users can create clients" ON public.clients
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners and editors update client" ON public.clients
  FOR UPDATE USING (public.has_client_role(id, auth.uid(), ARRAY['owner','editor']::member_role[]));
CREATE POLICY "Only owner deletes client" ON public.clients
  FOR DELETE USING (public.has_client_role(id, auth.uid(), ARRAY['owner']::member_role[]));

-- =========================================================
-- 9. CLIENT_MEMBERS RLS
-- =========================================================
CREATE POLICY "Members view membership of their clients" ON public.client_members
  FOR SELECT USING (public.is_client_member(client_id, auth.uid()));
CREATE POLICY "Owners manage members (insert)" ON public.client_members
  FOR INSERT WITH CHECK (
    public.has_client_role(client_id, auth.uid(), ARRAY['owner']::member_role[])
    OR (
      -- allow self-insert as owner during initial trigger (already covered by SECURITY DEFINER)
      user_id = auth.uid() AND role = 'owner'
    )
  );
CREATE POLICY "Owners manage members (update)" ON public.client_members
  FOR UPDATE USING (public.has_client_role(client_id, auth.uid(), ARRAY['owner']::member_role[]));
CREATE POLICY "Owners manage members (delete)" ON public.client_members
  FOR DELETE USING (public.has_client_role(client_id, auth.uid(), ARRAY['owner']::member_role[]));

-- =========================================================
-- 10. RESPONSES
-- =========================================================
CREATE TYPE public.answer_value AS ENUM ('sim', 'nao', 'na');
CREATE TYPE public.quality_value AS ENUM ('bom', 'ruim');

CREATE TABLE public.responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  answer answer_value,
  quality quality_value,
  justification TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, item_id)
);
ALTER TABLE public.responses ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_responses_client ON public.responses(client_id);

CREATE TRIGGER update_responses_updated_at
  BEFORE UPDATE ON public.responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Members view responses" ON public.responses
  FOR SELECT USING (public.is_client_member(client_id, auth.uid()));
CREATE POLICY "Editors insert responses" ON public.responses
  FOR INSERT WITH CHECK (public.has_client_role(client_id, auth.uid(), ARRAY['owner','editor']::member_role[]));
CREATE POLICY "Editors update responses" ON public.responses
  FOR UPDATE USING (public.has_client_role(client_id, auth.uid(), ARRAY['owner','editor']::member_role[]));
CREATE POLICY "Editors delete responses" ON public.responses
  FOR DELETE USING (public.has_client_role(client_id, auth.uid(), ARRAY['owner','editor']::member_role[]));

-- Realtime
ALTER TABLE public.responses REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.responses;

-- =========================================================
-- 11. MONTHLY SNAPSHOTS
-- =========================================================
CREATE TABLE public.monthly_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- format YYYY-MM
  score NUMERIC(5,2) NOT NULL,
  score_by_category JSONB NOT NULL DEFAULT '{}'::jsonb,
  total_sim INTEGER NOT NULL DEFAULT 0,
  total_nao INTEGER NOT NULL DEFAULT 0,
  total_na INTEGER NOT NULL DEFAULT 0,
  total_applicable INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (client_id, month)
);
ALTER TABLE public.monthly_snapshots ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_snapshots_client ON public.monthly_snapshots(client_id);

CREATE POLICY "Members view snapshots" ON public.monthly_snapshots
  FOR SELECT USING (public.is_client_member(client_id, auth.uid()));
CREATE POLICY "Editors insert snapshots" ON public.monthly_snapshots
  FOR INSERT WITH CHECK (public.has_client_role(client_id, auth.uid(), ARRAY['owner','editor']::member_role[]));

-- =========================================================
-- 12. VISITOR LINKS
-- =========================================================
CREATE TYPE public.visitor_mode AS ENUM ('view', 'edit');

CREATE TABLE public.visitor_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  mode visitor_mode NOT NULL DEFAULT 'view',
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.visitor_links ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_visitor_token ON public.visitor_links(token);

CREATE POLICY "Members view visitor links" ON public.visitor_links
  FOR SELECT USING (public.is_client_member(client_id, auth.uid()));
CREATE POLICY "Owners create visitor links" ON public.visitor_links
  FOR INSERT WITH CHECK (public.has_client_role(client_id, auth.uid(), ARRAY['owner','editor']::member_role[]));
CREATE POLICY "Owners delete visitor links" ON public.visitor_links
  FOR DELETE USING (public.has_client_role(client_id, auth.uid(), ARRAY['owner','editor']::member_role[]));

-- =========================================================
-- 13. RESET LOG
-- =========================================================
CREATE TABLE public.reset_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  justification TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.reset_log ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_reset_log_client ON public.reset_log(client_id);

CREATE POLICY "Members view reset log" ON public.reset_log
  FOR SELECT USING (public.is_client_member(client_id, auth.uid()));
CREATE POLICY "Editors insert reset log" ON public.reset_log
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND public.has_client_role(client_id, auth.uid(), ARRAY['owner','editor']::member_role[])
  );

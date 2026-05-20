import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";

export type MemberRole = "owner" | "editor" | "viewer";

export interface InvitationRow {
  id: string;
  client_id: string;
  email: string;
  role: MemberRole;
  invited_by: string;
  created_at: string;
  accepted_at: string | null;
}

export interface MemberRow {
  id: string;
  client_id: string;
  user_id: string;
  role: MemberRole;
  email?: string | null;
  display_name?: string | null;
}

export function useClientShare(clientId: string | null) {
  const { user } = useAuth();
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [invitations, setInvitations] = useState<InvitationRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    if (!clientId) {
      setMembers([]);
      setInvitations([]);
      setLoaded(true);
      return;
    }
    const [m, inv] = await Promise.all([
      supabase.from("client_members").select("id, client_id, user_id, role").eq("client_id", clientId),
      supabase
        .from("client_invitations" as never)
        .select("id, client_id, email, role, invited_by, created_at, accepted_at")
        .eq("client_id", clientId)
        .is("accepted_at", null),
    ]);

    const memberRows = ((m.data ?? []) as MemberRow[]);
    if (memberRows.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in(
          "user_id",
          memberRows.map((r) => r.user_id),
        );
      const byId = new Map((profs ?? []).map((p) => [p.user_id, p]));
      for (const r of memberRows) {
        const p = byId.get(r.user_id);
        r.email = p?.email ?? null;
        r.display_name = p?.display_name ?? null;
      }
    }
    setMembers(memberRows);
    setInvitations(((inv.data ?? []) as unknown) as InvitationRow[]);
    setLoaded(true);
  }, [clientId]);

  useEffect(() => {
    refresh();
    if (!clientId) return;
    const ch = supabase
      .channel(`share-${clientId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_members", filter: `client_id=eq.${clientId}` },
        () => refresh(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "client_invitations", filter: `client_id=eq.${clientId}` },
        () => refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [clientId, refresh]);

  const invite = useCallback(
    async (email: string, role: MemberRole) => {
      if (!clientId || !user) return { error: "no-context" } as const;
      const clean = email.trim().toLowerCase();
      if (!clean) return { error: "empty-email" } as const;
      const { error } = await supabase.from("client_invitations" as never).insert({
        client_id: clientId,
        email: clean,
        role,
        invited_by: user.id,
      } as never);
      if (error) return { error: error.message } as const;
      return { error: null } as const;
    },
    [clientId, user],
  );

  const cancelInvitation = useCallback(async (id: string) => {
    await supabase.from("client_invitations" as never).delete().eq("id", id);
  }, []);

  const removeMember = useCallback(async (id: string) => {
    await supabase.from("client_members").delete().eq("id", id);
  }, []);

  const changeRole = useCallback(async (id: string, role: MemberRole) => {
    await supabase.from("client_members").update({ role }).eq("id", id);
  }, []);

  return { members, invitations, loaded, invite, cancelInvitation, removeMember, changeRole };
}

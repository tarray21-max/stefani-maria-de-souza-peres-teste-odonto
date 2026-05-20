import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./auth-context";
import type { MemberRole } from "./use-invitations";

export interface AccountMemberRow {
  id: string;
  owner_id: string;
  member_id: string;
  role: MemberRole;
  email?: string | null;
  display_name?: string | null;
}

export interface AccountInvitationRow {
  id: string;
  owner_id: string;
  email: string;
  role: MemberRole;
  invited_by: string;
  created_at: string;
  accepted_at: string | null;
}

export function useAccountShare() {
  const { user } = useAuth();
  const [members, setMembers] = useState<AccountMemberRow[]>([]);
  const [invitations, setInvitations] = useState<AccountInvitationRow[]>([]);

  const refresh = useCallback(async () => {
    if (!user) {
      setMembers([]);
      setInvitations([]);
      return;
    }
    const [m, inv] = await Promise.all([
      supabase.from("account_members" as never).select("id, owner_id, member_id, role").eq("owner_id", user.id),
      supabase
        .from("account_invitations" as never)
        .select("id, owner_id, email, role, invited_by, created_at, accepted_at")
        .eq("owner_id", user.id)
        .is("accepted_at", null),
    ]);
    const rows = ((m.data ?? []) as unknown) as AccountMemberRow[];
    if (rows.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, email, display_name")
        .in("user_id", rows.map((r) => r.member_id));
      const byId = new Map((profs ?? []).map((p) => [p.user_id, p]));
      for (const r of rows) {
        const p = byId.get(r.member_id);
        r.email = p?.email ?? null;
        r.display_name = p?.display_name ?? null;
      }
    }
    setMembers(rows);
    setInvitations(((inv.data ?? []) as unknown) as AccountInvitationRow[]);
  }, [user]);

  useEffect(() => {
    refresh();
    if (!user) return;
    const ch = supabase
      .channel(`account-share-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "account_members", filter: `owner_id=eq.${user.id}` }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "account_invitations", filter: `owner_id=eq.${user.id}` }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, refresh]);

  const invite = useCallback(async (email: string, role: MemberRole) => {
    if (!user) return { error: "no-user" } as const;
    const clean = email.trim().toLowerCase();
    if (!clean) return { error: "empty-email" } as const;
    const { error } = await supabase.from("account_invitations" as never).insert({
      owner_id: user.id, email: clean, role, invited_by: user.id,
    } as never);
    if (error) return { error: error.message } as const;
    return { error: null } as const;
  }, [user]);

  const cancelInvitation = useCallback(async (id: string) => {
    await supabase.from("account_invitations" as never).delete().eq("id", id);
  }, []);
  const removeMember = useCallback(async (id: string) => {
    await supabase.from("account_members" as never).delete().eq("id", id);
  }, []);
  const changeRole = useCallback(async (id: string, role: MemberRole) => {
    await supabase.from("account_members" as never).update({ role } as never).eq("id", id);
  }, []);

  return { members, invitations, invite, cancelInvitation, removeMember, changeRole };
}

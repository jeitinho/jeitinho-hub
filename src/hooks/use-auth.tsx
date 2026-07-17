import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole =
  | "admin"
  | "manager"
  | "redacteur_chef"
  | "redacteur"
  | "auteur"
  | "guide"
  | "prestataire";

export type AccountStatus = "pending_validation" | "active" | "rejected";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [status, setStatus] = useState<AccountStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async (s: Session | null) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const [{ data: rolesRows }, { data: profile }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", s.user.id),
          supabase
            .from("profiles")
            .select("status")
            .eq("id", s.user.id)
            .maybeSingle(),
        ]);
        if (mounted) {
          setRoles((rolesRows ?? []).map((r) => r.role as AppRole));
          setStatus(((profile as { status?: AccountStatus } | null)?.status ?? "active") as AccountStatus);
        }
      } else {
        setRoles([]);
        setStatus(null);
      }
      if (mounted) setLoading(false);
    };

    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => load(s));
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const hasRole = (r: AppRole) => roles.includes(r);
  const isAdmin = hasRole("admin");
  const canManage = isAdmin || hasRole("manager");
  const canEditContent = canManage || hasRole("redacteur_chef") || hasRole("redacteur");
  const isPending = status === "pending_validation";
  const isRejected = status === "rejected";

  return {
    session,
    user,
    roles,
    status,
    loading,
    hasRole,
    isAdmin,
    canManage,
    canEditContent,
    isPending,
    isRejected,
  };
}

export const MODULE_ACCESS: Record<string, AppRole[]> = {
  dashboard: ["admin", "manager", "redacteur_chef", "redacteur", "auteur", "guide", "prestataire"],
  crm: ["admin", "manager"],
  clients: ["admin", "manager"],
  voyages: ["admin", "manager", "guide"],
  devis: ["admin", "manager"],
  experiences: ["admin", "manager", "redacteur_chef", "redacteur"],
  contenus: ["admin", "manager", "redacteur_chef", "redacteur", "auteur"],
  blog: ["admin", "manager", "redacteur_chef", "redacteur", "auteur"],
  mediatheque: ["admin", "manager", "redacteur_chef", "redacteur"],
  partenaires: ["admin", "manager", "prestataire"],
  calendrier: ["admin", "manager", "redacteur_chef", "redacteur", "auteur", "guide"],
  analytics: ["admin", "manager"],
  parametres: ["admin", "manager"],
};

export function canAccessModule(module: keyof typeof MODULE_ACCESS, roles: AppRole[]) {
  return roles.some((r) => MODULE_ACCESS[module].includes(r));
}
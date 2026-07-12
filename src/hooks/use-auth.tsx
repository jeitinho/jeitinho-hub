import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "manager" | "redacteur" | "guide" | "prestataire";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async (s: Session | null) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        const { data } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", s.user.id);
        if (mounted) setRoles((data ?? []).map((r) => r.role as AppRole));
      } else {
        setRoles([]);
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
  const canEditContent = canManage || hasRole("redacteur");

  return { session, user, roles, loading, hasRole, isAdmin, canManage, canEditContent };
}

export const MODULE_ACCESS: Record<string, AppRole[]> = {
  dashboard: ["admin", "manager", "redacteur", "guide", "prestataire"],
  crm: ["admin", "manager"],
  clients: ["admin", "manager"],
  voyages: ["admin", "manager", "guide"],
  devis: ["admin", "manager"],
  experiences: ["admin", "manager", "redacteur"],
  contenus: ["admin", "manager", "redacteur"],
  blog: ["admin", "manager", "redacteur"],
  mediatheque: ["admin", "manager", "redacteur"],
  partenaires: ["admin", "manager", "prestataire"],
  calendrier: ["admin", "manager", "redacteur", "guide"],
  analytics: ["admin", "manager"],
  parametres: ["admin"],
};

export function canAccessModule(module: keyof typeof MODULE_ACCESS, roles: AppRole[]) {
  return roles.some((r) => MODULE_ACCESS[module].includes(r));
}
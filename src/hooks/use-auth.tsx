import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole =
  | "admin"
  | "manager"
  | "redacteur_chef"
  | "redacteur"
  | "auteur"
  | "guide"
  | "prestataire";

export type AccountStatus = "pending_validation" | "active" | "rejected" | "suspended";

export type AuthUser = {
  id: string;
  email: string;
  fullName: string | null;
  status: AccountStatus;
  roles: AppRole[];
};

// The Hub's real login goes through an httpOnly cookie (see src/routes/auth.tsx),
// which the browser's Supabase SDK never sees on its own. Without a bridged
// session, every supabase.from(...) call from the browser runs as the anon
// role and gets silently empty-filtered by RLS. New logins bridge immediately
// (auth.tsx); this covers sessions that started before that existed.
async function bridgeSupabaseSession() {
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const response = await fetch("/api/auth/session", { credentials: "include" }).catch(() => null);
  if (!response?.ok) return;
  const body = await response.json().catch(() => null);
  if (body?.session?.access_token && body?.session?.refresh_token) {
    await supabase.auth.setSession({ access_token: body.session.access_token, refresh_token: body.session.refresh_token });
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch("/api/auth/me", { credentials: "include" })
      .then(async (response) => {
        const body = await response.json().catch(() => null);
        if (!mounted) return;
        setUser(response.ok && body?.user ? body.user : null);
        if (response.ok && body?.user) void bridgeSupabaseSession();
      })
      .catch(() => {
        if (mounted) setUser(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const roles = user?.roles ?? [];
  const hasRole = (r: AppRole) => roles.includes(r);
  const isAdmin = hasRole("admin");
  const canManage = isAdmin || hasRole("manager");
  const canEditContent = canManage || hasRole("redacteur_chef") || hasRole("redacteur");
  const isPending = user?.status === "pending_validation";
  const isRejected = user?.status === "rejected";

  return {
    user,
    roles,
    status: user?.status ?? null,
    loading,
    hasRole,
    isAdmin,
    canManage,
    canEditContent,
    isPending: Boolean(isPending),
    isRejected: Boolean(isRejected),
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
  services: ["admin", "manager"],
  billetterie: ["admin", "manager"],
  calendrier: ["admin", "manager", "redacteur_chef", "redacteur", "auteur", "guide"],
  analytics: ["admin", "manager"],
  parametres: ["admin", "manager"],
};

export function canAccessModule(module: string, roles: AppRole[]) {
  return (MODULE_ACCESS[module] ?? []).some((role) => roles.includes(role));
}

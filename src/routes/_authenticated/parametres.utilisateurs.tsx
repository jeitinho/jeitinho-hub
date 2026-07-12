import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/parametres/utilisateurs")({
  component: UsersPage,
  head: () => ({ meta: [{ title: "Utilisateurs — JEITINHO" }] }),
});

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrateur", manager: "Manager", redacteur: "Rédacteur", guide: "Guide", prestataire: "Prestataire",
};

function UsersPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id,email,full_name,is_active,last_seen_at,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("user_id,role");
      return profiles.map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Les nouveaux comptes se créent depuis l'écran de connexion. Le premier compte est Admin, les suivants Manager par défaut.
        </p>
      </div>
      <Card className="border-border/60 divide-y divide-border/60">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
        ) : (
          data?.map((u) => (
            <div key={u.id} className="flex items-center gap-4 p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {(u.full_name?.[0] ?? u.email[0]).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{u.full_name ?? u.email}</div>
                <div className="text-xs text-muted-foreground">{u.email}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {u.roles.length ? (
                  u.roles.map((r) => (<span key={r} className="pill">{ROLE_LABEL[r] ?? r}</span>))
                ) : (
                  <span className="pill">Aucun rôle</span>
                )}
              </div>
              <span className={`pill ${u.is_active ? "" : "opacity-50"}`}>{u.is_active ? "Actif" : "Désactivé"}</span>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
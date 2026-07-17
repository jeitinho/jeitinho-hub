import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { uploadAvatar } from "@/lib/avatars";
import { useAvatarUrl } from "@/hooks/use-avatar-url";
import type { AppRole, AccountStatus } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/parametres/utilisateurs")({
  component: UsersPage,
  head: () => ({ meta: [{ title: "Utilisateurs — JEITINHO" }] }),
});

type RoleCatalog = { code: string; label: string; description: string | null; is_active: boolean; sort_order: number };
type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  status: AccountStatus;
  created_at: string;
};
type UserWithRoles = ProfileRow & { roles: AppRole[] };

function useRolesCatalog() {
  return useQuery({
    queryKey: ["roles-catalog"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("roles")
        .select("code,label,description,is_active,sort_order")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as RoleCatalog[];
    },
  });
}

function useUsersWithRoles() {
  return useQuery({
    queryKey: ["users-with-roles"],
    queryFn: async () => {
      const { data: profiles, error } = await (supabase as any)
        .from("profiles")
        .select("id,email,full_name,avatar_url,is_active,status,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("user_id,role");
      return (profiles ?? []).map((p: ProfileRow) => ({
        ...p,
        roles: (roles ?? []).filter((r: any) => r.user_id === p.id).map((r: any) => r.role as AppRole),
      })) as UserWithRoles[];
    },
  });
}

function UsersPage() {
  const qc = useQueryClient();
  const catalog = useRolesCatalog();
  const users = useUsersWithRoles();

  const pending = (users.data ?? []).filter((u) => u.status === "pending_validation");
  const validated = (users.data ?? []).filter((u) => u.status !== "pending_validation");

  const toggleRoleActive = useMutation({
    mutationFn: async ({ code, is_active }: { code: string; is_active: boolean }) => {
      const { error } = await (supabase as any).from("roles").update({ is_active }).eq("code", code);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles-catalog"] }),
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-3 text-lg" style={{ fontFamily: "Fraunces, serif" }}>Catalogue de rôles</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Activez ou désactivez les rôles proposés lors de la validation d'un compte.
        </p>
        <Card className="border-border/60 divide-y divide-border/60">
          {catalog.isLoading ? (
            <div className="p-4 text-sm text-muted-foreground">Chargement…</div>
          ) : (
            catalog.data?.map((r) => (
              <div key={r.code} className="flex items-center gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{r.label}</div>
                  {r.description && <div className="text-xs text-muted-foreground">{r.description}</div>}
                </div>
                <Switch
                  checked={r.is_active}
                  onCheckedChange={(v) => toggleRoleActive.mutate({ code: r.code, is_active: v })}
                />
              </div>
            ))
          )}
        </Card>
      </section>

      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>Comptes en attente</h2>
          {pending.length > 0 && <span className="pill">{pending.length}</span>}
        </div>
        {pending.length === 0 ? (
          <Card className="border-border/60 p-6 text-sm text-muted-foreground">Aucun compte en attente.</Card>
        ) : (
          <div className="space-y-4">
            {pending.map((u) => (
              <PendingCard key={u.id} user={u} catalog={catalog.data ?? []} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg" style={{ fontFamily: "Fraunces, serif" }}>Tous les comptes</h2>
        <Card className="border-border/60 divide-y divide-border/60">
          {users.isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Chargement…</div>
          ) : (
            validated.map((u) => (
              <UserRow key={u.id} user={u} catalog={catalog.data ?? []} />
            ))
          )}
        </Card>
      </section>
    </div>
  );
}

function PendingCard({ user, catalog }: { user: UserWithRoles; catalog: RoleCatalog[] }) {
  const qc = useQueryClient();
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [selectedRoles, setSelectedRoles] = useState<Set<string>>(new Set());
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const activeRoles = catalog.filter((r) => r.is_active);

  const toggle = (code: string) => {
    setSelectedRoles((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const validate = async () => {
    if (!fullName.trim()) return toast.error("Le nom est obligatoire.");
    if (!file && !user.avatar_url) return toast.error("La photo est obligatoire.");
    if (selectedRoles.size === 0) return toast.error("Sélectionnez au moins un rôle.");
    setBusy(true);
    try {
      let avatarPath = user.avatar_url;
      if (file) avatarPath = await uploadAvatar(user.id, file);

      const { error: pErr } = await (supabase as any)
        .from("profiles")
        .update({ full_name: fullName.trim(), avatar_url: avatarPath, status: "active", is_active: true })
        .eq("id", user.id);
      if (pErr) throw pErr;

      const rows = Array.from(selectedRoles).map((role) => ({ user_id: user.id, role }));
      const { error: rErr } = await (supabase as any).from("user_roles").insert(rows);
      if (rErr) throw rErr;

      toast.success("Compte validé.");
      qc.invalidateQueries({ queryKey: ["users-with-roles"] });
      qc.invalidateQueries({ queryKey: ["pending-users-count"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const reject = async () => {
    setBusy(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ status: "rejected", is_active: false })
      .eq("id", user.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Compte refusé.");
    qc.invalidateQueries({ queryKey: ["users-with-roles"] });
    qc.invalidateQueries({ queryKey: ["pending-users-count"] });
  };

  return (
    <Card className="border-border/60 p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-medium">{user.email}</div>
          <div className="text-xs text-muted-foreground">Inscrit le {new Date(user.created_at).toLocaleDateString("fr-FR")}</div>
        </div>
        <span className="pill">En attente</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom complet</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Photo (obligatoire)</Label>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-2 file:text-xs file:text-primary hover:file:bg-primary/20"
            />
            {file && <div className="text-xs text-muted-foreground">{file.name}</div>}
          </div>
        </div>
        <div>
          <Label className="mb-2 block">Rôles</Label>
          <div className="space-y-2">
            {activeRoles.map((r) => (
              <label key={r.code} className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={selectedRoles.has(r.code)}
                  onCheckedChange={() => toggle(r.code)}
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <Button onClick={validate} disabled={busy} className="btn-primary">Valider le compte</Button>
        <Button onClick={reject} disabled={busy} variant="outline">Refuser</Button>
      </div>
    </Card>
  );
}

function UserRow({ user, catalog }: { user: UserWithRoles; catalog: RoleCatalog[] }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const avatarUrl = useAvatarUrl(user.avatar_url);
  const activeRoles = catalog.filter((r) => r.is_active || user.roles.includes(r.code as AppRole));

  const toggleRole = async (code: AppRole) => {
    const has = user.roles.includes(code);
    if (has) {
      const { error } = await (supabase as any)
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .eq("role", code);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await (supabase as any)
        .from("user_roles")
        .insert({ user_id: user.id, role: code });
      if (error) return toast.error(error.message);
    }
    qc.invalidateQueries({ queryKey: ["users-with-roles"] });
  };

  const statusLabel: Record<AccountStatus, string> = {
    active: "Actif",
    pending_validation: "En attente",
    rejected: "Refusé",
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-4">
        <div className="h-9 w-9 overflow-hidden rounded-full bg-primary/10">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-primary">
              {(user.full_name?.[0] ?? user.email[0]).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{user.full_name ?? user.email}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </div>
        <div className="flex flex-wrap justify-end gap-1">
          {user.roles.length ? (
            user.roles.map((r) => (
              <span key={r} className="pill">
                {catalog.find((c) => c.code === r)?.label ?? r}
              </span>
            ))
          ) : (
            <span className="pill opacity-60">Aucun rôle</span>
          )}
        </div>
        <span className={`pill ${user.status === "active" ? "" : "opacity-50"}`}>{statusLabel[user.status]}</span>
        <Button variant="ghost" size="sm" onClick={() => setEditing((v) => !v)}>
          {editing ? "Fermer" : "Modifier"}
        </Button>
      </div>
      {editing && (
        <div className="mt-4 grid gap-2 rounded-md border border-border/60 bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeRoles.map((r) => (
            <label key={r.code} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={user.roles.includes(r.code as AppRole)}
                onCheckedChange={() => toggleRole(r.code as AppRole)}
              />
              <span>{r.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
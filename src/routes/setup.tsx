import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { bootstrapInitialAdmin } from "@/lib/setup/setup-admin.functions";

export const Route = createFileRoute("/setup")({
  ssr: false,
  component: SetupPage,
  head: () => ({ meta: [
    { title: "Setup initial — JEITINHO Platform" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
});

function SetupPage() {
  const bootstrap = useServerFn(bootstrapInitialAdmin);
  const [email, setEmail] = useState("rafael@jeitinho.fr");
  const [fullName, setFullName] = useState("Rafael");
  const [setupKey, setSetupKey] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await bootstrap({ data: { email, fullName, setupKey, password } });
      if (!res.ok) return toast.error(res.error ?? "Échec");
      setDone(res.email);
      toast.success("Administrateur créé");
    } catch {
      toast.error("Impossible de terminer le setup.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-md space-y-6">
        <div>
          <p className="tracked text-[11px] text-muted-foreground">Setup initial</p>
          <h1 className="mt-2 text-2xl font-medium" style={{ fontFamily: "Fraunces, serif" }}>
            Créer le premier administrateur
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            À usage unique. Le setup se verrouille automatiquement dès qu'un administrateur existe.
            Le compte est créé directement dans Cloudflare D1.
          </p>
        </div>

        {done ? (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
            Administrateur créé pour <strong>{done}</strong>.
            <div className="mt-4">
              <Link to="/auth" className="text-primary underline">Aller à la connexion</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nom complet</Label>
              <Input id="fullName" type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de l'administrateur</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="10 caractères minimum"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setupKey">Clé d'installation</Label>
              <Input
                id="setupKey"
                type="password"
                required
                value={setupKey}
                onChange={(e) => setSetupKey(e.target.value)}
                placeholder="SETUP_KEY"
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Valeur du secret serveur <code>SETUP_KEY</code> configuré dans Cloudflare.
              </p>
            </div>
            <Button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "Création…" : "Créer l'administrateur"}
            </Button>
          </form>
        )}

        <p className="text-center text-xs text-muted-foreground">
          <Link to="/auth" className="hover:text-foreground">← Retour à la connexion</Link>
        </p>
      </div>
    </div>
  );
}

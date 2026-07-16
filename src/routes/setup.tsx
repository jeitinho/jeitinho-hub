import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { inviteInitialAdmin } from "@/lib/setup/setup-admin.functions";

export const Route = createFileRoute("/setup")({
  ssr: false,
  component: SetupPage,
  head: () => ({ meta: [
    { title: "Setup initial — JEITINHO Platform" },
    { name: "robots", content: "noindex,nofollow" },
  ] }),
});

function SetupPage() {
  const invite = useServerFn(inviteInitialAdmin);
  const [email, setEmail] = useState("rafael@jeitinho.fr");
  const [setupKey, setSetupKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const res = await invite({ data: { email, setupKey } });
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Échec");
    setDone(res.email);
    toast.success("Invitation envoyée");
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
            À usage unique. Se verrouille automatiquement une fois qu'un administrateur existe.
            Aucun mot de passe n'est généré : l'utilisateur reçoit un e-mail d'invitation pour
            définir le sien.
          </p>
        </div>

        {done ? (
          <div className="rounded-md border border-primary/30 bg-primary/5 p-4 text-sm">
            Invitation envoyée à <strong>{done}</strong>.
            <div className="mt-4">
              <Link to="/auth" className="text-primary underline">Aller à la connexion</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail de l'administrateur</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
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
                Valeur du secret serveur <code>SETUP_KEY</code>.
              </p>
            </div>
            <Button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? "…" : "Envoyer l'invitation"}
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
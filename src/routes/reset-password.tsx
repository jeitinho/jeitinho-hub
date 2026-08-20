import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { JeitinhoLogo } from "@/components/jeitinho-logo";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  component: ResetPasswordPage,
  head: () => ({ meta: [{ title: "Réinitialiser — JEITINHO Platform" }] }),
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const accessToken = params.get("access_token");
    if (accessToken && params.get("type") === "recovery") setRecoveryToken(accessToken);
  }, []);

  const onRequest = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    try {
      const response = await fetch("/api/auth/request-reset", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) return toast.error(body?.error ?? "Impossible de traiter la demande.");
      setSent(true); toast.success("Si ce compte existe, vous recevrez les instructions.");
    } catch { toast.error("Impossible de traiter la demande."); }
    finally { setLoading(false); }
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault(); if (!recoveryToken) return; setLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ accessToken: recoveryToken, password }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) return toast.error(body?.error ?? "Impossible de réinitialiser le mot de passe.");
      setDone(true); toast.success("Mot de passe mis à jour.");
    } catch { toast.error("Impossible de réinitialiser le mot de passe."); }
    finally { setLoading(false); }
  };

  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="w-full max-w-sm">
    <div className="mb-8 flex justify-center"><JeitinhoLogo className="h-8 w-auto" /></div>
    <h1 className="mb-3 text-center text-2xl" style={{ fontFamily: "Fraunces, serif" }}>{recoveryToken ? "Choisir un nouveau mot de passe" : "Réinitialiser le mot de passe"}</h1>
    {done ? <div className="space-y-4 text-center text-sm text-muted-foreground"><p>Votre mot de passe a été mis à jour.</p><Button className="btn-primary w-full" onClick={() => navigate({ to: "/auth" })}>Retour à la connexion</Button></div>
      : recoveryToken ? <form onSubmit={onReset} className="space-y-4"><div className="space-y-2"><Label htmlFor="new-password">Nouveau mot de passe</Label><Input id="new-password" type="password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} /></div><Button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "..." : "Mettre à jour"}</Button></form>
      : sent ? <div className="space-y-4 text-center text-sm text-muted-foreground"><p>Vérifiez votre boîte mail pour la suite.</p><Button variant="outline" className="w-full" onClick={() => navigate({ to: "/auth" })}>Retour à la connexion</Button></div>
      : <form onSubmit={onRequest} className="space-y-4"><div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div><Button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "..." : "Recevoir les instructions"}</Button></form>}
  </div></div>;
}

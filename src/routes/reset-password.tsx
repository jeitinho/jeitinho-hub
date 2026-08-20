import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
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
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) return toast.error(body?.error ?? "Impossible de traiter la demande.");
      setSent(true);
      toast.success("Si ce compte existe, vous recevrez les instructions.");
    } catch {
      toast.error("Impossible de traiter la demande.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><JeitinhoLogo className="h-8 w-auto" /></div>
        <h1 className="text-2xl mb-3 text-center" style={{ fontFamily: "Fraunces, serif" }}>Réinitialiser le mot de passe</h1>
        {sent ? (
          <div className="space-y-4 text-center text-sm text-muted-foreground">
            <p>Vérifiez votre boîte mail pour la suite.</p>
            <Button variant="outline" className="w-full" onClick={() => navigate({ to: "/auth" })}>Retour à la connexion</Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <Button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "..." : "Recevoir les instructions"}</Button>
          </form>
        )}
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Mot de passe mis à jour.");
    navigate({ to: "/dashboard", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center"><JeitinhoLogo className="h-8 w-auto" /></div>
        <h1 className="text-2xl mb-6 text-center" style={{ fontFamily: "Fraunces, serif" }}>Nouveau mot de passe</h1>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="pw">Mot de passe</Label>
            <Input id="pw" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "..." : "Mettre à jour"}
          </Button>
        </form>
      </div>
    </div>
  );
}
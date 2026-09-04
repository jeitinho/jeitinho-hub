import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { JeitinhoLogo } from "@/components/jeitinho-logo";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
  head: () => ({ meta: [{ title: "Connexion — JEITINHO Platform" }] }),
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" }).then((r) => {
      if (r.ok) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) return toast.error(body?.error ?? "Connexion impossible.");
      navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Connexion impossible.");
    } finally {
      setLoading(false);
    }
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password, fullName }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) return toast.error(body?.error ?? "Création impossible.");
      toast.success(body?.message ?? "Compte créé. Il sera activé après validation.");
      if (body?.active) navigate({ to: "/dashboard", replace: true });
    } catch {
      toast.error("Création impossible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-[oklch(0.204_0.008_60)] lg:block">
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(ellipse at 30% 20%, oklch(0.564 0.128 42.5 / 0.35), transparent 60%), radial-gradient(ellipse at 80% 90%, oklch(0.86 0.08 65 / 0.15), transparent 55%)" }} />
        <div className="relative flex h-full flex-col justify-between p-12 text-cream">
          <JeitinhoLogo className="h-8 w-auto" />
          <div>
            <p className="tracked mb-6 text-[11px] text-peach/80">Le back-office</p>
            <h1 className="text-cream max-w-md text-5xl font-medium leading-[1.1]" style={{ fontFamily: "Fraunces, serif" }}>
              Découvrez le Brésil <em className="text-peach not-italic" style={{ fontStyle: "italic" }}>autrement.</em>
            </h1>
            <p className="text-cream/60 mt-6 max-w-sm text-sm leading-relaxed">Le système d'exploitation complet de JEITINHO. Conciergerie, contenus, voyages, blog — une seule interface, une seule vérité.</p>
          </div>
          <p className="text-cream/40 text-xs">© {new Date().getFullYear()} JEITINHO BR</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center"><JeitinhoLogo className="h-8 w-auto" /></div>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 mb-6">
              <TabsTrigger value="signin" className="tracked text-[11px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3">Connexion</TabsTrigger>
              <TabsTrigger value="signup" className="tracked text-[11px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3">Créer un compte</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={onLogin} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="password">Mot de passe</Label><Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
                <Button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "..." : "Se connecter"}</Button>
                <p className="text-center text-xs text-muted-foreground"><Link to="/reset-password" className="hover:text-foreground">Mot de passe oublié ?</Link></p>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={onSignup} className="space-y-4">
                <div className="space-y-2"><Label htmlFor="name">Nom complet</Label><Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="email2">Email</Label><Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="password2">Mot de passe</Label><Input id="password2" type="password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} /><p className="text-xs text-muted-foreground">10 caractères minimum.</p></div>
                <Button type="submit" disabled={loading} className="btn-primary w-full">{loading ? "..." : "Créer mon compte"}</Button>
                <p className="text-xs text-muted-foreground text-center">Les nouveaux comptes attendent une validation administrateur avant accès au Hub.</p>
              </form>
            </TabsContent>
          </Tabs>
          <p className="mt-8 text-center text-xs text-muted-foreground"><Link to="/" className="hover:text-foreground">Retour</Link></p>
        </div>
      </div>
    </div>
  );
}

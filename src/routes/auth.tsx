import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { JeitinhoLogo } from "@/components/jeitinho-logo";

export const Route = createFileRoute("/auth")({
  ssr: false,
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
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard", replace: true });
  };

  const onSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin, data: { full_name: fullName } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Compte créé. Vous êtes connecté.");
    navigate({ to: "/dashboard", replace: true });
  };

  const onReset = async () => {
    if (!email) return toast.error("Renseignez votre email pour recevoir un lien.");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + "/reset-password",
    });
    if (error) toast.error(error.message);
    else toast.success("Un email de réinitialisation a été envoyé.");
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Left panel — brand */}
      <div className="relative hidden overflow-hidden bg-[oklch(0.204_0.008_60)] lg:block">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse at 30% 20%, oklch(0.564 0.128 42.5 / 0.35), transparent 60%), radial-gradient(ellipse at 80% 90%, oklch(0.86 0.08 65 / 0.15), transparent 55%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-cream">
          <JeitinhoLogo className="h-8 w-auto" />
          <div>
            <p className="tracked mb-6 text-[11px] text-peach/80">Le back-office</p>
            <h1 className="text-cream max-w-md text-5xl font-medium leading-[1.1]" style={{ fontFamily: "Fraunces, serif" }}>
              Découvrez le Brésil <em className="text-peach not-italic" style={{ fontStyle: "italic" }}>autrement.</em>
            </h1>
            <p className="text-cream/60 mt-6 max-w-sm text-sm leading-relaxed">
              Le système d'exploitation complet de JEITINHO. Conciergerie, contenus, voyages, blog — une seule interface, une seule vérité.
            </p>
          </div>
          <p className="text-cream/40 text-xs">© {new Date().getFullYear()} JEITINHO BR</p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex justify-center">
            <JeitinhoLogo className="h-8 w-auto" />
          </div>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2 bg-transparent p-0 mb-6">
              <TabsTrigger value="signin" className="tracked text-[11px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3">Connexion</TabsTrigger>
              <TabsTrigger value="signup" className="tracked text-[11px] rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3">Créer un compte</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={onLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Mot de passe</Label>
                    <button type="button" onClick={onReset} className="text-xs text-muted-foreground hover:text-primary">Oublié ?</button>
                  </div>
                  <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "..." : "Se connecter"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={onSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom complet</Label>
                  <Input id="name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email2">Email</Label>
                  <Input id="email2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password2">Mot de passe</Label>
                  <Input id="password2" type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
                </div>
                <Button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? "..." : "Créer mon compte"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Le premier compte créé devient Administrateur.
                </p>
              </form>
            </TabsContent>
          </Tabs>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:text-foreground">Retour</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
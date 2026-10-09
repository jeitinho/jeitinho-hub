import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/_authenticated/parametres")({
  component: Settings,
  head: () => ({ meta: [{ title: "Paramètres — JEITINHO" }] }),
});

function Settings() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <PageShell
      eyebrow="Système"
      title="Paramètres"
      description="Gestion des utilisateurs, rôles, intégrations et préférences."
    >
      <div className="mb-8 flex gap-6 border-b border-border/60">
        <TabLink to="/parametres" label="Vue d'ensemble" active={path === "/parametres"} />
        <TabLink
          to="/parametres/utilisateurs"
          label="Utilisateurs"
          active={path.startsWith("/parametres/utilisateurs")}
        />
      </div>
      {path === "/parametres" ? <Overview /> : <Outlet />}
    </PageShell>
  );
}

function TabLink({ to, label, active }: { to: string; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`tracked -mb-px border-b-2 pb-3 text-[11px] ${active ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}
    >
      {label}
    </Link>
  );
}

function Overview() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <Link
        to="/parametres/utilisateurs"
        className="rounded-lg border border-border/60 bg-card p-6 transition-colors hover:bg-muted/40"
      >
        <h3 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>
          Utilisateurs & rôles
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Administrateur, Manager, Rédacteur, Guide, Prestataire.
        </p>
      </Link>
    </div>
  );
}

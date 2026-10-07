import { createFileRoute, redirect, Outlet, useRouterState, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth, canAccessModule, MODULE_ACCESS } from "@/hooks/use-auth";
import { PendingValidationScreen } from "@/components/pending-validation-screen";
import { GlobalSearch } from "@/components/global-search";
import { MobileNav } from "@/components/mobile-nav";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    if (!response.ok) throw redirect({ to: "/auth" });
    return {};
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const title = pathnameToTitle(pathname);
  const { status, loading, isRejected, roles } = useAuth();
  const seg = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const allowed = loading || !(seg in MODULE_ACCESS) || canAccessModule(seg, roles);

  if (!loading && status && status !== "active") {
    return <PendingValidationScreen rejected={isRejected} />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="tracked text-[11px] text-muted-foreground">{title}</div>
            <div className="ml-auto">
              <GlobalSearch />
            </div>
          </header>
          <main className="flex-1 pb-20 md:pb-0">
            {allowed ? (
              <Outlet />
            ) : (
              <div className="mx-auto max-w-xl px-4 py-16 text-center">
                <p className="tracked mb-3 text-[10px] text-muted-foreground">Accès réservé</p>
                <p className="text-sm text-muted-foreground">
                  Cette page ne fait pas partie de ton espace.
                </p>
                <Link
                  to="/dashboard"
                  className="mt-4 inline-block text-sm text-primary underline-offset-2 hover:underline"
                >
                  Revenir à l'accueil
                </Link>
              </div>
            )}
          </main>
        </div>
      </div>
      <MobileNav />
    </SidebarProvider>
  );
}

function pathnameToTitle(p: string): string {
  const seg = p.split("/").filter(Boolean)[0] ?? "dashboard";
  const map: Record<string, string> = {
    dashboard: "Aujourd'hui",
    crm: "Demandes",
    clients: "Clients",
    voyages: "Voyages",
    devis: "Devis & Factures",
    experiences: "Expériences",
    contenus: "Planning éditorial",
    blog: "Blog",
    mediatheque: "Médiathèque",
    partenaires: "Partenaires",
    calendrier: "Calendrier",
    analytics: "Analytics",
    parametres: "Paramètres",
    "a-valider": "À valider",
    agents: "Agents",
    evenements: "Événements",
    whatsapp: "Groupe WhatsApp",
    manuel: "Manuel",
    distribution: "GetYourGuide",
    audience: "Audience",
    finances: "Finances",
    services: "Services",
    billetterie: "Billetterie",
  };
  return map[seg] ?? seg;
}

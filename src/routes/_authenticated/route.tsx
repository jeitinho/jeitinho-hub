import { createFileRoute, redirect, Outlet, useRouterState, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth, canAccessModule, MODULE_ACCESS, profileKind } from "@/hooks/use-auth";
import { pathnameToTitle } from "@/lib/nav-labels";
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
  const { status, loading, isRejected, roles, canManage } = useAuth();
  const title = pathnameToTitle(pathname, { canManage, kind: profileKind(roles) });
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

import { createFileRoute, redirect, Outlet, useRouterState, Link } from "@tanstack/react-router";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth, canAccessModule, MODULE_ACCESS, profileKind } from "@/hooks/use-auth";
import { pathnameToTitle } from "@/lib/nav-labels";
import { PendingValidationScreen } from "@/components/pending-validation-screen";
import { GlobalSearch } from "@/components/global-search";
import { MobileNav } from "@/components/mobile-nav";
import { useEffect } from "react";
import { startDomTranslation } from "@/lib/i18n";
import { syncLangWithProfile } from "@/lib/hub-lang-sync";
import { PwaSetup } from "@/components/pwa-setup";
import { ConfirmHost } from "@/components/confirm-dialog";

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
  const navigating = useRouterState({ select: (r) => r.status === "pending" });
  const { status, loading, isRejected, roles, canManage } = useAuth();
  const title = pathnameToTitle(pathname, { canManage, kind: profileKind(roles) });
  const seg = pathname.split("/").filter(Boolean)[0] ?? "dashboard";
  const allowed = loading || !(seg in MODULE_ACCESS) || canAccessModule(seg, roles);
  useEffect(() => startDomTranslation(), []);
  useEffect(() => {
    void syncLangWithProfile();
  }, []);

  if (!loading && status && status !== "active") {
    return <PendingValidationScreen rejected={isRejected} />;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-10 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-3 border-b border-border bg-card/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
            <div className="truncate text-[13.5px] font-semibold text-foreground">{title}</div>
            <div className="ml-auto">
              <GlobalSearch roles={roles} />
            </div>
            {/* Barre de progression pendant un changement de page */}
            <span
              aria-hidden
              className={`pointer-events-none absolute inset-x-0 bottom-[-1px] h-[2px] origin-left bg-primary transition-[transform,opacity] duration-500 ease-out ${
                navigating ? "scale-x-75 opacity-100" : "scale-x-100 opacity-0"
              }`}
            />
          </header>
          <PwaSetup />
          <ConfirmHost />
          <main className="flex-1 pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
            {allowed ? (
              <Outlet />
            ) : (
              <div className="mx-auto max-w-xl px-4 py-16 text-center">
                <p className="tracked mb-3 text-xs text-muted-foreground">Accès réservé</p>
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

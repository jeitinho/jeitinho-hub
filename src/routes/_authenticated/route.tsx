import { createFileRoute, redirect, Outlet, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/hooks/use-auth";
import { PendingValidationScreen } from "@/components/pending-validation-screen";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/auth" });
    return { userId: data.session.user.id };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const title = pathnameToTitle(pathname);
  const { status, loading, isRejected } = useAuth();

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
          </header>
          <main className="flex-1">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function pathnameToTitle(p: string): string {
  const seg = p.split("/").filter(Boolean)[0] ?? "dashboard";
  const map: Record<string, string> = {
    dashboard: "Dashboard",
    crm: "CRM",
    clients: "Clients",
    voyages: "Voyages",
    devis: "Devis",
    experiences: "Expériences",
    contenus: "Bibliothèque de contenus",
    blog: "Blog",
    mediatheque: "Médiathèque",
    partenaires: "Partenaires",
    calendrier: "Calendrier",
    analytics: "Analytics",
    parametres: "Paramètres",
  };
  return map[seg] ?? seg;
}
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  UserRound,
  Plane,
  FileText,
  Palmtree,
  Library,
  BookOpen,
  Images,
  Handshake,
  Calendar,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { JeitinhoLogo } from "./jeitinho-logo";
import { useAuth, canAccessModule, type AppRole } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

type Item = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; module: string };

const PILOTAGE: Item[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, module: "dashboard" },
  { title: "Calendrier", url: "/calendrier", icon: Calendar, module: "calendrier" },
  { title: "Analytics", url: "/analytics", icon: BarChart3, module: "analytics" },
];
const COMMERCIAL: Item[] = [
  { title: "CRM", url: "/crm", icon: Users, module: "crm" },
  { title: "Clients", url: "/clients", icon: UserRound, module: "clients" },
  { title: "Devis", url: "/devis", icon: FileText, module: "devis" },
  { title: "Voyages", url: "/voyages", icon: Plane, module: "voyages" },
];
const CONTENU: Item[] = [
  { title: "Expériences", url: "/experiences", icon: Palmtree, module: "experiences" },
  { title: "Blog", url: "/blog", icon: BookOpen, module: "blog" },
  { title: "Contenus", url: "/contenus", icon: Library, module: "contenus" },
  { title: "Médiathèque", url: "/mediatheque", icon: Images, module: "mediatheque" },
];
const RESEAU: Item[] = [
  { title: "Partenaires", url: "/partenaires", icon: Handshake, module: "partenaires" },
];

function useAllowed(roles: AppRole[]) {
  return (m: string) => canAccessModule(m as keyof typeof import("@/hooks/use-auth").MODULE_ACCESS, roles);
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { roles, user, isAdmin } = useAuth();
  const allowed = useAllowed(roles);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  const renderGroup = (label: string, items: Item[]) => {
    const visible = items.filter((i) => allowed(i.module));
    if (!visible.length) return null;
    return (
      <SidebarGroup>
        {!collapsed && <SidebarGroupLabel className="tracked text-[10px] text-muted-foreground/70">{label}</SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu>
            {visible.map((item) => {
              const active = path === item.url || path.startsWith(item.url + "/");
              return (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                    <Link to={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="border-b border-border/60 px-4 py-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <JeitinhoLogo className={collapsed ? "h-6 w-auto" : "h-7 w-auto"} />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-1">
        {renderGroup("Pilotage", PILOTAGE)}
        {renderGroup("Commercial", COMMERCIAL)}
        {renderGroup("Contenu", CONTENU)}
        {renderGroup("Réseau", RESEAU)}
        {isAdmin && (
          <SidebarGroup>
            {!collapsed && <SidebarGroupLabel className="tracked text-[10px] text-muted-foreground/70">Système</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={path.startsWith("/parametres")} tooltip="Paramètres">
                    <Link to="/parametres">
                      <Settings className="h-4 w-4" />
                      <span>Paramètres</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-border/60 p-3">
        {!collapsed && user && (
          <div className="mb-2 min-w-0 px-2">
            <div className="truncate text-xs font-medium text-foreground">{user.email}</div>
            <div className="tracked text-[10px] text-muted-foreground">{roles[0] ?? "membre"}</div>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Se déconnecter</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
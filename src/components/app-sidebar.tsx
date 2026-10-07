import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Sun,
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
  Wrench,
  Ticket,
  Settings,
  LogOut,
  ClipboardCheck,
  Bot,
  PartyPopper,
  MessageCircle,
  BookMarked,
  Store,
  Contact,
  Wallet,
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
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { JeitinhoLogo } from "./jeitinho-logo";
import { useAuth, canAccessModule, displayName } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { fetchSidebarBadges } from "@/lib/ops/cockpit";

type Item = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  module: string;
};

/* Menu rangé par pôle : le quotidien d'abord, puis chaque activité. */
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Aujourd'hui",
    items: [
      { title: "Cockpit", url: "/dashboard", icon: Sun, module: "dashboard" },
      { title: "À valider", url: "/a-valider", icon: ClipboardCheck, module: "a-valider" },
      { title: "Calendrier", url: "/calendrier", icon: Calendar, module: "calendrier" },
    ],
  },
  {
    label: "Conciergerie",
    items: [
      { title: "Demandes", url: "/crm", icon: Users, module: "crm" },
      { title: "Clients", url: "/clients", icon: UserRound, module: "clients" },
      { title: "Devis & factures", url: "/devis", icon: FileText, module: "devis" },
      { title: "Voyages", url: "/voyages", icon: Plane, module: "voyages" },
      { title: "GetYourGuide", url: "/distribution", icon: Store, module: "distribution" },
      { title: "Expériences", url: "/experiences", icon: Palmtree, module: "experiences" },
      { title: "Services", url: "/services", icon: Wrench, module: "services" },
    ],
  },
  {
    label: "Média",
    items: [
      { title: "Planning éditorial", url: "/contenus", icon: Library, module: "contenus" },
      { title: "Blog", url: "/blog", icon: BookOpen, module: "blog" },
      { title: "Groupe WhatsApp", url: "/whatsapp", icon: MessageCircle, module: "whatsapp" },
      { title: "Manuel", url: "/manuel", icon: BookMarked, module: "manuel" },
      { title: "Médiathèque", url: "/mediatheque", icon: Images, module: "mediatheque" },
    ],
  },
  {
    label: "Événements",
    items: [
      { title: "Soirées", url: "/evenements", icon: PartyPopper, module: "evenements" },
      { title: "Billetterie", url: "/billetterie", icon: Ticket, module: "billetterie" },
      { title: "Audience", url: "/audience", icon: Contact, module: "audience" },
    ],
  },
  {
    label: "Réseau",
    items: [{ title: "Partenaires", url: "/partenaires", icon: Handshake, module: "partenaires" }],
  },
  {
    label: "Pilotage",
    items: [
      { title: "Finances", url: "/finances", icon: Wallet, module: "finances" },
      { title: "Agents", url: "/agents", icon: Bot, module: "agents" },
      { title: "Analytics", url: "/analytics", icon: BarChart3, module: "analytics" },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { roles, user, canManage } = useAuth();
  const { data: badges = {} } = useQuery({
    queryKey: ["sidebar-badges"],
    queryFn: fetchSidebarBadges,
    enabled: canManage,
    refetchInterval: 120_000,
  });

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await supabase.auth.signOut().catch(() => undefined);
    window.location.href = "/auth";
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarHeader className="border-b border-border/60 px-4 py-4">
        <Link to="/dashboard" className="flex items-center gap-2">
          <JeitinhoLogo className={collapsed ? "h-6 w-auto" : "h-7 w-auto"} />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-1">
        {GROUPS.map((g) => {
          const visible = g.items.filter((i) => canAccessModule(i.module, roles));
          if (!visible.length) return null;
          return (
            <SidebarGroup key={g.label}>
              {!collapsed && (
                <SidebarGroupLabel className="tracked text-[10px] text-muted-foreground/70">
                  {g.label}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((item) => {
                    const active = path === item.url || path.startsWith(item.url + "/");
                    const badge = badges[item.module] ?? 0;
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>
                              {!canManage && item.module === "contenus"
                                ? "Mon planning"
                                : !canManage && item.module === "dashboard"
                                  ? "Accueil"
                                  : item.title}
                            </span>
                          </Link>
                        </SidebarMenuButton>
                        {badge > 0 && (
                          <SidebarMenuBadge className="bg-primary/15 text-primary">
                            {badge}
                          </SidebarMenuBadge>
                        )}
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
        {canManage && (
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="tracked text-[10px] text-muted-foreground/70">
                Système
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={path.startsWith("/parametres")}
                    tooltip="Paramètres"
                  >
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
            <div className="truncate text-xs font-medium text-foreground">{displayName(user)}</div>
            <div className="truncate text-[11px] text-muted-foreground">{user.email}</div>
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

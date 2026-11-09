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
  Handshake,
  Calendar,
  Wrench,
  Ticket,
  Settings,
  LogOut,
  Languages,
  ListChecks,
  Waypoints,
  ClipboardCheck,
  Bot,
  PartyPopper,
  MessageCircle,
  BookMarked,
  Store,
  Contact,
  Wallet,
  Scale,
  Send,
  Images,
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
import { useAuth, canAccessModule, displayName, profileKind } from "@/hooks/use-auth";
import { NAV_LABELS, navLabel } from "@/lib/nav-labels";
import { HUB_LANGS, getLang, setLang, t } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";
import { fetchSidebarBadges } from "@/lib/ops/cockpit";

type Item = {
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  module: string;
};

/*
 * Menu rangé par pôle : le quotidien d'abord, puis chaque activité.
 * Les noms viennent de NAV_LABELS (lib/nav-labels.ts), partagés avec le mobile et le titre.
 * Analytics (pas encore construit) est masqué du menu ; sa page reste.
 */
const GROUPS: { label: string; items: Item[] }[] = [
  {
    label: "Aujourd'hui",
    items: [
      { url: "/dashboard", icon: Sun, module: "dashboard" },
      { url: "/a-valider", icon: ClipboardCheck, module: "a-valider" },
      { url: "/calendrier", icon: Calendar, module: "calendrier" },
      { url: "/manifest", icon: ListChecks, module: "manifest" },
      { url: "/dispatch", icon: Waypoints, module: "dispatch" },
      { url: "/demandes", icon: Send, module: "demandes" },
    ],
  },
  {
    label: "Conciergerie",
    items: [
      { url: "/crm", icon: Users, module: "crm" },
      { url: "/clients", icon: UserRound, module: "clients" },
      { url: "/devis", icon: FileText, module: "devis" },
      { url: "/voyages", icon: Plane, module: "voyages" },
      { url: "/distribution", icon: Store, module: "distribution" },
      { url: "/experiences", icon: Palmtree, module: "experiences" },
      { url: "/services", icon: Wrench, module: "services" },
      { url: "/billetterie", icon: Ticket, module: "billetterie" },
    ],
  },
  {
    label: "Média",
    items: [
      { url: "/contenus", icon: Library, module: "contenus" },
      { url: "/blog", icon: BookOpen, module: "blog" },
      { url: "/whatsapp", icon: MessageCircle, module: "whatsapp" },
      { url: "/manuel", icon: BookMarked, module: "manuel" },
      { url: "/mediatheque", icon: Images, module: "mediatheque" },
    ],
  },
  {
    label: "Événements",
    items: [
      { url: "/evenements", icon: PartyPopper, module: "evenements" },
      { url: "/audience", icon: Contact, module: "audience" },
    ],
  },
  {
    label: "Réseau",
    items: [{ url: "/partenaires", icon: Handshake, module: "partenaires" }],
  },
  {
    label: "Pilotage",
    items: [
      { url: "/associes", icon: Scale, module: "associes" },
      { url: "/finances", icon: Wallet, module: "finances" },
      { url: "/agents", icon: Bot, module: "agents" },
    ],
  },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { roles, user, canManage, canOperate } = useAuth();
  const kind = profileKind(roles);
  const { data: badges = {} } = useQuery({
    queryKey: ["sidebar-badges"],
    queryFn: fetchSidebarBadges,
    enabled: canOperate,
    refetchInterval: 120_000,
  });

  const handleSignOut = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    await supabase.auth.signOut().catch(() => undefined);
    window.location.href = "/auth";
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="px-4 pb-3 pt-5">
        <Link to="/dashboard" className="flex items-center gap-2">
          <JeitinhoLogo className={collapsed ? "h-5 w-auto text-sidebar-foreground" : "h-6 w-auto text-sidebar-foreground"} />
        </Link>
      </SidebarHeader>
      <SidebarContent className="px-2">
        {GROUPS.map((g) => {
          const visible = g.items.filter((i) => canAccessModule(i.module, roles));
          if (!visible.length) return null;
          return (
            <SidebarGroup key={g.label}>
              {!collapsed && (
                <SidebarGroupLabel className="h-7 px-2 text-[11.5px] font-medium text-sidebar-foreground/45">
                  {t(g.label)}
                </SidebarGroupLabel>
              )}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map((item) => {
                    const active = path === item.url || path.startsWith(item.url + "/");
                    const badge = badges[item.module] ?? 0;
                    const title = navLabel(item.module, { canManage, kind });
                    return (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={active}
                          tooltip={title}
                          className="relative h-8 text-[13.5px] text-sidebar-foreground/75 hover:text-sidebar-foreground data-[active=true]:text-sidebar-accent-foreground data-[active=true]:before:absolute data-[active=true]:before:-left-2 data-[active=true]:before:top-1.5 data-[active=true]:before:h-5 data-[active=true]:before:w-[3px] data-[active=true]:before:rounded-r data-[active=true]:before:bg-primary data-[active=true]:[&>svg]:text-sidebar-primary"
                        >
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{title}</span>
                          </Link>
                        </SidebarMenuButton>
                        {badge > 0 && (
                          <SidebarMenuBadge className="rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
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
              <SidebarGroupLabel className="h-7 px-2 text-[11.5px] font-medium text-sidebar-foreground/45">
                Système
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={path.startsWith("/parametres")}
                    tooltip={NAV_LABELS.parametres}
                  >
                    <Link to="/parametres">
                      <Settings className="h-4 w-4" />
                      <span>{NAV_LABELS.parametres}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        {!collapsed && user && (
          <div className="mb-2 min-w-0 px-2">
            <div className="truncate text-[13px] font-semibold text-sidebar-foreground">{displayName(user)}</div>
            <div className="truncate text-[11.5px] text-sidebar-foreground/50">{user.email}</div>
            
          </div>
        )}
        <div
          data-no-translate
          className={`mb-1 flex items-center gap-1 px-2 py-1 ${collapsed ? "flex-col" : ""}`}
          title={t("Langue de l'interface")}
        >
          <Languages className="mr-1 h-4 w-4 text-sidebar-foreground/50" />
          {HUB_LANGS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => l.value !== getLang() && setLang(l.value)}
              aria-pressed={getLang() === l.value}
              title={l.label}
              className={`rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold transition-colors ${
                getLang() === l.value
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/50 hover:text-sidebar-foreground"
              }`}
            >
              {l.short}
            </button>
          ))}
        </div>
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-[13px] text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>{t("Se déconnecter")}</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}

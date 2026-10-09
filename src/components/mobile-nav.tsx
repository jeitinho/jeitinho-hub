import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Calendar,
  ClipboardCheck,
  Inbox,
  Library,
  Menu,
  MessageCircle,
  Sun,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { profileKind, useAuth } from "@/hooks/use-auth";
import { fetchSidebarBadges } from "@/lib/ops/cockpit";
import { navLabel } from "@/lib/nav-labels";

type NavItem = { to: string; module: string; icon: typeof Sun; badge: string | null };

/* Noms : lib/nav-labels.ts (mêmes noms que le menu et le titre de page). */
const MEDIA_ITEMS: NavItem[] = [
  { to: "/dashboard", module: "dashboard", icon: Sun, badge: null },
  { to: "/contenus", module: "contenus", icon: Library, badge: null },
  { to: "/blog", module: "blog", icon: BookOpen, badge: null },
  { to: "/whatsapp", module: "whatsapp", icon: MessageCircle, badge: null },
];

const TERRAIN_ITEMS: NavItem[] = [
  { to: "/dashboard", module: "dashboard", icon: Sun, badge: null },
  { to: "/calendrier", module: "calendrier", icon: Calendar, badge: null },
];

const ITEMS: NavItem[] = [
  { to: "/dashboard", module: "dashboard", icon: Sun, badge: null },
  { to: "/a-valider", module: "a-valider", icon: ClipboardCheck, badge: "a-valider" },
  { to: "/crm", module: "crm", icon: Inbox, badge: "crm" },
  { to: "/calendrier", module: "calendrier", icon: Calendar, badge: null },
];

/** Barre d'onglets du téléphone : les 4 écrans du quotidien + le menu complet. */
export function MobileNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { setOpenMobile } = useSidebar();
  const { canManage, roles } = useAuth();
  const kind = profileKind(roles);
  const { data: badges = {} } = useQuery({
    queryKey: ["sidebar-badges"],
    queryFn: fetchSidebarBadges,
    enabled: canManage,
    refetchInterval: 120_000,
  });

  const items = canManage
    ? ITEMS
    : kind === "media"
      ? MEDIA_ITEMS
      : kind === "terrain"
        ? TERRAIN_ITEMS
        : [];
  if (!items.length) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation principale"
    >
      <ul
        className="grid"
        style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}
      >
        {items.map((item) => {
          const active = path === item.to || path.startsWith(item.to + "/");
          const n = item.badge ? (badges[item.badge] ?? 0) : 0;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <item.icon className="h-5 w-5" />
                <span className="px-0.5 text-center leading-tight">
                  {navLabel(item.module, { canManage, kind })}
                </span>
                {n > 0 && (
                  <span className="absolute right-[22%] top-2 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-semibold leading-4 text-primary-foreground">
                    {n > 99 ? "99+" : n}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={() => setOpenMobile(true)}
            className="flex h-16 w-full flex-col items-center justify-center gap-1 text-[11px] text-muted-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="leading-none">Menu</span>
          </button>
        </li>
      </ul>
    </nav>
  );
}

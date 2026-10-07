import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Calendar, ClipboardCheck, Inbox, Menu, Sun } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";
import { fetchSidebarBadges } from "@/lib/ops/cockpit";

const ITEMS = [
  { to: "/dashboard", label: "Aujourd'hui", icon: Sun, badge: null },
  { to: "/a-valider", label: "À envoyer", icon: ClipboardCheck, badge: "a-valider" },
  { to: "/crm", label: "Demandes", icon: Inbox, badge: "crm" },
  { to: "/calendrier", label: "Agenda", icon: Calendar, badge: null },
] as const;

/** Barre d'onglets du téléphone : les 4 écrans du quotidien + le menu complet. */
export function MobileNav() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { setOpenMobile } = useSidebar();
  const { canManage } = useAuth();
  const { data: badges = {} } = useQuery({
    queryKey: ["sidebar-badges"],
    queryFn: fetchSidebarBadges,
    enabled: canManage,
    refetchInterval: 120_000,
  });

  if (!canManage) return null;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 backdrop-blur md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Navigation principale"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((item) => {
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
                <span className="leading-none">{item.label}</span>
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

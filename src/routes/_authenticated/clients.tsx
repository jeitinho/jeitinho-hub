import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { ClientsList } from "@/components/client360/clients-list";

export const Route = createFileRoute("/_authenticated/clients")({
  component: Layout,
  head: () => ({ meta: [{ title: "Clients — JEITINHO" }] }),
});

/** Route parente de /clients/$id et /clients/new : la liste ne s'affiche que sur /clients. */
function Layout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path.replace(/\/$/, "") !== "/clients") return <Outlet />;
  return <ClientsList />;
}

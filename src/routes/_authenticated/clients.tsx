import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { UserRound } from "lucide-react";

export const Route = createFileRoute("/_authenticated/clients")({
  component: Layout,
  head: () => ({ meta: [{ title: "Clients — JEITINHO" }] }),
});

function Layout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path !== "/clients") return <Outlet />;
  return <ClientsList />;
}

function ClientsList() {
  const { data, isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("clients")
        .select("id,full_name,email,phone,stage,status,last_contact_at,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageShell eyebrow="Base clients" title="Clients" description="Fiches, historique de voyages et documents. Alimentée par les prospects convertis depuis le CRM.">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : !data?.length ? (
        <Card className="border-dashed p-16 text-center">
          <UserRound className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>Aucun client pour l'instant</h2>
          <p className="mt-2 text-sm text-muted-foreground">Convertissez un prospect qualifié depuis le CRM pour créer votre première fiche client.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-border/60 border-border/60">
          {data.map((c: any) => (
            <Link key={c.id} to="/clients/$id" params={{ id: c.id }} className="flex items-center justify-between gap-4 p-4 hover:bg-muted/30">
              <div className="min-w-0">
                <h3 className="truncate text-sm font-medium">{c.full_name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join(" · ") || "Pas de contact"}</p>
              </div>
              <span className="pill shrink-0">{c.stage}</span>
            </Link>
          ))}
        </Card>
      )}
    </PageShell>
  );
}

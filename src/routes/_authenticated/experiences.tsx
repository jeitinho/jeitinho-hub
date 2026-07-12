import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Palmtree } from "lucide-react";

export const Route = createFileRoute("/_authenticated/experiences")({
  component: Layout,
  head: () => ({ meta: [{ title: "Expériences — JEITINHO" }] }),
});

function Layout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path !== "/experiences") return <Outlet />;
  return <ExperiencesList />;
}

function ExperiencesList() {
  const { data, isLoading } = useQuery({
    queryKey: ["experiences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("experiences")
        .select("id,title,slug,location,price_from,currency,is_published,cover_image_url,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageShell
      eyebrow="Bibliothèque centrale"
      title="Expériences"
      description="Chaque expérience n'existe qu'une seule fois. Elle alimente le site, le blog et vos contenus."
      actions={
        <Link to="/experiences/new">
          <Button className="btn-primary"><Plus className="mr-2 h-3.5 w-3.5" />Nouvelle expérience</Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : !data?.length ? (
        <Card className="border-dashed p-16 text-center">
          <Palmtree className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h3 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>Aucune expérience pour l'instant</h3>
          <p className="mt-2 text-sm text-muted-foreground">Créez la première pour commencer à alimenter jeitinho.fr.</p>
          <Link to="/experiences/new" className="mt-6 inline-block">
            <Button className="btn-primary">Créer une expérience</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((x) => (
            <Link key={x.id} to="/experiences/$id" params={{ id: x.id }}>
              <Card className="group overflow-hidden border-border/60 transition-all hover:shadow-[var(--shadow-elevated)]">
                <div
                  className="aspect-[4/3] w-full bg-muted"
                  style={{
                    backgroundImage: x.cover_image_url ? `linear-gradient(0deg, rgb(34 30 26 / 0.35), transparent 50%), url(${x.cover_image_url})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <div className="p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="pill">{x.is_published ? "Publié" : "Brouillon"}</span>
                    {x.location && <span className="text-xs text-muted-foreground">{x.location}</span>}
                  </div>
                  <h3 className="text-lg leading-tight" style={{ fontFamily: "Fraunces, serif" }}>{x.title}</h3>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {x.price_from ? `Dès ${x.price_from} ${x.currency}` : "Prix à définir"}
                  </p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
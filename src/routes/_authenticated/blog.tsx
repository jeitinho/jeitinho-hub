import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/blog")({
  component: Layout,
  head: () => ({ meta: [{ title: "Blog — JEITINHO" }] }),
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon", review: "À valider", scheduled: "Programmé", published: "Publié", archived: "Archivé",
};

function Layout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path !== "/blog") return <Outlet />;
  return <BlogList />;
}

function BlogList() {
  const { data, isLoading } = useQuery({
    queryKey: ["articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id,title,slug,status,excerpt,cover_image_url,published_at,updated_at")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <PageShell
      eyebrow="blog.jeitinho.fr"
      title="Blog"
      description="Rédigez et programmez les articles du média JEITINHO."
      actions={
        <Link to="/blog/new">
          <Button className="btn-primary"><Plus className="mr-2 h-3.5 w-3.5" />Nouvel article</Button>
        </Link>
      }
    >
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : !data?.length ? (
        <Card className="border-dashed p-16 text-center">
          <BookOpen className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h3 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>Aucun article</h3>
          <p className="mt-2 text-sm text-muted-foreground">Écrivez le premier article du blog.</p>
          <Link to="/blog/new" className="mt-6 inline-block"><Button className="btn-primary">Écrire un article</Button></Link>
        </Card>
      ) : (
        <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card">
          {data.map((a) => (
            <Link key={a.id} to="/blog/$id" params={{ id: a.id }} className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/40">
              <div
                className="h-14 w-20 flex-shrink-0 rounded-md bg-muted"
                style={a.cover_image_url ? { backgroundImage: `url(${a.cover_image_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="pill">{STATUS_LABEL[a.status] ?? a.status}</span>
                  <span className="truncate text-xs text-muted-foreground">/{a.slug}</span>
                </div>
                <h3 className="mt-1 truncate text-base" style={{ fontFamily: "Fraunces, serif" }}>{a.title}</h3>
                {a.excerpt && <p className="mt-0.5 truncate text-xs text-muted-foreground">{a.excerpt}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
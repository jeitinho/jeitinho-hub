import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, CalendarRange, ExternalLink, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlogFeedList } from "@/components/media/blog-feed-list";
import { WriterLoad } from "@/components/media/writer-load";
import { BLOG_URL } from "@/lib/ops/media";

export const Route = createFileRoute("/_authenticated/blog")({
  component: Layout,
  head: () => ({ meta: [{ title: "Blog — JEITINHO" }] }),
});

const STATUS_LABEL: Record<string, string> = {
  draft: "Brouillon",
  writing: "En rédaction",
  to_review: "À relire",
  changes_requested: "Corrections",
  approved: "Validé",
  ready_to_publish: "Prêt à publier",
  scheduled: "Programmé",
  published: "Publié",
  archived: "Archivé",
};

function Layout() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (path !== "/blog") return <Outlet />;
  return <BlogPage />;
}

function BlogPage() {
  const [tab, setTab] = useState("en-ligne");
  return (
    <PageShell
      eyebrow="Média · blog.jeitinho.fr"
      title="Blog"
      description="Articles en ligne, suivi par rapport au planning éditorial et charge de l'équipe."
      actions={
        <>
          <a href={BLOG_URL} target="_blank" rel="noreferrer">
            <Button variant="outline">
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Voir le blog
            </Button>
          </a>
          <Link to="/contenus">
            <Button className="btn-primary">
              <CalendarRange className="mr-2 h-3.5 w-3.5" />
              Planning éditorial
            </Button>
          </Link>
        </>
      }
    >
      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="en-ligne">Articles en ligne</TabsTrigger>
          <TabsTrigger value="charge">Charge par rédacteur</TabsTrigger>
          <TabsTrigger value="editeur">Éditeur</TabsTrigger>
        </TabsList>
        <TabsContent value="en-ligne" className="mt-0">
          <BlogFeedList />
        </TabsContent>
        <TabsContent value="charge" className="mt-0">
          <WriterLoad />
        </TabsContent>
        <TabsContent value="editeur" className="mt-0">
          <EditorDrafts />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}

/** Articles rédigés dans l'éditeur du manager (table contents, publication via GitHub). */
function EditorDrafts() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["contents", "blog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contents")
        .select("id,title,slug,status,excerpt,metadata,published_at,updated_at")
        .eq("type", "blog")
        .order("updated_at", { ascending: false });
      if (error) throw new Error(error.message);
      return Array.isArray(data) ? (data as Array<Record<string, unknown>>) : [];
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Articles rédigés dans le manager puis poussés vers le dépôt du blog.
        </p>
        <Link to="/blog/new">
          <Button size="sm" variant="outline">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Nouvel article
          </Button>
        </Link>
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : error ? (
        <Card className="border-destructive/40 p-4 text-sm">{(error as Error).message}</Card>
      ) : !data?.length ? (
        <Card className="border-dashed p-10 text-center">
          <BookOpen className="mx-auto mb-3 h-6 w-6 text-primary" />
          <p className="text-sm text-muted-foreground">Aucun article dans l'éditeur.</p>
        </Card>
      ) : (
        <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card">
          {data.map((a) => {
            const cover = (a.metadata as { cover_url?: string } | null)?.cover_url;
            return (
              <Link
                key={String(a.id)}
                to="/blog/$id"
                params={{ id: String(a.id) }}
                className="flex items-center gap-4 p-4 transition-colors hover:bg-accent/40"
              >
                <div
                  className="h-14 w-20 flex-shrink-0 rounded-md bg-muted"
                  style={
                    cover
                      ? {
                          backgroundImage: `url(${cover})`,
                          backgroundSize: "cover",
                          backgroundPosition: "center",
                        }
                      : undefined
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="pill">
                      {STATUS_LABEL[String(a.status)] ?? String(a.status)}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      /{String(a.slug ?? "")}
                    </span>
                  </div>
                  <h3 className="mt-1 truncate text-base" style={{ fontFamily: "Fraunces, serif" }}>
                    {String(a.title)}
                  </h3>
                  {a.excerpt ? (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {String(a.excerpt)}
                    </p>
                  ) : null}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

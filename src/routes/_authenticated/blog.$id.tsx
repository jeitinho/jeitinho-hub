import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArticleForm } from "@/components/article-form";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { WorkflowPanel, type ContentStatus } from "@/components/workflow/workflow-panel";
import { CommentsPanel } from "@/components/workflow/comments-panel";
import { RevisionsPanel } from "@/components/workflow/revisions-panel";
import { PublishPanel } from "@/components/workflow/publish-panel";
import { DeleteArticleDialog } from "@/components/workflow/delete-article-dialog";
import { RepublishPanel } from "@/components/workflow/republish-panel";

export const Route = createFileRoute("/_authenticated/blog/$id")({
  component: EditArticle,
  head: () => ({ meta: [{ title: "Article — JEITINHO" }] }),
});

function EditArticle() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["content", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contents").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !data) return <PageShell title="Chargement…">{null}</PageShell>;
  const meta = (data.metadata as { cover_url?: string } | null) ?? {};
  const isPublished = data.status === "published" || data.status === "archived";

  return (
    <PageShell
      eyebrow="Article"
      title={data.title}
      actions={
        isPublished ? (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />Supprimer
          </Button>
        ) : (
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={async () => {
              if (!confirm("Supprimer ce brouillon ? Il ne sera pas publié sur le blog.")) return;
              const { error } = await supabase.from("contents").delete().eq("id", id);
              if (error) return toast.error(error.message);
              toast.success("Supprimé");
              navigate({ to: "/blog" });
            }}
          >
            <Trash2 className="mr-2 h-4 w-4" />Supprimer
          </Button>
        )
      }
    >
      <DeleteArticleDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        contentId={id}
        slug={data.slug ?? ""}
        onDone={() => {
          refetch();
          if (data.status !== "archived") navigate({ to: "/blog" });
        }}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <ArticleForm
        initial={{
          title: data.title,
          slug: data.slug ?? "",
          excerpt: data.excerpt,
          content: data.body_markdown,
          body_json: data.body_json,
          cover_image_url: meta.cover_url ?? null,
          seo_title: data.seo_title,
          seo_description: data.seo_description,
          status: data.status,
          tags: data.tags ?? [],
          scheduled_at: data.scheduled_at,
          published_at: data.published_at,
        }}
        onSubmit={async (values) => {
          const { error } = await supabase
            .from("contents")
            .update({
              title: values.title,
              slug: values.slug || null,
              excerpt: values.excerpt,
              body_markdown: values.content,
              body_json: values.body_json as never,
              seo_title: values.seo_title,
              seo_description: values.seo_description,
              status: values.status,
              tags: values.tags,
              scheduled_at: values.scheduled_at,
              published_at: values.published_at,
              metadata: { ...meta, cover_url: values.cover_image_url ?? null },
            })
            .eq("id", id);
          if (error) return toast.error(error.message);
          toast.success("Enregistré");
          refetch();
        }}
        />
        <aside className="space-y-4">
          <WorkflowPanel contentId={id} status={data.status as ContentStatus} onChanged={() => refetch()} />
          {data.status === "archived" && (
            <RepublishPanel contentId={id} onDone={() => refetch()} />
          )}
          <PublishPanel contentId={id} contentType={data.type} />
          <CommentsPanel contentId={id} />
          <RevisionsPanel contentId={id} />
        </aside>
      </div>
    </PageShell>
  );
}
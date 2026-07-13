import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArticleForm } from "@/components/article-form";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/blog/$id")({
  component: EditArticle,
  head: () => ({ meta: [{ title: "Article — JEITINHO" }] }),
});

function EditArticle() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
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

  return (
    <PageShell
      eyebrow="Article"
      title={data.title}
      actions={
        <Button
          variant="ghost"
          className="text-destructive hover:text-destructive"
          onClick={async () => {
            if (!confirm("Supprimer cet article ?")) return;
            const { error } = await supabase.from("contents").delete().eq("id", id);
            if (error) return toast.error(error.message);
            toast.success("Supprimé");
            navigate({ to: "/blog" });
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />Supprimer
        </Button>
      }
    >
      <ArticleForm
        initial={{
          title: data.title,
          slug: data.slug ?? "",
          excerpt: data.excerpt,
          content: data.body_markdown,
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
    </PageShell>
  );
}
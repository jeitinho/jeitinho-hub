import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArticleForm } from "@/components/article-form";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/blog/new")({
  component: NewArticle,
  head: () => ({ meta: [{ title: "Nouvel article — JEITINHO" }] }),
});

function NewArticle() {
  const navigate = useNavigate();
  return (
    <PageShell eyebrow="blog.jeitinho.fr" title="Nouvel article">
      <ArticleForm
        onSubmit={async (values) => {
          const { data: userData } = await supabase.auth.getUser();
          const { data, error } = await supabase
            .from("contents")
            .insert({
              type: "blog",
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
              metadata: { cover_url: values.cover_image_url ?? null },
              category_id: values.category_id,
              author_id: values.author_id,
              reading_time_min: values.reading_time_min,
              created_by: userData.user?.id,
            })
            .select("id")
            .single();
          if (error) return toast.error(error.message);
          if (!data) return toast.error("Erreur inconnue");
          toast.success("Article créé");
          navigate({ to: "/blog/$id", params: { id: data.id } });
        }}
      />
    </PageShell>
  );
}
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
            .from("articles")
            .insert({ ...values, author_id: userData.user?.id })
            .select("id")
            .single();
          if (error) return toast.error(error.message);
          toast.success("Article créé");
          navigate({ to: "/blog/$id", params: { id: data.id } });
        }}
      />
    </PageShell>
  );
}
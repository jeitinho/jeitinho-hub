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
    queryKey: ["article", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("articles").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !data) return <PageShell title="Chargement…">{null}</PageShell>;

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
            const { error } = await supabase.from("articles").delete().eq("id", id);
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
        initial={data}
        onSubmit={async (values) => {
          const { error } = await supabase.from("articles").update(values).eq("id", id);
          if (error) return toast.error(error.message);
          toast.success("Enregistré");
          refetch();
        }}
      />
    </PageShell>
  );
}
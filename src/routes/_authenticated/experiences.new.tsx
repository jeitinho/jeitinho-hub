import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ExperienceForm } from "@/components/experience-form";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/experiences/new")({
  component: NewExperience,
  head: () => ({ meta: [{ title: "Nouvelle expérience — JEITINHO" }] }),
});

function NewExperience() {
  const navigate = useNavigate();
  return (
    <PageShell eyebrow="Bibliothèque centrale" title="Nouvelle expérience">
      <ExperienceForm
        onSubmit={async (values) => {
          const { data: userData } = await supabase.auth.getUser();
          const { data, error } = await supabase
            .from("experiences")
            .insert({ ...values, created_by: userData.user?.id })
            .select("id")
            .single();
          if (error) return toast.error(error.message);
          toast.success("Expérience créée");
          navigate({ to: "/experiences/$id", params: { id: data.id } });
        }}
      />
    </PageShell>
  );
}
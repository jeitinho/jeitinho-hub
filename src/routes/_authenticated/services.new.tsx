import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CatalogForm } from "@/components/catalog-form";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/services/new")({ component: NewService, head: () => ({ meta: [{ title: "Nouveau service — JEITINHO" }] }) });

function NewService() {
  const navigate = useNavigate();
  return <PageShell eyebrow="Contenu / Catalogue" title="Nouveau service" description="Créer une prestation de conciergerie réutilisable dans les devis et voyages.">
    <CatalogForm mode="service" onSubmit={async (v) => {
      const { data: user } = await supabase.auth.getUser();
      const { data, error } = await supabase.from("services").insert({
        title: v.title.trim(), description: v.description || null, group_slug: v.group_slug || null, category: v.category || null,
        price_label: v.price_label || null, price_from: v.price_from, currency: v.currency || "EUR", partner_id: v.partner_id || null,
        price_model: v.price_model || "fixed", supplier_net: v.supplier_net, supplier_cost: v.supplier_cost, fixed_cost: v.fixed_cost,
        commission_pct: v.commission_pct, commission_basis: v.commission_basis || "sale_price", is_active: v.is_active, created_by: user.user?.id ?? null,
      }).select("id").single();
      if (error) { toast.error(error.message); return; }
      toast.success("Service créé");
      navigate({ to: "/services/$id", params: { id: data.id } });
    }} />
  </PageShell>;
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CatalogForm } from "@/components/catalog-form";
import { PageShell } from "@/components/page-shell";
import { createCatalogItem } from "@/lib/catalog-gateway";
import { toast } from "sonner";
import { ONLINE_PRICING_MODEL, ON_REQUEST_PRICING_MODEL } from "@/lib/tickets/online-sale";
export const Route = createFileRoute("/_authenticated/billetterie/new")({
  component: NewTicket,
  head: () => ({ meta: [{ title: "Nouvelle billetterie — JEITINHO" }] }),
});
function NewTicket() {
  const navigate = useNavigate();
  return (
    <PageShell
      eyebrow="Contenu / Catalogue"
      title="Nouveau billet (catalogue)"
      description="Créer une offre de match, concert ou événement réutilisable dans les voyages. Les secteurs/variantes de prix s'ajoutent après la création."
    >
      <CatalogForm
        mode="ticket"
        initial={{ online_sale: true }}
        onSubmit={async (v) => {
          try {
            const created = await createCatalogItem<{ id: string }>("ticket_offers", {
              title: v.title.trim(),
              venue: v.venue || null,
              event_date: v.event_date || null,
              event_time: v.event_time || null,
              description: v.description.trim() || null,
              pricing_model: v.online_sale ? ONLINE_PRICING_MODEL : ON_REQUEST_PRICING_MODEL,
              public_price: v.public_price,
              supplier_net: v.supplier_net,
              commission_pct: v.commission_pct,
              currency: v.currency || "EUR",
              notes: v.notes || null,
              is_published: v.is_active,
              category: v.category || null,
              supplier_cost: v.supplier_cost,
              commission_basis: v.commission_basis || "sale_price",
              photo_url: v.photo_url || null,
              photo_ratio: v.photo_ratio || "16/9",
              title_en: v.title_en || null,
              title_es: v.title_es || null,
              title_pt: v.title_pt || null,
              title_it: v.title_it || null,
              title_de: v.title_de || null,
              title_ru: v.title_ru || null,
              description_en: v.description_en || null,
              description_es: v.description_es || null,
              description_pt: v.description_pt || null,
              description_it: v.description_it || null,
              description_de: v.description_de || null,
              description_ru: v.description_ru || null,
              venue_en: v.venue_en || null,
              venue_es: v.venue_es || null,
              venue_pt: v.venue_pt || null,
              venue_it: v.venue_it || null,
              venue_de: v.venue_de || null,
              venue_ru: v.venue_ru || null,
              slug: `${v.title
                .trim()
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}-${Date.now().toString(36)}`,
            });
            toast.success("Offre créée");
            navigate({ to: "/billetterie/$id", params: { id: created.id } });
          } catch (e) {
            toast.error(e instanceof Error ? e.message : "Création impossible.");
          }
        }}
      />
    </PageShell>
  );
}

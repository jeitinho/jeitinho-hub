import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CatalogForm } from "@/components/catalog-form";
import { TicketOfferVariantsEditor } from "@/components/ticket-offer-variants-editor";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Archive, Copy, Trash2 } from "lucide-react";
import {
  fetchCatalogItem,
  updateCatalogItem,
  deleteCatalogItem,
  fetchTicketOfferVariants,
  createCatalogItem,
  createTicketOfferVariant,
} from "@/lib/catalog-gateway";
import { slugify } from "@/lib/tickets/quick-offer";
import { toast } from "sonner";
import { ONLINE_PRICING_MODEL, ON_REQUEST_PRICING_MODEL } from "@/lib/tickets/online-sale";
import { confirmAction } from "@/components/confirm-dialog";
export const Route = createFileRoute("/_authenticated/billetterie/$id")({
  component: EditTicket,
  head: () => ({ meta: [{ title: "Billet (catalogue) — JEITINHO" }] }),
});
function EditTicket() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ticket-offer", id],
    queryFn: () => fetchCatalogItem<any>("ticket_offers", id),
  });
  // Same key as TicketOfferVariantsEditor, so saving sectors refreshes the
  // « Achat en ligne » checklist.
  const { data: variants = [] } = useQuery({
    queryKey: ["ticket-offer-variants", id],
    queryFn: () =>
      fetchTicketOfferVariants<{ public_price: number | null; is_active: boolean }>(id),
  });
  const hasVariantPrices = variants.some(
    (v) => v.is_active !== false && Number(v.public_price ?? 0) > 0,
  );
  if (isLoading)
    return (
      <PageShell title="Chargement…">
        <Card className="h-48 animate-pulse bg-muted/50" />
      </PageShell>
    );
  if (error || !data)
    return (
      <PageShell title="Offre introuvable">
        <Card className="border-destructive/40 p-8">
          {error instanceof Error ? error.message : "Impossible de charger cette offre."}
        </Card>
      </PageShell>
    );
  const archive = async () => {
    try {
      await updateCatalogItem("ticket_offers", id, { is_published: false, is_active: false });
      toast.success("Offre archivée");
      await qc.invalidateQueries({ queryKey: ["ticket-offers"] });
      navigate({ to: "/billetterie" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Archivage impossible.");
    }
  };
  // Another day of the same event (Sambódromo nights, a rematch): same
  // sectors and prices as a starting point, unpublished until the new date
  // and prices are checked.
  const duplicate = async () => {
    try {
      const {
        id: _id,
        created_at: _c,
        updated_at: _u,
        created_by: _b,
        slug: _s,
        ...rest
      } = data as Record<string, unknown>;
      const title = `${data.title} (copie)`;
      const copy = await createCatalogItem<{ id: string }>("ticket_offers", {
        ...rest,
        title,
        event_date: null,
        is_published: false,
        is_active: true,
        slug: slugify(String(data.title)),
      });
      const source = await fetchTicketOfferVariants<Record<string, unknown>>(id);
      for (const v of source) {
        const { id: _vid, created_at: _vc, updated_at: _vu, ticket_offer_id: _t, ...vrest } = v;
        await createTicketOfferVariant({ ...vrest, ticket_offer_id: copy.id });
      }
      await qc.invalidateQueries({ queryKey: ["ticket-offers"] });
      toast.success("Copie créée : renseigne la date et vérifie les prix, puis publie.");
      navigate({ to: "/billetterie/$id", params: { id: copy.id } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Duplication impossible.");
    }
  };
  const remove = async () => {
    if (!(await confirmAction("Supprimer définitivement cette offre ?", { confirmLabel: "Supprimer l'offre" }))) return;
    try {
      await deleteCatalogItem("ticket_offers", id);
      toast.success("Offre supprimée");
      navigate({ to: "/billetterie" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    }
  };
  return (
    <PageShell
      eyebrow="Contenu / Catalogue"
      title={data.title}
      description="Modifier l'offre du catalogue de billets."
      actions={
        <div className="flex gap-2">
          <Link to="/billetterie">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Billets
            </Button>
          </Link>
          <Button variant="outline" onClick={duplicate} title="Même billet, autre date">
            <Copy className="mr-2 h-4 w-4" />
            Dupliquer
          </Button>
          <Button variant="outline" onClick={archive}>
            <Archive className="mr-2 h-4 w-4" />
            Archiver
          </Button>
          <Button
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={remove}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Supprimer
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <CatalogForm
          mode="ticket"
          initial={{
            ...data,
            description: data.description ?? "",
            event_time: toTimeInput(data.event_time),
            online_sale: data.pricing_model !== ON_REQUEST_PRICING_MODEL,
            is_active: Boolean(data.is_published),
          }}
          hasVariantPrices={hasVariantPrices}
          onSubmit={async (v) => {
            try {
              await updateCatalogItem("ticket_offers", id, {
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
                ...(v.is_active ? { is_active: true } : {}),
              });
              toast.success("Offre enregistrée");
              await Promise.all([
                qc.invalidateQueries({ queryKey: ["ticket-offer", id] }),
                qc.invalidateQueries({ queryKey: ["ticket-offers"] }),
              ]);
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
            }
          }}
        />
        <TicketOfferVariantsEditor ticketOfferId={id} />
      </div>
    </PageShell>
  );
}

/** DB event_time is free text ("21:30", "21h30") — the time input needs HH:MM. */
function toTimeInput(raw: string | null | undefined): string {
  const m = (raw ?? "").trim().match(/^(\d{1,2})\s*[:hH]\s*(\d{2})?/);
  if (!m || Number(m[1]) > 23) return "";
  return `${m[1].padStart(2, "0")}:${m[2] ?? "00"}`;
}

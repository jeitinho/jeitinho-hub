import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CatalogForm } from "@/components/catalog-form";
import { PageShell } from "@/components/page-shell";
import { QuickTicketForm } from "@/components/tickets/quick-ticket-form";
import { createCatalogItem } from "@/lib/catalog-gateway";
import { toast } from "sonner";
import { ONLINE_PRICING_MODEL, ON_REQUEST_PRICING_MODEL } from "@/lib/tickets/online-sale";
type NewKind = "foot" | "sambodromo" | "autre";
const KINDS: { value: NewKind; label: string; hint: string }[] = [
  { value: "foot", label: "Match de foot", hint: "Maracanã, São Januário… équipes, date, prix par secteur" },
  { value: "sambodromo", label: "Sambódromo", hint: "Une soirée : setores 1 à 13, frisas, camarotes" },
  { value: "autre", label: "Autre événement", hint: "Concert, spectacle, prix unique ou secteurs" },
];

export const Route = createFileRoute("/_authenticated/billetterie/new")({
  validateSearch: (s: Record<string, unknown>): { type?: NewKind } =>
    s.type === "foot" || s.type === "sambodromo" || s.type === "autre" ? { type: s.type } : {},
  component: NewTicket,
  head: () => ({ meta: [{ title: "Nouvelle billetterie — JEITINHO" }] }),
});
function NewTicket() {
  const navigate = useNavigate();
  const { type: kind = "foot" } = Route.useSearch();
  return (
    <PageShell
      eyebrow="Contenu / Catalogue"
      title="Nouveau billet (catalogue)"
      description="Un billet par match ou par soirée, avec ses prix par secteur. Publié et en achat en ligne, il se vend tout seul sur jeitinho.fr."
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {KINDS.map((k) => (
          <button
            key={k.value}
            type="button"
            onClick={() => navigate({ to: "/billetterie/new", search: { type: k.value }, replace: true })}
            className={`rounded-lg border p-4 text-left transition ${
              kind === k.value
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border bg-card hover:border-primary/40"
            }`}
          >
            <p className="font-medium">{k.label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>
          </button>
        ))}
      </div>
      {kind !== "autre" ? (
        <QuickTicketForm key={kind} kind={kind} />
      ) : (
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
      )}
    </PageShell>
  );
}

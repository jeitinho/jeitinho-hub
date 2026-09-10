import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

export type CatalogLineSource = "experience" | "service" | "ticket" | null;

export type CatalogLineSelection = {
  sourceType: CatalogLineSource;
  sourceId: string | null;
  label: string;
  unitPrice: number;
  currency: string;
  unit: string;
};

type CatalogLinePickerProps = {
  /** Catalog selection key (e.g. "experience:<uuid>"), or "" when the line is free text. */
  value: string;
  /** Free-text description — shown in the field when `value` is "". */
  descriptionValue: string;
  /** Called when the user types/commits free text instead of picking a catalog item. */
  onDescriptionChange: (text: string) => void;
  currency: string;
  onSelect: (selection: CatalogLineSelection) => void;
};

export type CatalogOption = CatalogLineSelection & { value: string; kindLabel: string };

/**
 * Shared catalog data source (experiences + services + ticket_offers) used
 * by both the quote/invoice line picker and the lead "Activités souhaitées"
 * field, so both stay backed by the exact same query.
 */
export function useCatalogLineOptions(currency: string) {
  return useQuery({
    queryKey: ["catalog-line-options"],
    queryFn: async () => {
      const [{ data: experiences, error: experiencesError }, { data: services, error: servicesError }, { data: tickets, error: ticketsError }] = await Promise.all([
        supabase.from("experiences").select("id,title,price_from,currency,is_published").eq("is_published", true).order("title"),
        supabase.from("services").select("id,title,price_from,currency,is_active").eq("is_active", true).order("title"),
        supabase.from("ticket_offers").select("id,title,public_price,currency,event_date,is_active").eq("is_active", true).order("title"),
      ]);
      if (experiencesError) throw new Error(experiencesError.message);
      if (servicesError) throw new Error(servicesError.message);
      if (ticketsError) throw new Error(ticketsError.message);

      const rows: CatalogOption[] = [];
      for (const item of (experiences ?? []) as any[]) {
        rows.push({ value: `experience:${item.id}`, sourceType: "experience", sourceId: item.id, label: item.title, unitPrice: Number(item.price_from ?? 0), currency: item.currency ?? currency, unit: "Forfait", kindLabel: "Activité" });
      }
      for (const item of (services ?? []) as any[]) {
        rows.push({ value: `service:${item.id}`, sourceType: "service", sourceId: item.id, label: item.title, unitPrice: Number(item.price_from ?? 0), currency: item.currency ?? currency, unit: "Forfait", kindLabel: "Service" });
      }
      for (const item of (tickets ?? []) as any[]) {
        rows.push({ value: `ticket:${item.id}`, sourceType: "ticket", sourceId: item.id, label: item.title, unitPrice: Number(item.public_price ?? 0), currency: item.currency ?? currency, unit: "Billet", kindLabel: "Billet" });
      }
      return rows;
    },
  });
}

// Single field that behaves as a combobox over the catalogue while still
// accepting free-hand typing: `value` (a catalog key) takes priority when
// set, otherwise the field shows/edits `descriptionValue` as plain text.
// Selecting a catalog item calls onSelect (price/unit/etc. snapshot);
// typing or committing free text calls onDescriptionChange instead.
export function CatalogLinePicker({ value, descriptionValue, onDescriptionChange, currency, onSelect }: CatalogLinePickerProps) {
  const { data: options = [], isLoading } = useCatalogLineOptions(currency);

  const comboboxOptions: ComboboxOption[] = (options as CatalogOption[]).map((option) => ({ value: option.value, label: `${option.kindLabel} — ${option.label}` }));

  const effectiveValue = value || descriptionValue;

  return (
    <Combobox
      options={comboboxOptions}
      value={effectiveValue}
      onChange={(next) => {
        const option = (options as CatalogOption[]).find((item) => item.value === next);
        if (option) { onSelect(option); return; }
        onDescriptionChange(next);
      }}
      allowCustomValue
      customValueLabel={(text) => `Saisie manuelle : « ${text} »`}
      placeholder={isLoading ? "Chargement…" : "Catalogue ou saisie libre…"}
      searchPlaceholder="Rechercher dans le catalogue ou saisir un texte libre…"
      emptyText="Aucun résultat — tapez pour saisir du texte libre."
      className="h-9 text-xs"
    />
  );
}

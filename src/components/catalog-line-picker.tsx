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
  value: string;
  currency: string;
  onSelect: (selection: CatalogLineSelection) => void;
};

export type CatalogOption = CatalogLineSelection & { value: string; kindLabel: string };

const MANUAL_VALUE = "__manual__";

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

export function CatalogLinePicker({ value, currency, onSelect }: CatalogLinePickerProps) {
  const { data: options = [], isLoading } = useCatalogLineOptions(currency);

  const comboboxOptions: ComboboxOption[] = [
    { value: MANUAL_VALUE, label: "Saisie manuelle" },
    ...(options as CatalogOption[]).map((option) => ({ value: option.value, label: `${option.kindLabel} — ${option.label}` })),
  ];

  const effectiveValue = value || MANUAL_VALUE;

  return (
    <Combobox
      options={comboboxOptions}
      value={effectiveValue}
      onChange={(next) => {
        if (next === MANUAL_VALUE) return;
        const option = (options as CatalogOption[]).find((item) => item.value === next);
        if (option) onSelect(option);
      }}
      placeholder={isLoading ? "Chargement…" : "Choisir dans le catalogue"}
      searchPlaceholder="Rechercher dans le catalogue…"
      emptyText="Aucun résultat."
      className="h-9 text-xs"
    />
  );
}

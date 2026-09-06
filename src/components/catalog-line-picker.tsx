import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

type CatalogOption = CatalogLineSelection & { value: string; kindLabel: string };

export function CatalogLinePicker({ value, currency, onSelect }: CatalogLinePickerProps) {
  const { data: options = [], isLoading } = useQuery({
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

  const effectiveValue = value || "__manual__";
  return (
    <Select
      value={effectiveValue}
      onValueChange={(next) => {
        if (next === "__manual__") return;
        const option = (options as CatalogOption[]).find((item) => item.value === next);
        if (option) onSelect(option);
      }}
    >
      <SelectTrigger className="h-9 text-xs">
        <SelectValue placeholder={isLoading ? "Chargement…" : "Choisir dans le catalogue"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__manual__">Saisie manuelle</SelectItem>
        {(options as CatalogOption[]).map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.kindLabel} — {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

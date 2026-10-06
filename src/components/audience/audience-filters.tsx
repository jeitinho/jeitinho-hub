import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ENGAGEMENTS,
  ENGAGEMENT_LABELS,
  ORIGIN_LABELS,
  type AudienceFilters,
  type BuyerFilter,
  type Dimension,
  type OptinFilter,
} from "@/lib/ops/audience";

export function AudienceFilterBar({
  search,
  onSearch,
  filters,
  onChange,
  zones,
  origins,
}: {
  search: string;
  onSearch: (v: string) => void;
  filters: AudienceFilters;
  onChange: (patch: Partial<AudienceFilters>) => void;
  zones: Dimension;
  origins: Dimension;
}) {
  const active =
    search.trim() !== "" ||
    filters.engagement !== "all" ||
    filters.zone !== "all" ||
    filters.origin !== "all" ||
    filters.optin !== "all" ||
    filters.buyer !== "all";

  return (
    <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(220px,2fr)_repeat(5,minmax(0,1fr))_auto]">
      <div className="relative sm:col-span-2 lg:col-span-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Nom, e-mail ou téléphone"
          className="pl-8"
        />
      </div>
      <Select value={filters.engagement} onValueChange={(v) => onChange({ engagement: v })}>
        <SelectTrigger>
          <SelectValue placeholder="Engagement" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tout engagement</SelectItem>
          {ENGAGEMENTS.map((e) => (
            <SelectItem key={e} value={e}>
              {ENGAGEMENT_LABELS[e]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.zone} onValueChange={(v) => onChange({ zone: v })}>
        <SelectTrigger>
          <SelectValue placeholder="Zone" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes zones</SelectItem>
          {zones.map((z) => (
            <SelectItem key={z.key} value={z.key}>
              {z.key === "__none" ? "Zone inconnue" : z.key} ({z.count})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.optin} onValueChange={(v) => onChange({ optin: v as OptinFilter })}>
        <SelectTrigger>
          <SelectValue placeholder="Opt-in" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous opt-ins</SelectItem>
          <SelectItem value="newsletter">Opt-in newsletter</SelectItem>
          <SelectItem value="no_newsletter">Sans opt-in newsletter</SelectItem>
          <SelectItem value="notifications">Opt-in notifications</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.origin} onValueChange={(v) => onChange({ origin: v })}>
        <SelectTrigger>
          <SelectValue placeholder="Origine" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes origines</SelectItem>
          {origins.map((o) => (
            <SelectItem key={o.key} value={o.key}>
              {ORIGIN_LABELS[o.key] ?? o.key}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={filters.buyer} onValueChange={(v) => onChange({ buyer: v as BuyerFilter })}>
        <SelectTrigger>
          <SelectValue placeholder="Achat" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Achat : tous</SelectItem>
          <SelectItem value="recent">A acheté (24 mois)</SelectItem>
          <SelectItem value="ever">A déjà acheté</SelectItem>
          <SelectItem value="never">Jamais acheté</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        disabled={!active}
        onClick={() => {
          onSearch("");
          onChange({ engagement: "all", zone: "all", origin: "all", optin: "all", buyer: "all" });
        }}
      >
        <X className="mr-1 h-4 w-4" />
        Effacer
      </Button>
    </div>
  );
}

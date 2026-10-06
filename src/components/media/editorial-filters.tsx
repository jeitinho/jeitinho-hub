import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EDITORIAL_KINDS } from "@/lib/ops/media";
import { ALL, EMPTY_FILTERS, type EditorialFilterState } from "./editorial-filters-state";

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-full sm:w-44">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{placeholder}</SelectItem>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function EditorialFilters({
  value,
  onChange,
  owners,
  kinds,
  collections,
}: {
  value: EditorialFilterState;
  onChange: (v: EditorialFilterState) => void;
  owners: string[];
  kinds: string[];
  collections: string[];
}) {
  const active =
    value.owner !== ALL || value.kind !== ALL || value.collection !== ALL || value.lateOnly;
  return (
    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <FilterSelect
        value={value.owner}
        onChange={(owner) => onChange({ ...value, owner })}
        placeholder="Tous les responsables"
        options={owners.map((o) => ({ value: o, label: o }))}
      />
      <FilterSelect
        value={value.kind}
        onChange={(kind) => onChange({ ...value, kind })}
        placeholder="Tous les types"
        options={kinds.map((k) => ({ value: k, label: EDITORIAL_KINDS[k] ?? k }))}
      />
      <FilterSelect
        value={value.collection}
        onChange={(collection) => onChange({ ...value, collection })}
        placeholder="Toutes les collections"
        options={collections.map((c) => ({ value: c, label: c }))}
      />
      <Button
        size="sm"
        variant={value.lateOnly ? "destructive" : "outline"}
        className="h-9"
        onClick={() => onChange({ ...value, lateOnly: !value.lateOnly })}
      >
        En retard
      </Button>
      {active && (
        <Button
          size="sm"
          variant="ghost"
          className="col-span-2 h-9 sm:col-span-1"
          onClick={() => onChange(EMPTY_FILTERS)}
        >
          <X className="mr-1 h-3.5 w-3.5" />
          Réinitialiser
        </Button>
      )}
    </div>
  );
}

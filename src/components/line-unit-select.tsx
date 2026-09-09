import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const UNIT_OPTIONS = ["Forfait", "Personne", "Jour", "Nuit", "Billet", "Heure", "Groupe"] as const;
const CUSTOM_UNIT = "Autre";

type UnitSelectProps = {
  value: string;
  onChange: (value: string) => void;
};

/**
 * Select for the per-line "Unité" field, backed by a fixed list. Falls back
 * to "Autre" + a free-text input for any value outside the list, so existing
 * database values (or truly one-off units) stay representable.
 */
export function UnitSelect({ value, onChange }: UnitSelectProps) {
  const isKnown = (UNIT_OPTIONS as readonly string[]).includes(value);

  return (
    <div className="space-y-1.5">
      <Select
        value={isKnown ? value : CUSTOM_UNIT}
        onValueChange={(next) => {
          if (next === CUSTOM_UNIT) onChange(isKnown ? "" : value);
          else onChange(next);
        }}
      >
        <SelectTrigger className="h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {UNIT_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_UNIT}>{CUSTOM_UNIT}</SelectItem>
        </SelectContent>
      </Select>
      {!isKnown && (
        <Input
          className="h-8 text-xs"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Unité personnalisée"
        />
      )}
    </div>
  );
}

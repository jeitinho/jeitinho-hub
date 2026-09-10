"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type ComboboxOption = { value: string; label: string };

type ComboboxProps = {
  options: ComboboxOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
  /** Allow committing free-typed text that isn't in `options` (adds a "Saisie manuelle" item, same pattern as ComboboxMulti's allowCustomValues). */
  allowCustomValue?: boolean;
  /** Label for the custom-value item. Defaults to `Saisie manuelle : « <text> »`. */
  customValueLabel?: (text: string) => string;
};

const defaultCustomValueLabel = (text: string) => `Saisie manuelle : « ${text} »`;

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Sélectionner…",
  emptyText = "Aucun résultat.",
  searchPlaceholder = "Rechercher…",
  disabled,
  className,
  allowCustomValue = false,
  customValueLabel = defaultCustomValueLabel,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const selected = options.find((option) => option.value === value);
  // With allowCustomValue, `value` may be raw free text rather than an option's
  // value — fall back to showing it verbatim instead of the placeholder.
  const triggerLabel = selected ? selected.label : allowCustomValue && value ? value : undefined;

  const trimmedSearch = search.trim();
  const hasExactMatch = options.some((option) => option.label.toLowerCase() === trimmedSearch.toLowerCase());

  const commitCustomValue = () => {
    if (!trimmedSearch || hasExactMatch) return;
    onChange(trimmedSearch);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-between font-normal",
            !triggerLabel && "text-muted-foreground",
            className,
          )}
        >
          <span className="truncate">{triggerLabel ?? placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command shouldFilter>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value);
                    setSearch("");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      option.value === value ? "opacity-100" : "opacity-0",
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {allowCustomValue && trimmedSearch && !hasExactMatch && (
              <CommandGroup>
                <CommandItem value={`__custom__${trimmedSearch}`} onSelect={commitCustomValue}>
                  <Plus className="mr-2 h-4 w-4" />
                  {customValueLabel(trimmedSearch)}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

type ComboboxMultiProps = {
  options: ComboboxOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  emptyText?: string;
  searchPlaceholder?: string;
  /** Allow adding free-text values that aren't in `options` (adds an "Ajouter «…»" item). */
  allowCustomValues?: boolean;
  disabled?: boolean;
  className?: string;
};

/**
 * Multi-select variant of Combobox: selected items render as removable
 * badges above the trigger, which reopens the same searchable Command list.
 */
export function ComboboxMulti({
  options,
  values,
  onChange,
  placeholder = "Ajouter…",
  emptyText = "Aucun résultat.",
  searchPlaceholder = "Rechercher…",
  allowCustomValues = false,
  disabled,
  className,
}: ComboboxMultiProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const labelFor = (value: string) => options.find((option) => option.value === value)?.label ?? value;

  const toggleValue = (value: string) => {
    if (values.includes(value)) onChange(values.filter((item) => item !== value));
    else onChange([...values, value]);
  };

  const removeValue = (value: string) => onChange(values.filter((item) => item !== value));

  const trimmedSearch = search.trim();
  const hasExactMatch =
    options.some((option) => option.label.toLowerCase() === trimmedSearch.toLowerCase()) ||
    values.some((item) => item.toLowerCase() === trimmedSearch.toLowerCase());

  const addCustomValue = () => {
    if (!trimmedSearch || hasExactMatch) return;
    onChange([...values, trimmedSearch]);
    setSearch("");
  };

  return (
    <div className={cn("space-y-2", className)}>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {values.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1 py-1 pl-2.5 pr-1 font-normal">
              {labelFor(value)}
              <button
                type="button"
                onClick={() => removeValue(value)}
                aria-label={`Retirer ${labelFor(value)}`}
                className="ml-1 rounded-sm p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="h-9 w-full justify-between font-normal text-muted-foreground"
          >
            <span className="truncate">{placeholder}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
          <Command shouldFilter>
            <CommandInput
              placeholder={searchPlaceholder}
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => toggleValue(option.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        values.includes(option.value) ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
              {allowCustomValues && trimmedSearch && !hasExactMatch && (
                <CommandGroup>
                  <CommandItem value={`__custom__${trimmedSearch}`} onSelect={addCustomValue}>
                    <Plus className="mr-2 h-4 w-4" />
                    Ajouter « {trimmedSearch} »
                  </CommandItem>
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

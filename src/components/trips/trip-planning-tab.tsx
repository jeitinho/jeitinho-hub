import { Fragment, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowRightLeft, Sparkles, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { CatalogLinePicker, type CatalogLineSelection } from "@/components/catalog-line-picker";
import { cn } from "@/lib/utils";

export type PlanningActivity = {
  id: string;
  title: string;
  activity_type: string;
  status: string;
  sale_price: number | string;
  currency: string;
  experience_id: string | null;
  service_id: string | null;
  ticket_offer_id: string | null;
  day: string | null;
  slot: string | null;
  slot_span: number;
  display_time: string | null;
  category: string | null;
  is_offered: boolean;
  kind: string;
};

const SLOTS = [
  { key: "matin", label: "Matin" },
  { key: "midi", label: "Midi" },
  { key: "apres_midi", label: "Après-midi" },
  { key: "soir", label: "Soir" },
  { key: "nuit", label: "Nuit" },
] as const;
type SlotKey = (typeof SLOTS)[number]["key"];

const CATEGORIES = [
  { value: "activite", label: "Activité" },
  { value: "visite", label: "Visite" },
  { value: "deplacement", label: "Déplacement" },
  { value: "soiree", label: "Soirée" },
] as const;

/** DA Ketur : couleurs du planning (Sheets + PDF). */
function cellStyle(a: Pick<PlanningActivity, "kind" | "category"> | null): string {
  if (!a) return "border-2 border-dashed border-border/60 bg-background text-muted-foreground";
  if (a.kind === "free") return "border border-[#dcd6cc] bg-[#dcd6cc] text-foreground";
  if (a.category === "soiree") return "border border-[#a8603e] bg-[#a8603e] text-white";
  if (a.category === "deplacement") return "border border-[#d9b892] bg-[#d9b892] text-foreground";
  return "border border-[#efc99c] bg-[#efc99c] text-foreground";
}

function fmtDayShort(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

function enumerateDays(start: string, end: string): string[] {
  const days: string[] = [];
  let cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + 86_400_000);
  }
  return days;
}

type CellInfo = { day: string; slot: SlotKey; activity: PlanningActivity | null };

export function TripPlanningTab({
  tripId,
  startDate,
  endDate,
  partySize,
  currency,
  activities,
}: {
  tripId: string;
  startDate: string | null;
  endDate: string | null;
  partySize: number | null;
  currency: string;
  activities: PlanningActivity[];
}) {
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["trip", tripId] });
  const [cell, setCell] = useState<CellInfo | null>(null);

  const days = useMemo(
    () => (startDate && endDate ? enumerateDays(startDate, endDate) : []),
    [startDate, endDate],
  );
  const unplaced = activities.filter((a) => !a.day || !a.slot);

  // Index des créneaux de départ par jour+slot, pour savoir quels créneaux sont « couverts »
  // par la fusion (slot_span) d'une activité qui démarre plus tôt dans la journée.
  const bySlot = new Map<string, PlanningActivity>();
  const covered = new Set<string>();
  for (const a of activities) {
    if (!a.day || !a.slot) continue;
    const startIdx = SLOTS.findIndex((s) => s.key === a.slot);
    if (startIdx < 0) continue;
    bySlot.set(`${a.day}|${a.slot}`, a);
    for (let i = startIdx + 1; i < Math.min(startIdx + a.slot_span, SLOTS.length); i++) {
      covered.add(`${a.day}|${SLOTS[i].key}`);
    }
  }

  const openCell = (day: string, slot: SlotKey) => {
    const activity = bySlot.get(`${day}|${slot}`) ?? null;
    setCell({ day, slot, activity });
  };

  const swapDays = async (dayA: string, dayB: string) => {
    const idsA = activities.filter((a) => a.day === dayA).map((a) => a.id);
    const idsB = activities.filter((a) => a.day === dayB).map((a) => a.id);
    if (idsA.length) {
      const { error } = await supabase.from("trip_activities").update({ day: dayB }).in("id", idsA);
      if (error) return void toast.error(error.message);
    }
    if (idsB.length) {
      const { error } = await supabase.from("trip_activities").update({ day: dayA }).in("id", idsB);
      if (error) return void toast.error(error.message);
    }
    toast.success(`Jours échangés (${fmtDayShort(dayA)} ↔ ${fmtDayShort(dayB)})`);
    refresh();
  };

  if (!startDate || !endDate) {
    return (
      <Card className="p-5 text-sm text-muted-foreground">
        Renseigne les dates du voyage (onglet Infos) pour activer le planning.
      </Card>
    );
  }

  const renderCellBadge = (day: string, slotKey: SlotKey) => {
    const key = `${day}|${slotKey}`;
    if (covered.has(key)) return null; // fusionné dans la case précédente
    const activity = bySlot.get(key) ?? null;
    return (
      <button
        key={slotKey}
        type="button"
        onClick={() => openCell(day, slotKey)}
        className={cn(
          "min-h-14 w-full rounded-md p-2 text-left text-xs transition-opacity hover:opacity-90",
          cellStyle(activity),
        )}
        style={
          activity
            ? { gridColumn: `span ${Math.min(activity.slot_span, SLOTS.length)}` }
            : undefined
        }
      >
        {activity ? (
          <>
            <p className="truncate font-medium">{activity.title}</p>
            <p className="truncate opacity-80">
              {activity.display_time ? `${activity.display_time} · ` : ""}
              {activity.is_offered ? "Offert" : ""}
            </p>
          </>
        ) : (
          <span className="opacity-60">+ Ajouter</span>
        )}
      </button>
    );
  };

  return (
    <div className="space-y-6">
      {unplaced.length > 0 && (
        <Card className="space-y-2 p-4">
          <p className="tracked text-[10px] text-muted-foreground">À placer</p>
          <div className="flex flex-wrap gap-2">
            {unplaced.map((a) => (
              <span
                key={a.id}
                className="rounded-full border border-border/70 px-2.5 py-1 text-xs text-muted-foreground"
              >
                {a.title}
              </span>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Tape une case vide du planning pour placer une activité en attente.
          </p>
        </Card>
      )}

      {/* Mobile : un jour = une carte */}
      <div className="space-y-4 md:hidden">
        {days.map((day) => (
          <Card key={day} className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <p className="font-medium capitalize">{fmtDayShort(day)}</p>
              <DaySwapMenu day={day} days={days} onSwap={swapDays} />
            </div>
            <div className="space-y-1.5">
              {SLOTS.map((s) => {
                if (covered.has(`${day}|${s.key}`)) return null;
                const activity = bySlot.get(`${day}|${s.key}`) ?? null;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => openCell(day, s.key)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-md p-2.5 text-left text-xs",
                      cellStyle(activity),
                    )}
                  >
                    <span className="shrink-0 font-medium opacity-70">{s.label}</span>
                    <span className="min-w-0 flex-1 truncate text-right">
                      {activity
                        ? `${activity.title}${activity.display_time ? ` · ${activity.display_time}` : ""}`
                        : "+ Ajouter"}
                    </span>
                  </button>
                );
              })}
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop : jours en lignes, créneaux en colonnes */}
      <div className="hidden md:block">
        <div className="grid grid-cols-[100px_repeat(5,1fr)] gap-2">
          <div />
          {SLOTS.map((s) => (
            <div key={s.key} className="text-center text-xs font-medium text-muted-foreground">
              {s.label}
            </div>
          ))}
          {days.map((day) => (
            <Fragment key={day}>
              <div className="flex items-center justify-between gap-1 text-xs">
                <span className="font-medium capitalize">{fmtDayShort(day)}</span>
                <DaySwapMenu day={day} days={days} onSwap={swapDays} compact />
              </div>
              <div className="col-span-5 grid grid-cols-5 gap-2">
                {SLOTS.map((s) => renderCellBadge(day, s.key))}
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {cell && (
        <CellEditorSheet
          cell={cell}
          tripId={tripId}
          partySize={partySize}
          currency={currency}
          unplaced={unplaced}
          onClose={() => setCell(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function DaySwapMenu({
  day,
  days,
  onSwap,
  compact = false,
}: {
  day: string;
  days: string[];
  onSwap: (a: string, b: string) => void;
  compact?: boolean;
}) {
  const others = days.filter((d) => d !== day);
  if (!others.length) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={compact ? "h-6 w-6" : "h-7 w-7"}
          title="Échanger avec…"
          aria-label="Échanger ce jour avec un autre"
        >
          <ArrowRightLeft className="h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {others.map((d) => (
          <DropdownMenuItem key={d} onSelect={() => onSwap(day, d)}>
            Échanger avec {fmtDayShort(d)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function CellEditorSheet({
  cell,
  tripId,
  partySize,
  currency,
  unplaced,
  onClose,
  onChanged,
}: {
  cell: CellInfo;
  tripId: string;
  partySize: number | null;
  currency: string;
  unplaced: PlanningActivity[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const { day, slot, activity } = cell;
  const slotIdx = SLOTS.findIndex((s) => s.key === slot);
  const [catalogValue, setCatalogValue] = useState("");
  const [freeText, setFreeText] = useState("");
  const [displayTime, setDisplayTime] = useState(activity?.display_time ?? "");
  const [category, setCategory] = useState(activity?.category ?? "activite");
  const [isOffered, setIsOffered] = useState(activity?.is_offered ?? false);
  const [busy, setBusy] = useState(false);

  const close = () => {
    onClose();
  };

  const placeExisting = async (a: PlanningActivity) => {
    setBusy(true);
    const { error } = await supabase
      .from("trip_activities")
      .update({ day, slot, slot_span: 1, category: a.category ?? "activite" })
      .eq("id", a.id);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Activité placée.");
    onChanged();
    close();
  };

  const addFromCatalog = async (selection: CatalogLineSelection) => {
    const quantity = selection.perPerson && partySize ? partySize : 1;
    const salePrice = selection.unitPrice * quantity;
    setBusy(true);
    const { error } = await supabase.from("trip_activities").insert({
      trip_id: tripId,
      experience_id: selection.sourceType === "experience" ? selection.sourceId : null,
      service_id: selection.sourceType === "service" ? selection.sourceId : null,
      ticket_offer_id: selection.sourceType === "ticket" ? selection.sourceId : null,
      title: selection.label,
      activity_type: selection.sourceType ?? "experience",
      status: "to_plan",
      quantity,
      sale_price: salePrice,
      currency: selection.currency,
      day,
      slot,
      category: "activite",
    });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Activité ajoutée au planning.");
    onChanged();
    close();
  };

  const addFreeText = async () => {
    if (!freeText.trim()) return void toast.error("Écris un texte.");
    setBusy(true);
    const { error } = await supabase.from("trip_activities").insert({
      trip_id: tripId,
      title: freeText.trim(),
      activity_type: "note",
      status: "to_plan",
      kind: "note",
      day,
      slot,
      currency,
    });
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Note ajoutée au planning.");
    onChanged();
    close();
  };

  const markFree = async () => {
    setBusy(true);
    const { error } = await supabase.from("trip_activities").insert({
      trip_id: tripId,
      title: "Libre",
      activity_type: "free",
      status: "to_plan",
      kind: "free",
      day,
      slot,
      currency,
    });
    setBusy(false);
    if (error) return void toast.error(error.message);
    onChanged();
    close();
  };

  const extendSlot = async () => {
    if (!activity || slotIdx < 0) return;
    const nextIdx = slotIdx + activity.slot_span;
    if (nextIdx >= SLOTS.length) return;
    setBusy(true);
    const { error } = await supabase
      .from("trip_activities")
      .update({ slot_span: activity.slot_span + 1 })
      .eq("id", activity.id);
    setBusy(false);
    if (error) return void toast.error(error.message);
    onChanged();
    close();
  };

  const saveDetails = async () => {
    if (!activity) return;
    setBusy(true);
    const { error } = await supabase
      .from("trip_activities")
      .update({
        display_time: displayTime.trim() || null,
        category: activity.kind === "activity" ? category : activity.category,
        is_offered: isOffered,
      })
      .eq("id", activity.id);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Enregistré.");
    onChanged();
    close();
  };

  const releaseCell = async () => {
    if (!activity) return;
    setBusy(true);
    if (activity.kind === "free" || activity.kind === "note") {
      const { error } = await supabase.from("trip_activities").delete().eq("id", activity.id);
      setBusy(false);
      if (error) return void toast.error(error.message);
    } else {
      const { error } = await supabase
        .from("trip_activities")
        .update({ day: null, slot: null, slot_span: 1 })
        .eq("id", activity.id);
      setBusy(false);
      if (error) return void toast.error(error.message);
      toast.success("Activité renvoyée en « à placer ».");
    }
    onChanged();
    close();
  };

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="capitalize">
            {fmtDayShort(day)} · {SLOTS[slotIdx]?.label ?? slot}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-5 space-y-5">
          {activity ? (
            <>
              <div>
                <p className="font-medium">{activity.title}</p>
                <Badge variant="outline" className="mt-1">
                  {activity.kind === "free"
                    ? "Libre"
                    : activity.kind === "note"
                      ? "Note"
                      : activity.activity_type}
                </Badge>
              </div>
              {activity.kind === "activity" && (
                <>
                  <div className="space-y-2">
                    <Label>Heure affichée</Label>
                    <Input
                      placeholder="ex. 10H"
                      value={displayTime}
                      onChange={(e) => setDisplayTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Catégorie</Label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={isOffered} onCheckedChange={setIsOffered} />
                    <Label>Offert</Label>
                  </div>
                  <Button size="sm" onClick={saveDetails} disabled={busy}>
                    Enregistrer
                  </Button>
                </>
              )}
              <div className="flex flex-wrap gap-2 border-t pt-4">
                {activity.kind === "activity" && slotIdx + activity.slot_span < SLOTS.length && (
                  <Button size="sm" variant="outline" onClick={extendSlot} disabled={busy}>
                    Étendre au créneau suivant
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={releaseCell} disabled={busy}>
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  {activity.kind === "activity" ? "Libérer ce créneau" : "Supprimer"}
                </Button>
              </div>
            </>
          ) : (
            <>
              {unplaced.length > 0 && (
                <div className="space-y-2">
                  <Label>Activités en attente</Label>
                  <div className="space-y-1.5">
                    {unplaced.map((a) => (
                      <Button
                        key={a.id}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        disabled={busy}
                        onClick={() => placeExisting(a)}
                      >
                        {a.title}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2 border-t pt-4">
                <Label>Catalogue</Label>
                <CatalogLinePicker
                  value={catalogValue}
                  descriptionValue=""
                  onDescriptionChange={() => {}}
                  currency={currency}
                  onSelect={(selection) => {
                    setCatalogValue(`${selection.sourceType}:${selection.sourceId}`);
                    addFromCatalog(selection);
                  }}
                />
              </div>
              <div className="space-y-2 border-t pt-4">
                <Label>Texte libre</Label>
                <div className="flex gap-2">
                  <Input value={freeText} onChange={(e) => setFreeText(e.target.value)} />
                  <Button size="sm" onClick={addFreeText} disabled={busy}>
                    Ajouter
                  </Button>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={markFree} disabled={busy}>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Marquer « Libre »
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

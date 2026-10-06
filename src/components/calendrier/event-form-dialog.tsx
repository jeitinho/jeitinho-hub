import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MANUAL_KINDS,
  addDays,
  dayKey,
  endKeyOf,
  saveCalendarEvent,
  timeOf,
  zonedToIso,
  type CalendarEventRow,
} from "@/lib/ops/calendrier";

type FormState = {
  title: string;
  kind: string;
  location: string;
  description: string;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
};

function initialState(initial: CalendarEventRow | undefined, day: string): FormState {
  if (!initial) {
    return {
      title: "",
      kind: "meeting",
      location: "",
      description: "",
      allDay: false,
      startDate: day,
      startTime: "10:00",
      endDate: day,
      endTime: "11:00",
    };
  }
  const start = dayKey(initial.starts_at);
  return {
    title: initial.title,
    kind: initial.kind,
    location: initial.location ?? "",
    description: initial.description ?? "",
    allDay: initial.all_day,
    startDate: start,
    startTime: initial.all_day ? "10:00" : timeOf(initial.starts_at),
    endDate: initial.all_day
      ? endKeyOf(initial.starts_at, initial.ends_at)
      : initial.ends_at
        ? dayKey(initial.ends_at)
        : start,
    endTime: !initial.all_day && initial.ends_at ? timeOf(initial.ends_at) : "",
  };
}

export function EventFormDialog({
  initial,
  day,
  onClose,
  onSaved,
}: {
  initial?: CalendarEventRow;
  day: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState<FormState>(() => initialState(initial, day));
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setF((prev) => ({ ...prev, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!f.title.trim() || !f.startDate) return;
    const endDate = f.endDate && f.endDate >= f.startDate ? f.endDate : f.startDate;
    let starts_at: string;
    let ends_at: string | null;
    if (f.allDay) {
      starts_at = zonedToIso(f.startDate);
      ends_at = zonedToIso(addDays(endDate, 1)); // fin exclusive à minuit
    } else {
      starts_at = zonedToIso(f.startDate, f.startTime || "00:00");
      ends_at = f.endTime ? zonedToIso(endDate, f.endTime) : null;
      if (ends_at && ends_at <= starts_at) {
        toast.error("La fin doit être après le début.");
        return;
      }
    }
    setSaving(true);
    try {
      await saveCalendarEvent({
        id: initial?.id,
        title: f.title.trim(),
        kind: f.kind,
        location: f.location.trim() || null,
        description: f.description.trim() || null,
        all_day: f.allDay,
        starts_at,
        ends_at,
      });
      toast.success(initial ? "Rendez-vous modifié" : "Rendez-vous ajouté");
      onSaved();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Modifier le rendez-vous" : "Nouveau rendez-vous"}</DialogTitle>
          <DialogDescription>Heures de Rio (America/Sao_Paulo).</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="cal-title">Titre</Label>
            <Input
              id="cal-title"
              value={f.title}
              onChange={(e) => set("title", e.target.value)}
              required
              autoFocus
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select value={f.kind} onValueChange={(v) => set("kind", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MANUAL_KINDS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>
                      {k.label}
                    </SelectItem>
                  ))}
                  {!MANUAL_KINDS.some((k) => k.value === f.kind) && (
                    <SelectItem value={f.kind}>{f.kind}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cal-location">Lieu</Label>
              <Input
                id="cal-location"
                value={f.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <Switch checked={f.allDay} onCheckedChange={(v) => set("allDay", v)} />
            Journée entière
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="cal-start-date">Début</Label>
              <Input
                id="cal-start-date"
                type="date"
                value={f.startDate}
                onChange={(e) => {
                  const v = e.target.value;
                  setF((prev) => ({
                    ...prev,
                    startDate: v,
                    endDate: prev.endDate < v ? v : prev.endDate,
                  }));
                }}
                required
              />
              {!f.allDay && (
                <Input
                  type="time"
                  aria-label="Heure de début"
                  value={f.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                  required
                />
              )}
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="cal-end-date">Fin</Label>
              <Input
                id="cal-end-date"
                type="date"
                min={f.startDate}
                value={f.endDate}
                onChange={(e) => set("endDate", e.target.value)}
              />
              {!f.allDay && (
                <Input
                  type="time"
                  aria-label="Heure de fin"
                  value={f.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                />
              )}
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="cal-notes">Notes</Label>
            <Textarea
              id="cal-notes"
              rows={3}
              value={f.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !f.title.trim()}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

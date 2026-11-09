import { useState } from "react";
import { Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { t } from "@/lib/i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/** « 09h30 » → « 09:30 » ; « Heure ? », « Matin »… → "" */
export function labelToInput(label: string): string {
  const m = label.match(/^(\d{1,2})h(\d{2})$/);
  return m && label !== "00h00" ? `${m[1].padStart(2, "0")}:${m[2]}` : "";
}

/**
 * Heure (et date) d'une sortie, modifiable d'un geste. Quand l'heure manque
 * (GetYourGuide envoie parfois la date seule), le bouton le signale clairement.
 */
export function TimeEditor({
  source,
  id,
  index,
  day,
  label,
  canEdit,
  onSaved,
  className = "",
}: {
  source: string;
  id: string;
  index: number;
  day: string;
  label: string;
  canEdit: boolean;
  onSaved: () => void;
  className?: string;
}) {
  const unknown = label === "00h00" || label === "Heure ?" || label === "?" || label === "—";
  const [open, setOpen] = useState(false);
  const [d, setD] = useState(day);
  const [time, setTime] = useState(labelToInput(label));
  const [saving, setSaving] = useState(false);

  const shown = unknown ? t("Heure ?") : label;
  if (!canEdit) return <span className={className}>{shown}</span>;

  const save = async () => {
    if (!/^\d{2}:\d{2}$/.test(time)) return toast.error(t("Choisis une heure."));
    setSaving(true);
    const { error } = await db.rpc("dispatch_set_time", {
      p_source: source === "voyage" || source === "site" ? source : "ota",
      p_id: id,
      p_index: index,
      p_day: d,
      p_time: time,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(t("Heure enregistrée"));
    setOpen(false);
    onSaved();
  };

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) {
          setD(day);
          setTime(labelToInput(label));
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          title={t("Changer l'heure")}
          className={`group inline-flex items-center gap-1 rounded-md transition-colors ${
            unknown
              ? "border border-dashed border-amber-500/70 bg-amber-50 px-1.5 py-0.5 text-amber-800 hover:bg-amber-100"
              : "-mx-1 px-1 hover:bg-muted"
          } ${className}`}
        >
          {unknown && <Clock className="h-3.5 w-3.5" />}
          <span>{shown}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-64 space-y-3 p-3">
        <p className="text-[13px] font-semibold">{t("Heure de la sortie")}</p>
        <div className="grid grid-cols-[1fr_6.5rem] gap-2">
          <Input type="date" value={d} onChange={(e) => e.target.value && setD(e.target.value)} />
          <Input
            type="time"
            step={300}
            value={time}
            autoFocus
            onChange={(e) => setTime(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void save()}
          />
        </div>
        <p className="text-[12px] text-muted-foreground">{t("Heure de Rio.")}</p>
        <Button className="w-full" size="sm" disabled={saving || !time} onClick={() => void save()}>
          {saving ? t("Enregistrement…") : t("Enregistrer")}
        </Button>
      </PopoverContent>
    </Popover>
  );
}

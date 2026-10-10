import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { fromRioInput, toRioInput } from "@/lib/rio-time";
import {
  DEMANDES_RELATED_KEYS,
  deleteDemande,
  fetchDemandeEditable,
  updateDemande,
  type Demande,
} from "@/lib/ops/demandes";

type FormState = {
  name: string;
  email: string;
  phone: string;
  travel_start: string;
  travel_end: string;
  party_size: string;
  activities: string;
  message: string;
  notes: string;
  next_action: string;
  next_action_at: string;
};

const EMPTY: FormState = {
  name: "",
  email: "",
  phone: "",
  travel_start: "",
  travel_end: "",
  party_size: "",
  activities: "",
  message: "",
  notes: "",
  next_action: "",
  next_action_at: "",
};

function useRefreshDemandes() {
  const qc = useQueryClient();
  return () =>
    Promise.all(DEMANDES_RELATED_KEYS.map((queryKey) => qc.invalidateQueries({ queryKey })));
}

/** Formulaire « Modifier la demande » (prospect, ou lead non qualifié). */
export function DemandeEditForm({ demande: d, onDone }: { demande: Demande; onDone: () => void }) {
  const refresh = useRefreshDemandes();
  const { data, isLoading, error } = useQuery({
    queryKey: ["demande-edit", d.kind, d.id],
    queryFn: () => fetchDemandeEditable(d),
    staleTime: 0,
  });
  const [f, setF] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!data) return;
    setF({
      name: data.name,
      email: data.email ?? "",
      phone: data.phone ?? "",
      travel_start: data.travel_start ?? "",
      travel_end: data.travel_end ?? "",
      party_size: data.party_size ? String(data.party_size) : "",
      activities: data.activities.join(", "),
      message: data.message ?? "",
      notes: data.notes ?? "",
      next_action: data.next_action ?? "",
      next_action_at: toRioInput(data.next_action_at),
    });
  }, [data]);
  const set =
    (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF((cur) => ({ ...cur, [k]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await updateDemande(d, {
        name: f.name,
        email: f.email.trim() || null,
        phone: f.phone.trim() || null,
        travel_start: f.travel_start || null,
        travel_end: f.travel_end || null,
        party_size: f.party_size ? Math.max(1, Math.round(Number(f.party_size))) : null,
        activities: f.activities
          .split(/[,\n]/)
          .map((a) => a.trim())
          .filter(Boolean),
        message: f.message.trim() || null,
        notes: f.notes.trim() || null,
        next_action: f.next_action.trim() || null,
        next_action_at: fromRioInput(f.next_action_at),
      });
      await refresh();
      toast.success("Demande mise à jour.");
      onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error) return <p className="text-sm text-destructive">{(error as Error).message}</p>;

  return (
    <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nom" className="sm:col-span-2">
          <Input value={f.name} onChange={set("name")} maxLength={120} />
        </Field>
        <Field label="E-mail">
          <Input type="email" value={f.email} onChange={set("email")} maxLength={200} />
        </Field>
        <Field label="Téléphone">
          <Input value={f.phone} onChange={set("phone")} maxLength={40} />
        </Field>
        <Field label="Arrivée">
          <Input type="date" value={f.travel_start} onChange={set("travel_start")} />
        </Field>
        <Field label="Départ">
          <Input type="date" value={f.travel_end} onChange={set("travel_end")} />
        </Field>
        <Field label="Nombre de personnes">
          <Input type="number" min={1} value={f.party_size} onChange={set("party_size")} />
        </Field>
        <Field label="Activités (séparées par des virgules)">
          <Input value={f.activities} onChange={set("activities")} />
        </Field>
        <Field label="Message" className="sm:col-span-2">
          <Textarea className="min-h-20" value={f.message} onChange={set("message")} />
        </Field>
        {d.kind === "prospect" && (
          <Field label="Notes internes" className="sm:col-span-2">
            <Textarea className="min-h-16" value={f.notes} onChange={set("notes")} />
          </Field>
        )}
        <Field label="Prochaine action">
          <Input
            value={f.next_action}
            onChange={set("next_action")}
            placeholder="Ex. rappeler sur WhatsApp"
            maxLength={200}
          />
        </Field>
        <Field label="Quand (heure de Rio)">
          <Input type="datetime-local" value={f.next_action_at} onChange={set("next_action_at")} />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="btn-primary" disabled={saving} onClick={save}>
          {saving ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-3.5 w-3.5" />
          )}
          Enregistrer
        </Button>
        <Button size="sm" variant="ghost" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

/** Bouton « Supprimer la demande » avec confirmation. */
export function DeleteDemandeButton({
  demande: d,
  onDeleted,
}: {
  demande: Demande;
  onDeleted: () => void;
}) {
  const refresh = useRefreshDemandes();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const linkedLeads = d.kind === "prospect" ? d.leads.length : 0;

  const confirm = async () => {
    setBusy(true);
    try {
      await deleteDemande(d);
      await refresh();
      toast.success("Demande supprimée.");
      setOpen(false);
      onDeleted();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
      setOpen(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="h-8 text-xs text-destructive hover:text-destructive"
        onClick={() => setOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
        Supprimer la demande
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la demande de {d.name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              {d.quotes.length > 0
                ? `Cette demande a ${d.quotes.length} devis : la suppression sera refusée. Passez-la plutôt en « Perdue ».`
                : `La demande${linkedLeads ? `, les ${linkedLeads} message(s) reçu(s) du site` : ""} et ses tâches seront supprimés définitivement.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy || d.quotes.length > 0}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void confirm();
              }}
            >
              {busy ? "Suppression…" : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

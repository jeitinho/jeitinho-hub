import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { askRafael, type CmEvent } from "@/lib/ops/cm";

const NONE = "__none__";

/** Bouton « Demander à Rafael » : crée la demande et prévient Rafael sur WhatsApp. */
export function AskRafaelDialog({
  events = [],
  trigger,
}: {
  events?: CmEvent[];
  trigger?: React.ReactNode;
}) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [eventId, setEventId] = useState(NONE);
  const [neededBy, setNeededBy] = useState("");

  const send = useMutation({
    mutationFn: () =>
      askRafael({
        subject: subject.trim(),
        details: details.trim(),
        eventId: eventId === NONE ? null : eventId,
        neededBy: neededBy || null,
      }),
    onSuccess: () => {
      toast.success("Demande envoyée à Rafael. Tu seras prévenue sur WhatsApp.");
      setSubject("");
      setDetails("");
      setEventId(NONE);
      setNeededBy("");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["team-requests"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button className="btn-primary">
            <Send className="mr-2 h-3.5 w-3.5" />
            Demander à Rafael
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Demander à Rafael</DialogTitle>
          <DialogDescription>
            Tout ce qui sort des postages et du contenu : budget, pub payante, partenaires, infos à
            confirmer, accès… Rafael reçoit ta demande sur WhatsApp.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!subject.trim()) return toast.error("Écris l'objet de ta demande.");
            send.mutate();
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="ask-subject">Objet</Label>
            <Input
              id="ask-subject"
              value={subject}
              maxLength={200}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Ex. Valider le budget pub de la semaine"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ask-details">Détails</Label>
            <Textarea
              id="ask-details"
              rows={4}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Le contexte, ce dont tu as besoin, les liens utiles."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {events.length > 0 && (
              <div className="space-y-1.5">
                <Label>Soirée concernée</Label>
                <Select value={eventId} onValueChange={setEventId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Aucune en particulier</SelectItem>
                    {events.map((ev) => (
                      <SelectItem key={ev.id} value={ev.id}>
                        {ev.name}
                        {ev.edition ? ` · ${ev.edition}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="ask-date">Pour quand ?</Label>
              <Input
                id="ask-date"
                type="date"
                value={neededBy}
                onChange={(e) => setNeededBy(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="btn-primary" disabled={send.isPending}>
              {send.isPending ? "Envoi…" : "Envoyer la demande"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

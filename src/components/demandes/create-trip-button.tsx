import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { createOrFindTripFromProspect } from "@/lib/trips/create-trip-from-prospect";
import type { Demande } from "@/lib/ops/demandes";

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/** Bouton « Créer le voyage » (mode manuel) — idempotent, réutilise le voyage déjà lié s'il existe. */
export function CreateTripButton({ demande, className }: { demande: Demande; className?: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  // La demande n'a pas toujours des dates/pax (souvent pas encore connus au premier contact) :
  // on les demande avant de créer le voyage plutôt que de le laisser à moitié vide.
  const [askOpen, setAskOpen] = useState(false);
  const [start, setStart] = useState(demande.travelStart ?? "");
  const [end, setEnd] = useState(demande.travelEnd ?? "");
  const [partySize, setPartySize] = useState(demande.partySize ? String(demande.partySize) : "");

  const create = async (overrides?: {
    travel_start: string | null;
    travel_end: string | null;
    party_size: number | null;
  }) => {
    setBusy(true);
    try {
      const tripId = await createOrFindTripFromProspect({
        id: demande.id,
        name: demande.name,
        client_id: demande.clientId,
        travel_start: overrides ? overrides.travel_start : demande.travelStart,
        travel_end: overrides ? overrides.travel_end : demande.travelEnd,
        party_size: overrides ? overrides.party_size : demande.partySize,
        activities: demande.activities,
      });
      setAskOpen(false);
      navigate({ to: "/voyages/$id", params: { id: tripId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de créer le voyage.");
    } finally {
      setBusy(false);
    }
  };

  const onClick = (e: { stopPropagation: () => void }) => {
    stop(e);
    if (demande.travelStart && demande.travelEnd && demande.partySize) {
      create();
      return;
    }
    // Dates ou pax manquants sur la demande : on les demande pour créer un voyage déjà utilisable.
    setAskOpen(true);
  };

  const confirmAsk = () => {
    create({
      travel_start: start || null,
      travel_end: end || null,
      party_size: partySize ? Number(partySize) : null,
    });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        className={cn("h-8 gap-1 px-2.5 text-[11px]", className)}
        onClick={onClick}
        title="Créer le voyage"
      >
        <Map className="h-3.5 w-3.5" />
        {busy ? "Création…" : "Créer le voyage"}
      </Button>
      <Dialog open={askOpen} onOpenChange={setAskOpen}>
        <DialogContent onClick={stop}>
          <DialogHeader>
            <DialogTitle>Créer le voyage de {demande.name}</DialogTitle>
            <DialogDescription>
              Dates et nombre de personnes pas encore connus sur cette demande — complète-les pour
              créer un voyage déjà prêt (modifiable ensuite dans l'onglet Infos).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Début</Label>
              <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Fin</Label>
              <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nombre de personnes</Label>
              <Input
                type="number"
                min="1"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAskOpen(false)}>
              Annuler
            </Button>
            <Button onClick={confirmAsk} disabled={busy}>
              {busy ? "Création…" : "Créer le voyage"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

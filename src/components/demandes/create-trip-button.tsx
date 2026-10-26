import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Map } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createOrFindTripFromProspect } from "@/lib/trips/create-trip-from-prospect";
import type { Demande } from "@/lib/ops/demandes";

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

/** Bouton « Créer le voyage » (mode manuel) — idempotent, réutilise le voyage déjà lié s'il existe. */
export function CreateTripButton({ demande, className }: { demande: Demande; className?: string }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const createTrip = async (e: { stopPropagation: () => void }) => {
    stop(e);
    setBusy(true);
    try {
      const tripId = await createOrFindTripFromProspect({
        id: demande.id,
        name: demande.name,
        client_id: demande.clientId,
        travel_start: demande.travelStart,
        travel_end: demande.travelEnd,
        party_size: demande.partySize,
        activities: demande.activities,
      });
      navigate({ to: "/voyages/$id", params: { id: tripId } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible de créer le voyage.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={busy}
      className={cn("h-8 gap-1 px-2.5 text-[11px]", className)}
      onClick={createTrip}
      title="Créer le voyage"
    >
      <Map className="h-3.5 w-3.5" />
      {busy ? "Création…" : "Créer le voyage"}
    </Button>
  );
}

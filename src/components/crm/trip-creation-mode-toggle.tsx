import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useTripCreationMode } from "@/lib/trips/settings";

/**
 * Manuel (bouton « Créer le voyage » sur la demande) ou automatique (voyage brouillon créé
 * dès l'arrivée du formulaire sur jeitinho.fr). Un seul réglage pour toute l'équipe.
 */
export function TripCreationModeToggle() {
  const { mode, isLoading, setMode } = useTripCreationMode();
  if (isLoading || !mode) return null;
  return (
    <div className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-xs">
      <Label htmlFor="trip-creation-mode" className="text-muted-foreground">
        Voyage auto à la demande
      </Label>
      <Switch
        id="trip-creation-mode"
        checked={mode === "automatic"}
        disabled={setMode.isPending}
        onCheckedChange={(checked) => setMode.mutate(checked ? "automatic" : "manual")}
      />
    </div>
  );
}

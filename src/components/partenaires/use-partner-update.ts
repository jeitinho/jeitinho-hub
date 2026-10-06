import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updatePartner, type PartnerPatch } from "@/lib/ops/partenaires";

export const PARTNERS_KEY = ["partenaires"] as const;

/** Mise à jour d'un partenaire + toast + rafraîchissement des listes. */
export function usePartnerUpdate() {
  const qc = useQueryClient();
  return async (id: string, patch: PartnerPatch, msg = "Partenaire mis à jour") => {
    try {
      await updatePartner(id, patch);
      toast.success(msg);
      await qc.invalidateQueries({ queryKey: PARTNERS_KEY });
      void qc.invalidateQueries({ queryKey: ["ops", "partners"] });
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
}

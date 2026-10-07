import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { PARTNERS_KEY } from "@/components/partenaires/use-partner-update";
import { buildPartnerTimeline, fetchPartnerTimelineRaw } from "@/lib/ops/client360";
import type { Partner } from "@/lib/ops/partenaires";
import { Timeline } from "./timeline";

/** Chronologie d'un partenaire : tâches (message repliable), contacts, ventes, codes promo. */
export function PartnerTimeline({ partner }: { partner: Partner }) {
  // Sous PARTNERS_KEY : chaque mise à jour du partenaire rafraîchit aussi la chronologie.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [...PARTNERS_KEY, "timeline", partner.id],
    queryFn: () => fetchPartnerTimelineRaw(partner),
  });
  const items = useMemo(() => (data ? buildPartnerTimeline(partner, data) : []), [data, partner]);

  if (isLoading) return <p className="text-xs text-muted-foreground">Chargement…</p>;
  if (error)
    return (
      <p className="text-xs text-destructive">
        {(error as Error).message}{" "}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Réessayer
        </button>
      </p>
    );
  return <Timeline items={items} compact emptyLabel="Aucun historique pour ce partenaire." />;
}

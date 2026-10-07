import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchMyTrips } from "@/lib/ops/my-work";

function day(d: string | null) {
  if (!d) return "—";
  return new Date(`${d}T12:00:00`).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Accueil des guides et prestataires : leurs prochaines sorties, sans prix ni marge. */
export function TerrainHome() {
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({ queryKey: ["my-trips"], queryFn: fetchMyTrips });
  if (isLoading) return <Card className="p-6 text-sm text-muted-foreground">Chargement…</Card>;
  if (error)
    return <Card className="p-6 text-sm text-destructive">{(error as Error).message}</Card>;
  if (data.length === 0)
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        Aucune sortie prévue pour toi pour le moment.
      </Card>
    );
  return (
    <div className="space-y-3">
      <h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>
        Tes prochaines sorties
      </h2>
      {data.map((t) => (
        <Card key={t.id} className="p-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs capitalize text-muted-foreground">
                {day(t.start_date)}
                {t.end_date && t.end_date !== t.start_date ? ` → ${day(t.end_date)}` : ""}
              </p>
              <p className="mt-1 font-medium">{t.title ?? t.reference}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.party_size ? `${t.party_size} personne${t.party_size > 1 ? "s" : ""}` : "Groupe"}
                {t.client_first_name ? ` · contact : ${t.client_first_name}` : ""}
              </p>
            </div>
            {t.reference && <Badge variant="outline">{t.reference}</Badge>}
          </div>
          {t.notes && <p className="mt-3 whitespace-pre-wrap text-sm">{t.notes}</p>}
        </Card>
      ))}
    </div>
  );
}

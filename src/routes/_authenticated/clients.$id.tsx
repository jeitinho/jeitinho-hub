import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { toast } from "sonner";
import { History, StickyNote } from "lucide-react";
import { fetchClient, updateClient } from "@/lib/clients-gateway";
import { fetchOtaBookings } from "@/lib/ops/ops";
import { buildClient360, fetchClient360Raw, prependNote } from "@/lib/ops/client360";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { OtaBookingsList } from "@/components/ops/ota-bookings";
import { ClientHeader } from "@/components/client360/client-header";
import { ValuePanel } from "@/components/client360/value-panel";
import { Timeline } from "@/components/client360/timeline";
import { ClientEditSection } from "@/components/client360/client-edit-section";
import { PanelTitle } from "@/components/client360/bits";

export const Route = createFileRoute("/_authenticated/clients/$id")({
  component: ClientDetail,
  head: () => ({ meta: [{ title: "Client — JEITINHO" }] }),
});

function ClientDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const clientQ = useQuery({ queryKey: ["client", id], queryFn: () => fetchClient(id) });
  const client = clientQ.data;
  // Même clé que OtaBookingsList : un changement de statut y met aussi à jour la fiche.
  const otaQ = useQuery({
    queryKey: ["ops", "ota-bookings", id],
    queryFn: () => fetchOtaBookings({ clientId: id }),
  });
  const rawQ = useQuery({
    queryKey: ["client360", id, client?.email ?? "", client?.phone ?? ""],
    queryFn: () => fetchClient360Raw(client!),
    enabled: Boolean(client),
  });

  const view = useMemo(
    () =>
      client && rawQ.data ? buildClient360(client, { ...rawQ.data, ota: otaQ.data ?? [] }) : null,
    [client, rawQ.data, otaQ.data],
  );

  const refreshClient = async () => {
    await clientQ.refetch();
    await qc.invalidateQueries({ queryKey: ["clients"] });
    await qc.invalidateQueries({ queryKey: ["client360", id] });
  };

  const addNote = async (text: string) => {
    try {
      // Relit la fiche juste avant pour ne pas écraser une note ajoutée ailleurs.
      const fresh = await fetchClient(id);
      await updateClient(id, { notes: prependNote(fresh.notes, text) });
      toast.success("Note ajoutée");
      await refreshClient();
      return true;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible d'ajouter la note.");
      return false;
    }
  };

  if (clientQ.isLoading)
    return (
      <PageShell eyebrow="Client" title="Chargement…">
        <p className="text-sm text-muted-foreground">Chargement de la fiche…</p>
      </PageShell>
    );
  if (clientQ.error || !client)
    return (
      <PageShell title="Client introuvable">
        <Card className="border-destructive/40 p-8">
          <h2 className="font-semibold">Impossible de charger ce client</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {clientQ.error instanceof Error ? clientQ.error.message : "Fiche client introuvable."}
          </p>
          <Button className="mt-4" variant="outline" onClick={() => void clientQ.refetch()}>
            Réessayer
          </Button>
        </Card>
      </PageShell>
    );

  const dataError = rawQ.error ?? otaQ.error;
  const hasOta = (otaQ.data?.length ?? 0) > 0;

  return (
    <PageShell eyebrow="Client" title={client.full_name}>
      <ClientHeader client={client} view={view} onAddNote={addNote} />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <aside className="space-y-4 lg:order-2">
          {view ? (
            <ValuePanel view={view} />
          ) : (
            !dataError && (
              <Card className="p-4 text-sm text-muted-foreground">Calcul de la valeur…</Card>
            )
          )}
          <Card className="p-4">
            <PanelTitle icon={<StickyNote className="h-3.5 w-3.5" />}>Notes</PanelTitle>
            {client.notes ? (
              <p className="max-h-72 overflow-y-auto whitespace-pre-wrap break-words text-sm leading-relaxed">
                {client.notes}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Aucune note. Utilisez « Ajouter une note » en haut de la fiche.
              </p>
            )}
          </Card>
        </aside>

        <div className="min-w-0 space-y-6 lg:order-1">
          <Card className="p-5">
            <h2
              className="mb-4 flex items-center gap-2 text-lg"
              style={{ fontFamily: "Fraunces, serif" }}
            >
              <History className="h-4 w-4 text-muted-foreground" />
              Chronologie
            </h2>
            {dataError ? (
              <div className="rounded-md border border-destructive/40 p-4 text-sm">
                <p>Historique indisponible : {(dataError as Error).message}</p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-3"
                  onClick={() => {
                    void rawQ.refetch();
                    void otaQ.refetch();
                  }}
                >
                  Réessayer
                </Button>
              </div>
            ) : !view ? (
              <p className="text-sm text-muted-foreground">Chargement de l'historique…</p>
            ) : (
              <Timeline items={view.items} />
            )}
          </Card>

          {hasOta && (
            <Card className="p-5">
              <h2 className="mb-4 text-lg" style={{ fontFamily: "Fraunces, serif" }}>
                Réservations plateformes
              </h2>
              <OtaBookingsList clientId={id} compact />
            </Card>
          )}

          <ClientEditSection client={client} onSaved={refreshClient} />
        </div>
      </div>
    </PageShell>
  );
}

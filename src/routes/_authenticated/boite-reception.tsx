import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Inbox, RefreshCw } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/boite-reception")({
  component: BoiteReceptionPage,
  head: () => ({ meta: [{ title: "Boîte de réception — JEITINHO" }] }),
});

type Demande = {
  source: string;
  id: string;
  nom: string | null;
  email: string | null;
  telephone: string | null;
  received_at: string | null;
  statut: string | null;
  message: string | null;
  lien: string;
};

const SOURCE_LABELS: Record<string, string> = {
  lead: "Site",
  trouver_jeitinho: "Trouver un Jeitinho",
  reservation_site: "Réservation",
  devis_nordeste: "Devis Nordeste",
};

function sourceLabel(source: string) {
  if (source.startsWith("ota_")) return source.slice(4) || "OTA";
  return SOURCE_LABELS[source] ?? source;
}

/**
 * Lien vers la fiche, décidé ici plutôt que depuis la vue : la vue donne une
 * destination par source, mais les seules pages d'admin existantes pour
 * trier une demande sont /crm (toutes sources sauf OTA) et /dispatch (OTA).
 */
function demandeLink(source: string): "/crm" | "/dispatch" {
  return source.startsWith("ota_") ? "/dispatch" : "/crm";
}

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

async function fetchDemandes(): Promise<Demande[]> {
  const { data, error } = await (supabase as any)
    .from("demandes_unifiees")
    .select("*")
    .order("received_at", { ascending: false, nullsFirst: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as Demande[];
}

export function BoiteReceptionPage() {
  const { data = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["demandes-unifiees"],
    queryFn: fetchDemandes,
  });

  return (
    <PageShell
      eyebrow="Pipeline commercial"
      title="Boîte de réception"
      description="Toutes les demandes entrantes, source par source : site, Trouver un Jeitinho, réservations, GetYourGuide, devis Nordeste. Lecture seule — pour agir, ouvre la fiche via le lien."
      actions={
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      }
    >
      {error ? (
        <Card className="border-destructive/40 p-8">
          <h3 className="font-semibold">Impossible de charger les demandes</h3>
          <p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="hidden md:table-cell">Message</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Fiche</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                    Chargement…
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-14 text-center">
                    <Inbox className="mx-auto mb-3 h-6 w-6 text-primary" />
                    <p className="text-sm text-muted-foreground">Aucune demande pour l'instant.</p>
                  </TableCell>
                </TableRow>
              )}
              {data.map((d) => (
                <TableRow key={`${d.source}-${d.id}`}>
                  <TableCell className="whitespace-nowrap text-sm">{fmtDate(d.received_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{sourceLabel(d.source)}</Badge>
                  </TableCell>
                  <TableCell>
                    <p className="font-medium">{d.nom ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{d.email ?? d.telephone ?? "—"}</p>
                  </TableCell>
                  <TableCell className="hidden max-w-[320px] truncate text-sm text-muted-foreground md:table-cell">
                    {d.message ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{d.statut ?? "—"}</TableCell>
                  <TableCell className="text-right">
                    <Link to={demandeLink(d.source)}>
                      <Button size="sm" variant="ghost">
                        Ouvrir
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </PageShell>
  );
}

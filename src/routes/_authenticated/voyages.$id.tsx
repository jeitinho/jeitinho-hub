import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { ArrowLeft, CheckCircle2, ClipboardList, Pencil, Plus, Save, Ticket, Trash2, Users, Wallet, Wrench, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TripActivityEditor } from "@/components/trips/activity-editor";
import { TripExperiencePicker } from "@/components/trips/experience-picker-v2";
import { TripServicePicker } from "@/components/trips/service-picker";
import { TripTicketPicker } from "@/components/trips/ticket-picker";

export const Route = createFileRoute("/_authenticated/voyages/$id")({
  component: TripDetail,
  head: () => ({ meta: [{ title: "Voyage — JEITINHO" }] }),
});

const activityStatuses = [
  "to_plan",
  "confirmed",
  "client_informed",
  "completed",
  "cancelled",
] as const;

function TripDetail() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [travelerName, setTravelerName] = useState("");
  const [travelerRole, setTravelerRole] = useState("Voyageur");
  const [travelerPhone, setTravelerPhone] = useState("");
  const [travelerNotes, setTravelerNotes] = useState("");
  const [editingTrip, setEditingTrip] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      const [tripResult, travelersResult, activitiesResult] = await Promise.all([
        supabase.from("trips").select("*").eq("id", id).single(),
        supabase.from("trip_travelers").select("*").eq("trip_id", id).order("created_at"),
        supabase
          .from("trip_activities")
          .select("*")
          .eq("trip_id", id)
          .order("scheduled_start", { ascending: true, nullsFirst: false }),
      ]);

      if (tripResult.error) throw tripResult.error;
      if (travelersResult.error) throw travelersResult.error;
      if (activitiesResult.error) throw activitiesResult.error;

      const client = tripResult.data.client_id
        ? (
            await supabase
              .from("clients")
              .select("id,full_name,email,phone")
              .eq("id", tripResult.data.client_id)
              .maybeSingle()
          ).data
        : null;

      const partnerIds = [
        ...new Set((activitiesResult.data ?? []).map((activity) => activity.partner_id).filter(Boolean)),
      ];
      const partners = partnerIds.length
        ? (
            await supabase
              .from("partners")
              .select("id,name,phone")
              .in("id", partnerIds)
          ).data ?? []
        : [];
      const partnerMap = new Map(partners.map((partner) => [partner.id, partner]));

      return {
        trip: tripResult.data,
        travelers: travelersResult.data ?? [],
        activities: (activitiesResult.data ?? []).map((activity) => ({
          ...activity,
          partner: activity.partner_id ? partnerMap.get(activity.partner_id) ?? null : null,
        })),
        client,
      };
    },
  });

  if (isLoading) {
    return (
      <PageShell title="Chargement du voyage…">
        <Card className="h-64 animate-pulse bg-muted/50" />
      </PageShell>
    );
  }

  if (error || !data) {
    return (
      <PageShell title="Voyage introuvable">
        <Card className="border-destructive/40 p-8">
          {error instanceof Error ? error.message : "Impossible de charger ce voyage."}
        </Card>
      </PageShell>
    );
  }

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["trip", id] });

  const addTraveler = async () => {
    if (!travelerName.trim()) {
      toast.error("Renseigne le nom du voyageur.");
      return;
    }

    const { error: insertError } = await supabase.from("trip_travelers").insert({
      trip_id: id,
      full_name: travelerName.trim(),
      role: travelerRole.trim() || "Voyageur",
      phone: travelerPhone.trim() || null,
      notes: travelerNotes.trim() || null,
    });

    if (insertError) {
      toast.error(insertError.message);
      return;
    }

    toast.success("Voyageur ajouté");
    setTravelerName("");
    setTravelerPhone("");
    setTravelerNotes("");
    refresh();
  };

  const updateActivityStatus = async (activityId: string, status: string) => {
    const payload: Record<string, unknown> = { status };
    if (status === "client_informed") payload.client_informed_at = new Date().toISOString();
    if (status === "completed") payload.completed_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from("trip_activities")
      .update(payload)
      .eq("id", activityId);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    toast.success("Statut mis à jour");
    refresh();
  };

  const deleteActivity = async (activityId: string) => {
    if (!confirm("Supprimer cette prestation du voyage ?")) return;

    const { error: deleteError } = await supabase
      .from("trip_activities")
      .delete()
      .eq("id", activityId);

    if (deleteError) {
      toast.error(deleteError.message);
      return;
    }

    toast.success("Prestation supprimée");
    setEditingActivity(null);
    refresh();
  };

  const updateTrip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = String(formData.get("title") ?? "").trim();
    const start = String(formData.get("start_date") ?? "") || null;
    const end = String(formData.get("end_date") ?? "") || null;

    if (!title) {
      toast.error("Le titre est obligatoire.");
      return;
    }
    if (start && end && end < start) {
      toast.error("La date de fin doit être après le début.");
      return;
    }

    const { error: updateError } = await supabase
      .from("trips")
      .update({
        title,
        start_date: start,
        end_date: end,
        currency: String(formData.get("currency") ?? "EUR").toUpperCase(),
        party_size: formData.get("party_size") ? Number(formData.get("party_size")) : null,
        status: String(formData.get("status") ?? "draft"),
        notes: String(formData.get("notes") ?? "").trim() || null,
      })
      .eq("id", id);

    if (updateError) {
      toast.error(updateError.message);
      return;
    }

    toast.success("Voyage enregistré");
    setEditingTrip(false);
    refresh();
  };

  const totalSale = data.activities.reduce((sum, activity) => sum + Number(activity.sale_price || 0), 0);
  const totalCost = data.activities.reduce((sum, activity) => sum + Number(activity.supplier_cost || 0), 0);
  const totalCommission = data.activities.reduce(
    (sum, activity) => sum + Number(activity.commission_amount || 0),
    0,
  );
  const totalMargin = data.activities.reduce((sum, activity) => sum + Number(activity.margin_amount || 0), 0);
  const experiences = data.activities.filter((activity) => activity.activity_type === "experience");
  const services = data.activities.filter((activity) => activity.activity_type === "service");
  const tickets = data.activities.filter((activity) => activity.activity_type === "ticket");

  return (
    <PageShell
      eyebrow="Conciergerie / Voyage"
      title={data.trip.title}
      description={`${data.trip.reference} · ${data.client?.full_name ?? "Client non renseigné"}`}
      actions={
        <div className="flex gap-2">
          <Link to="/voyages">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Tous les voyages
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setEditingTrip((value) => !value)}>
            {editingTrip ? <X className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />}
            {editingTrip ? "Fermer" : "Modifier"}
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Vente</p>
          <p className="mt-1 text-xl font-semibold">
            {totalSale.toFixed(2)} {data.trip.currency}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Coûts fournisseurs</p>
          <p className="mt-1 text-xl font-semibold">
            {totalCost.toFixed(2)} {data.trip.currency}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Commissions</p>
          <p className="mt-1 text-xl font-semibold">
            {totalCommission.toFixed(2)} {data.trip.currency}
          </p>
        </Card>
        <Card className="border-primary/20 bg-primary/5 p-4">
          <p className="text-xs text-muted-foreground">Marge</p>
          <p className="mt-1 text-xl font-semibold">
            {totalMargin.toFixed(2)} {data.trip.currency}
          </p>
        </Card>
      </div>

      {editingTrip && (
        <Card className="mt-6 border-primary/20 bg-primary/5 p-5">
          <form onSubmit={updateTrip} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Titre</Label>
              <Input name="title" defaultValue={data.trip.title} />
            </div>
            <div className="space-y-2">
              <Label>Début</Label>
              <Input name="start_date" type="date" defaultValue={data.trip.start_date ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Fin</Label>
              <Input name="end_date" type="date" defaultValue={data.trip.end_date ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Devise</Label>
              <Input name="currency" defaultValue={data.trip.currency ?? "EUR"} />
            </div>
            <div className="space-y-2">
              <Label>Voyageurs</Label>
              <Input name="party_size" type="number" min="1" defaultValue={data.trip.party_size ?? ""} />
            </div>
            <div className="space-y-2">
              <Label>Statut</Label>
              <select
                name="status"
                defaultValue={data.trip.status}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="draft">Brouillon</option>
                <option value="confirmed">Confirmé</option>
                <option value="in_progress">En cours</option>
                <option value="completed">Terminé</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Notes</Label>
              <Textarea name="notes" defaultValue={data.trip.notes ?? ""} />
            </div>
            <div className="flex justify-end md:col-span-2">
              <Button className="btn-primary">
                <Save className="mr-2 h-4 w-4" />
                Enregistrer le voyage
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Programme opérationnel</h2>
              </div>
              <div className="flex gap-1">
                <Badge variant="outline">{experiences.length} expériences</Badge>
                <Badge variant="outline">{services.length} services</Badge>
                <Badge variant="outline">{tickets.length} billets</Badge>
              </div>
            </div>

            {!data.activities.length ? (
              <p className="text-sm text-muted-foreground">
                Aucune prestation. Ajoute une expérience, un service ou un billet.
              </p>
            ) : (
              <div className="space-y-3">
                {data.activities.map((activity) => (
                  <div key={activity.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{activity.title}</p>
                          <Badge variant="outline">{activity.activity_type}</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {activity.scheduled_start
                            ? new Date(activity.scheduled_start).toLocaleString("fr-FR")
                            : "Date à définir"}
                          {activity.partner ? ` · ${activity.partner.name}` : " · Prestataire à définir"}
                        </p>
                      </div>
                      <Badge>{activity.status}</Badge>
                    </div>

                    <div className="mt-3 grid gap-3 text-xs sm:grid-cols-4">
                      <div>
                        <p className="text-muted-foreground">Vente</p>
                        <p className="font-medium">
                          {Number(activity.sale_price).toFixed(2)} {activity.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Coût</p>
                        <p className="font-medium">
                          {Number(activity.supplier_cost).toFixed(2)} {activity.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Commission</p>
                        <p className="font-medium">
                          {Number(activity.commission_amount).toFixed(2)} {activity.currency}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Marge</p>
                        <p className="font-medium">
                          {Number(activity.margin_amount).toFixed(2)} {activity.currency}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {activityStatuses.map((status) => (
                        <Button
                          key={status}
                          size="sm"
                          variant={activity.status === status ? "default" : "outline"}
                          onClick={() => updateActivityStatus(activity.id, status)}
                        >
                          {status}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditingActivity(editingActivity === activity.id ? null : activity.id)}
                      >
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Modifier
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteActivity(activity.id)}
                      >
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                        Supprimer
                      </Button>
                    </div>

                    {editingActivity === activity.id && (
                      <div className="mt-4">
                        <TripActivityEditor
                          tripId={id}
                          initial={activity as any}
                          onSaved={() => {
                            setEditingActivity(null);
                            refresh();
                          }}
                          onCancel={() => setEditingActivity(null)}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Ajouter une expérience</h2>
            </div>
            <TripExperiencePicker tripId={id} onAdded={refresh} />
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Ajouter un service</h2>
            </div>
            <TripServicePicker tripId={id} onAdded={refresh} />
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Ticket className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Ajouter un billet</h2>
            </div>
            <TripTicketPicker tripId={id} onAdded={refresh} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">Client & voyageurs</h2>
            </div>
            <div className="rounded-lg bg-muted/40 p-3">
              <p className="font-medium">{data.client?.full_name ?? "Client non renseigné"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {data.client?.phone ?? data.client?.email ?? "Coordonnées à renseigner"}
              </p>
            </div>

            <div className="mt-4 space-y-3">
              {data.travelers.map((traveler) => (
                <div key={traveler.id} className="rounded-lg border p-3">
                  <p className="font-medium">{traveler.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {traveler.role}
                    {traveler.phone ? ` · ${traveler.phone}` : ""}
                  </p>
                  {traveler.notes && <p className="mt-2 text-xs text-muted-foreground">{traveler.notes}</p>}
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t pt-4">
              <Label>Ajouter un voyageur</Label>
              <Input placeholder="Nom" value={travelerName} onChange={(event) => setTravelerName(event.target.value)} />
              <Input placeholder="Rôle" value={travelerRole} onChange={(event) => setTravelerRole(event.target.value)} />
              <Input placeholder="Téléphone" value={travelerPhone} onChange={(event) => setTravelerPhone(event.target.value)} />
              <Input placeholder="Notes" value={travelerNotes} onChange={(event) => setTravelerNotes(event.target.value)} />
              <Button onClick={addTraveler}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-primary" />
              <h2 className="font-semibold">État du voyage</h2>
            </div>
            <p className="text-sm">
              Statut : <Badge className="ml-1">{data.trip.status}</Badge>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">
              Le voyage est la couche opérationnelle : client, voyageurs, prestations, prestataires, coûts,
              commissions et marge.
            </p>
          </Card>

          <Card className="border-primary/10 bg-primary/5 p-5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="font-medium">Workflow JEITINHO</p>
            </div>
            <ol className="mt-3 space-y-2 text-xs text-muted-foreground">
              <li>1. Lead → prospect → client</li>
              <li>2. Devis → accepté</li>
              <li>3. Créer le voyage</li>
              <li>4. Ajouter expérience + prestataire</li>
              <li>5. Ajouter services / billets</li>
              <li>6. Planifier → informer → réaliser</li>
            </ol>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

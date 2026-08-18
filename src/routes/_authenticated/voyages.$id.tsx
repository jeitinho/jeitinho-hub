import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus, Users, Wallet, ClipboardList, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { TripExperiencePicker } from "@/components/trips/experience-picker-v2";

export const Route = createFileRoute("/_authenticated/voyages/$id")({
  component: TripDetail,
  head: () => ({ meta: [{ title: "Voyage — JEITINHO" }] }),
});

const statuses = ["to_plan", "confirmed", "client_informed", "completed", "cancelled"] as const;

function TripDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [travelerName, setTravelerName] = useState("");
  const [travelerRole, setTravelerRole] = useState("Voyageur");
  const [travelerPhone, setTravelerPhone] = useState("");
  const [travelerNotes, setTravelerNotes] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      const [{ data: trip, error: tripError }, { data: travelers, error: travelersError }, { data: activities, error: activitiesError }] = await Promise.all([
        supabase.from("trips").select("*").eq("id", id).single(),
        supabase.from("trip_travelers").select("*").eq("trip_id", id).order("created_at"),
        supabase.from("trip_activities").select("*").eq("trip_id", id).order("scheduled_start", { ascending: true, nullsFirst: false }),
      ]);
      if (tripError) throw tripError;
      if (travelersError) throw travelersError;
      if (activitiesError) throw activitiesError;
      const client = trip.client_id ? (await supabase.from("clients").select("id,full_name,email,phone").eq("id", trip.client_id).maybeSingle()).data : null;
      const partnerIds = [...new Set((activities ?? []).map((activity) => activity.partner_id).filter(Boolean))];
      const partners = partnerIds.length ? (await supabase.from("partners").select("id,name,phone").in("id", partnerIds)).data ?? [] : [];
      const partnerMap = new Map(partners.map((partner) => [partner.id, partner]));
      return { trip, travelers: travelers ?? [], activities: (activities ?? []).map((activity) => ({ ...activity, partner: activity.partner_id ? partnerMap.get(activity.partner_id) ?? null : null })), client };
    },
  });

  const addTraveler = async () => {
    if (!travelerName.trim()) return toast.error("Renseigne le nom du voyageur.");
    const { error } = await supabase.from("trip_travelers").insert({ trip_id: id, full_name: travelerName.trim(), role: travelerRole.trim() || "Voyageur", phone: travelerPhone.trim() || null, notes: travelerNotes.trim() || null });
    if (error) return toast.error(error.message);
    toast.success("Voyageur ajouté");
    setTravelerName(""); setTravelerPhone(""); setTravelerNotes("");
    qc.invalidateQueries({ queryKey: ["trip", id] });
  };

  const updateActivityStatus = async (activityId: string, status: string) => {
    const payload: Record<string, unknown> = { status };
    if (status === "client_informed") payload.client_informed_at = new Date().toISOString();
    if (status === "completed") payload.completed_at = new Date().toISOString();
    const { error } = await supabase.from("trip_activities").update(payload).eq("id", activityId);
    if (error) return toast.error(error.message);
    toast.success("Statut mis à jour");
    qc.invalidateQueries({ queryKey: ["trip", id] });
  };

  if (isLoading) return <PageShell title="Chargement du voyage…"><Card className="h-64 animate-pulse bg-muted/50" /></PageShell>;
  if (error || !data) return <PageShell title="Voyage introuvable"><Card className="border-destructive/40 p-8">{error instanceof Error ? error.message : "Impossible de charger ce voyage."}</Card></PageShell>;

  const totalSale = data.activities.reduce((sum, activity) => sum + Number(activity.sale_price || 0), 0);
  const totalCost = data.activities.reduce((sum, activity) => sum + Number(activity.supplier_cost || 0), 0);
  const totalCommission = data.activities.reduce((sum, activity) => sum + Number(activity.commission_amount || 0), 0);
  const totalMargin = data.activities.reduce((sum, activity) => sum + Number(activity.margin_amount || 0), 0);

  return (
    <PageShell
      eyebrow="Conciergerie / Voyage"
      title={data.trip.title}
      description={`${data.trip.reference} · ${data.client?.full_name ?? "Client non renseigné"}`}
      actions={<Link to="/voyages"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Tous les voyages</Button></Link>}
    >
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Vente activités</p><p className="mt-1 text-xl font-semibold">{totalSale.toFixed(2)} {data.trip.currency}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Coûts fournisseurs</p><p className="mt-1 text-xl font-semibold">{totalCost.toFixed(2)} {data.trip.currency}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Commissions</p><p className="mt-1 text-xl font-semibold">{totalCommission.toFixed(2)} {data.trip.currency}</p></Card>
        <Card className="border-primary/20 bg-primary/5 p-4"><p className="text-xs text-muted-foreground">Marge</p><p className="mt-1 text-xl font-semibold">{totalMargin.toFixed(2)} {data.trip.currency}</p></Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /><h2 className="font-semibold">Activités</h2></div>
            {!data.activities.length ? <p className="text-sm text-muted-foreground">Aucune activité. Ajoute une prestation ci-dessous.</p> : <div className="space-y-3">{data.activities.map((activity) => <div key={activity.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-medium">{activity.title}</p><p className="mt-1 text-xs text-muted-foreground">{activity.scheduled_start ? new Date(activity.scheduled_start).toLocaleString("fr-FR") : "Date à définir"}{activity.partner ? ` · ${activity.partner.name}` : " · Prestataire à définir"}</p></div><Badge>{activity.status}</Badge></div><div className="mt-3 grid gap-3 text-xs sm:grid-cols-4"><div><p className="text-muted-foreground">Vente</p><p className="font-medium">{Number(activity.sale_price).toFixed(2)} {activity.currency}</p></div><div><p className="text-muted-foreground">Coût</p><p className="font-medium">{Number(activity.supplier_cost).toFixed(2)} {activity.currency}</p></div><div><p className="text-muted-foreground">Commission</p><p className="font-medium">{Number(activity.commission_amount).toFixed(2)} {activity.currency}</p></div><div><p className="text-muted-foreground">Marge</p><p className="font-medium">{Number(activity.margin_amount).toFixed(2)} {activity.currency}</p></div></div><div className="mt-3 flex flex-wrap gap-2">{statuses.map((status) => <Button key={status} size="sm" variant={activity.status === status ? "default" : "outline"} onClick={() => updateActivityStatus(activity.id, status)}>{status}</Button>)}</div></div>)}</div>}
          </Card>
          <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /><h2 className="font-semibold">Ajouter une prestation</h2></div><TripExperiencePicker tripId={id} onAdded={() => qc.invalidateQueries({ queryKey: ["trip", id] })} /></Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><h2 className="font-semibold">Client & voyageurs</h2></div><div className="rounded-lg bg-muted/40 p-3"><p className="font-medium">{data.client?.full_name ?? "Client non renseigné"}</p><p className="mt-1 text-xs text-muted-foreground">{data.client?.phone ?? data.client?.email ?? "Coordonnées à renseigner"}</p></div><div className="mt-4 space-y-3">{data.travelers.map((traveler) => <div key={traveler.id} className="rounded-lg border p-3"><p className="font-medium">{traveler.full_name}</p><p className="text-xs text-muted-foreground">{traveler.role}{traveler.phone ? ` · ${traveler.phone}` : ""}</p>{traveler.notes && <p className="mt-2 text-xs text-muted-foreground">{traveler.notes}</p>}</div>)}</div><div className="mt-5 space-y-3 border-t pt-4"><Label>Ajouter un voyageur</Label><Input placeholder="Nom" value={travelerName} onChange={(e) => setTravelerName(e.target.value)} /><Input placeholder="Rôle (ex. principal, enfant)" value={travelerRole} onChange={(e) => setTravelerRole(e.target.value)} /><Input placeholder="Téléphone" value={travelerPhone} onChange={(e) => setTravelerPhone(e.target.value)} /><Input placeholder="Notes" value={travelerNotes} onChange={(e) => setTravelerNotes(e.target.value)} /><Button onClick={addTraveler}><Plus className="mr-2 h-4 w-4" />Ajouter</Button></div></Card>
          <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /><h2 className="font-semibold">État du voyage</h2></div><p className="text-sm">Statut : <Badge className="ml-1">{data.trip.status}</Badge></p><p className="mt-3 text-xs text-muted-foreground">Les paiements restent séparés de l'acceptation du devis. Cette page affiche la réalité opérationnelle des activités.</p></Card>
        </div>
      </div>
    </PageShell>
  );
}

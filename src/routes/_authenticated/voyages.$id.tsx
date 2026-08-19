import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Plus, Users, Wallet, ClipboardList, Wrench, CheckCircle2, Ticket, Pencil, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";
import { TripExperiencePicker } from "@/components/trips/experience-picker-v2";
import { TripServicePicker } from "@/components/trips/service-picker";
import { TripTicketPicker } from "@/components/trips/ticket-picker";
import { TripActivityEditor } from "@/components/trips/activity-editor";

export const Route = createFileRoute("/_authenticated/voyages/$id")({ component: TripDetail, head: () => ({ meta: [{ title: "Voyage — JEITINHO" }] }) });
const ACTIVITY_STATUSES = ["to_plan", "confirmed", "client_informed", "completed", "cancelled"] as const;
const TRIP_STATUSES = ["draft", "confirmed", "in_progress", "completed", "cancelled"] as const;
type TripStatus = (typeof TRIP_STATUSES)[number];
const isTripStatus = (value: string): value is TripStatus => TRIP_STATUSES.includes(value as TripStatus);
const fmt = (v?: string | null) => v ? new Date(v).toLocaleString("fr-FR") : "Date à définir";

function Money({ label, value, currency, highlight = false }: { label: string; value: number; currency: string; highlight?: boolean }) {
  return <Card className={highlight ? "border-primary/20 bg-primary/5 p-4" : "p-4"}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-xl font-semibold">{value.toFixed(2)} {currency}</p></Card>;
}

function TripDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [travelerName, setTravelerName] = useState("");
  const [travelerRole, setTravelerRole] = useState("Voyageur");
  const [travelerPhone, setTravelerPhone] = useState("");
  const [travelerNotes, setTravelerNotes] = useState("");
  const [editingTrip, setEditingTrip] = useState(false);
  const [editingActivity, setEditingActivity] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      const [tripR, travelersR, activitiesR] = await Promise.all([
        supabase.from("trips").select("*").eq("id", id).single(),
        supabase.from("trip_travelers").select("*").eq("trip_id", id).order("created_at"),
        supabase.from("trip_activities").select("*").eq("trip_id", id).order("scheduled_start", { ascending: true, nullsFirst: false }),
      ]);
      if (tripR.error) throw tripR.error;
      if (travelersR.error) throw travelersR.error;
      if (activitiesR.error) throw activitiesR.error;
      const trip = tripR.data;
      const travelers = travelersR.data ?? [];
      const activities = activitiesR.data ?? [];
      const client = trip.client_id ? (await supabase.from("clients").select("id,full_name,email,phone").eq("id", trip.client_id).maybeSingle()).data : null;
      const partnerIds = [...new Set(activities.map((a) => a.partner_id).filter((partnerId): partnerId is string => partnerId !== null))];
      const partners = partnerIds.length ? (await supabase.from("partners").select("id,name,phone").in("id", partnerIds)).data ?? [] : [];
      const partnerMap = new Map(partners.map((p) => [p.id, p]));
      return { trip, travelers, activities: activities.map((a) => ({ ...a, partner: a.partner_id ? partnerMap.get(a.partner_id) ?? null : null })), client };
    },
  });

  if (isLoading) return <PageShell title="Chargement du voyage…"><Card className="h-64 animate-pulse bg-muted/50" /></PageShell>;
  if (error || !data) return <PageShell title="Voyage introuvable"><Card className="border-destructive/40 p-8">{error instanceof Error ? error.message : "Impossible de charger ce voyage."}</Card></PageShell>;

  const { trip, travelers, activities, client } = data;
  const refresh = () => qc.invalidateQueries({ queryKey: ["trip", id] });
  const totalSale = activities.reduce((s, a) => s + Number(a.sale_price || 0), 0);
  const totalCost = activities.reduce((s, a) => s + Number(a.supplier_cost || 0), 0);
  const totalCommission = activities.reduce((s, a) => s + Number(a.commission_amount || 0), 0);
  const totalMargin = activities.reduce((s, a) => s + Number(a.margin_amount || 0), 0);
  const experiences = activities.filter((a) => a.activity_type === "experience");
  const services = activities.filter((a) => a.activity_type === "service");
  const tickets = activities.filter((a) => a.activity_type === "ticket");

  const addTraveler = async () => {
    if (!travelerName.trim()) return void toast.error("Renseigne le nom du voyageur.");
    const { error: e } = await supabase.from("trip_travelers").insert({ trip_id: id, full_name: travelerName.trim(), role: travelerRole.trim() || "Voyageur", phone: travelerPhone.trim() || null, notes: travelerNotes.trim() || null });
    if (e) return void toast.error(e.message);
    toast.success("Voyageur ajouté"); setTravelerName(""); setTravelerPhone(""); setTravelerNotes(""); refresh();
  };

  const updateActivityStatus = async (activityId: string, status: (typeof ACTIVITY_STATUSES)[number]) => {
    const payload: { status: (typeof ACTIVITY_STATUSES)[number]; client_informed_at?: string; completed_at?: string } = { status };
    if (status === "client_informed") payload.client_informed_at = new Date().toISOString();
    if (status === "completed") payload.completed_at = new Date().toISOString();
    const { error: e } = await supabase.from("trip_activities").update(payload).eq("id", activityId);
    if (e) return void toast.error(e.message); toast.success("Statut mis à jour"); refresh();
  };

  const deleteActivity = async (activityId: string) => {
    if (!confirm("Supprimer cette prestation du voyage ?")) return;
    const { error: e } = await supabase.from("trip_activities").delete().eq("id", activityId);
    if (e) return void toast.error(e.message); toast.success("Prestation supprimée"); setEditingActivity(null); refresh();
  };

  const updateTrip = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const fd = new FormData(event.currentTarget);
    const title = String(fd.get("title") ?? "").trim(); const start = String(fd.get("start_date") ?? "") || null; const end = String(fd.get("end_date") ?? "") || null;
    const rawStatus = String(fd.get("status") ?? trip.status);
    const status = isTripStatus(rawStatus) ? rawStatus : trip.status;
    if (!title) return void toast.error("Le titre est obligatoire.");
    if (start && end && end < start) return void toast.error("La date de fin doit être après le début.");
    const { error: e } = await supabase.from("trips").update({ title, start_date: start, end_date: end, currency: String(fd.get("currency") ?? "EUR").toUpperCase(), party_size: fd.get("party_size") ? Number(fd.get("party_size")) : null, status, notes: String(fd.get("notes") ?? "").trim() || null }).eq("id", id);
    if (e) return void toast.error(e.message); toast.success("Voyage enregistré"); setEditingTrip(false); refresh();
  };

  return <PageShell eyebrow="Conciergerie / Voyage" title={trip.title} description={`${trip.reference} · ${client?.full_name ?? "Client non renseigné"}`} actions={<div className="flex gap-2"><Link to="/voyages"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Tous les voyages</Button></Link><Button variant="outline" onClick={() => setEditingTrip((v) => !v)}>{editingTrip ? <X className="mr-2 h-4 w-4" /> : <Pencil className="mr-2 h-4 w-4" />}{editingTrip ? "Fermer" : "Modifier"}</Button></div>}>
    <div className="grid gap-4 md:grid-cols-4"><Money label="Vente" value={totalSale} currency={trip.currency} /><Money label="Coûts fournisseurs" value={totalCost} currency={trip.currency} /><Money label="Commissions" value={totalCommission} currency={trip.currency} /><Money label="Marge" value={totalMargin} currency={trip.currency} highlight /></div>
    {editingTrip && <Card className="mt-6 border-primary/20 bg-primary/5 p-5"><form onSubmit={updateTrip} className="grid gap-4 md:grid-cols-2"><div className="space-y-2 md:col-span-2"><Label>Titre</Label><Input name="title" defaultValue={trip.title} /></div><div className="space-y-2"><Label>Début</Label><Input name="start_date" type="date" defaultValue={trip.start_date ?? ""} /></div><div className="space-y-2"><Label>Fin</Label><Input name="end_date" type="date" defaultValue={trip.end_date ?? ""} /></div><div className="space-y-2"><Label>Devise</Label><Input name="currency" defaultValue={trip.currency ?? "EUR"} /></div><div className="space-y-2"><Label>Voyageurs</Label><Input name="party_size" type="number" min="1" defaultValue={trip.party_size ?? ""} /></div><div className="space-y-2"><Label>Statut</Label><select name="status" defaultValue={trip.status} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="draft">Brouillon</option><option value="confirmed">Confirmé</option><option value="in_progress">En cours</option><option value="completed">Terminé</option><option value="cancelled">Annulé</option></select></div><div className="space-y-2 md:col-span-2"><Label>Notes</Label><Textarea name="notes" defaultValue={trip.notes ?? ""} /></div><div className="flex justify-end"><Button className="btn-primary"><Save className="mr-2 h-4 w-4" />Enregistrer le voyage</Button></div></form></Card>}
    <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]"><div className="space-y-6">
      <Card className="p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><ClipboardList className="h-4 w-4 text-primary" /><h2 className="font-semibold">Programme opérationnel</h2></div><div className="flex gap-1"><Badge variant="outline">{experiences.length} expériences</Badge><Badge variant="outline">{services.length} services</Badge><Badge variant="outline">{tickets.length} billets</Badge></div></div>
        {!activities.length ? <p className="text-sm text-muted-foreground">Aucune prestation. Ajoute une expérience, un service ou un billet.</p> : <div className="space-y-3">{activities.map((activity) => <div key={activity.id} className="rounded-lg border p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><p className="font-medium">{activity.title}</p><Badge variant="outline">{activity.activity_type}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{fmt(activity.scheduled_start)}{activity.partner ? ` · ${activity.partner.name}` : " · Prestataire à définir"}</p></div><Badge>{activity.status}</Badge></div><div className="mt-3 grid gap-3 text-xs sm:grid-cols-4"><div><p className="text-muted-foreground">Vente</p><p className="font-medium">{Number(activity.sale_price).toFixed(2)} {activity.currency}</p></div><div><p className="text-muted-foreground">Coût</p><p className="font-medium">{Number(activity.supplier_cost).toFixed(2)} {activity.currency}</p></div><div><p className="text-muted-foreground">Commission</p><p className="font-medium">{Number(activity.commission_amount).toFixed(2)} {activity.currency}</p></div><div><p className="text-muted-foreground">Marge</p><p className="font-medium">{Number(activity.margin_amount).toFixed(2)} {activity.currency}</p></div></div><div className="mt-3 flex flex-wrap gap-2">{ACTIVITY_STATUSES.map((status) => <Button key={status} size="sm" variant={activity.status === status ? "default" : "outline"} onClick={() => updateActivityStatus(activity.id, status)}>{status}</Button>)}<Button size="sm" variant="outline" onClick={() => setEditingActivity(editingActivity === activity.id ? null : activity.id)}><Pencil className="mr-1.5 h-3.5 w-3.5" />Modifier</Button><Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteActivity(activity.id)}><Trash2 className="mr-1.5 h-3.5 w-3.5" />Supprimer</Button></div>{editingActivity === activity.id && <div className="mt-4"><TripActivityEditor tripId={id} initial={activity as any} onSaved={() => { setEditingActivity(null); refresh(); }} onCancel={() => setEditingActivity(null)} /></div>}</div>)}</div>}
      </Card>
      <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /><h2 className="font-semibold">Ajouter une expérience</h2></div><TripExperiencePicker tripId={id} onAdded={refresh} /></Card>
      <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Wrench className="h-4 w-4 text-primary" /><h2 className="font-semibold">Ajouter un service</h2></div><TripServicePicker tripId={id} onAdded={refresh} /></Card>
      <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Ticket className="h-4 w-4 text-primary" /><h2 className="font-semibold">Ajouter un billet</h2></div><TripTicketPicker tripId={id} onAdded={refresh} /></Card>
    </div><div className="space-y-6">
      <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary" /><h2 className="font-semibold">Client & voyageurs</h2></div><div className="rounded-lg bg-muted/40 p-3"><p className="font-medium">{client?.full_name ?? "Client non renseigné"}</p><p className="mt-1 text-xs text-muted-foreground">{client?.phone ?? client?.email ?? "Coordonnées à renseigner"}</p></div><div className="mt-4 space-y-3">{travelers.map((traveler) => <div key={traveler.id} className="rounded-lg border p-3"><p className="font-medium">{traveler.full_name}</p><p className="text-xs text-muted-foreground">{traveler.role}{traveler.phone ? ` · ${traveler.phone}` : ""}</p>{traveler.notes && <p className="mt-2 text-xs text-muted-foreground">{traveler.notes}</p>}</div>)}</div><div className="mt-5 space-y-3 border-t pt-4"><Label>Ajouter un voyageur</Label><Input placeholder="Nom" value={travelerName} onChange={(e) => setTravelerName(e.target.value)} /><Input placeholder="Rôle" value={travelerRole} onChange={(e) => setTravelerRole(e.target.value)} /><Input placeholder="Téléphone" value={travelerPhone} onChange={(e) => setTravelerPhone(e.target.value)} /><Textarea placeholder="Notes" value={travelerNotes} onChange={(e) => setTravelerNotes(e.target.value)} /><Button onClick={addTraveler}><Plus className="mr-2 h-4 w-4" />Ajouter</Button></div></Card>
      <Card className="p-5"><div className="mb-4 flex items-center gap-2"><Wallet className="h-4 w-4 text-primary" /><h2 className="font-semibold">État du voyage</h2></div><p className="text-sm">Statut : <Badge className="ml-1">{trip.status}</Badge></p><p className="mt-3 text-xs text-muted-foreground">Le voyage est la couche opérationnelle : client, voyageurs, prestations, prestataires, coûts, commissions et marge.</p></Card>
      <Card className="border-primary/10 bg-primary/5 p-5"><div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary" /><p className="font-medium">Workflow JEITINHO</p></div><ol className="mt-3 space-y-2 text-xs text-muted-foreground"><li>1. Lead → prospect → client</li><li>2. Devis → accepté</li><li>3. Créer le voyage</li><li>4. Ajouter expérience + prestataire</li><li>5. Ajouter services / billets</li><li>6. Planifier → informer → réaliser</li></ol></Card>
    </div></div>
  </PageShell>;
}

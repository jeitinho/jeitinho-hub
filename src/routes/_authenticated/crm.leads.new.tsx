import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ComboboxMulti, type ComboboxOption } from "@/components/ui/combobox";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { createLead } from "@/lib/leads-gateway";
import { useCatalogLineOptions, type CatalogOption } from "@/components/catalog-line-picker";

const LEAD_SOURCES = ["Instagram", "WhatsApp", "Site web", "Blog", "Bouche-à-oreille", "Partenaire", "Autre"] as const;

export const Route = createFileRoute("/_authenticated/crm/leads/new")({
  component: NewLead,
  head: () => ({ meta: [{ title: "Nouveau lead — JEITINHO" }] }),
});

function NewLead() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [travelStart, setTravelStart] = useState("");
  const [travelEnd, setTravelEnd] = useState("");
  const [partySize, setPartySize] = useState("");
  const [activities, setActivities] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [source, setSource] = useState("");
  const { data: catalogOptions = [] } = useCatalogLineOptions("EUR");
  const activityOptions: ComboboxOption[] = (catalogOptions as CatalogOption[]).map((option) => ({ value: option.label, label: option.label }));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return toast.error("Le nom du lead est obligatoire.");
    setSaving(true);
    try {
      await createLead({
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        travel_start: travelStart || null,
        travel_end: travelEnd || null,
        party_size: partySize ? Number(partySize) : null,
        activities,
        message: message.trim() || null,
        source: source.trim() || "manual",
        status: "new",
      });
      toast.success("Lead créé");
      navigate({ to: "/crm" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Création du lead impossible.");
    } finally {
      setSaving(false);
    }
  };

  return <PageShell eyebrow="Pipeline commercial" title="Nouveau lead" description="Ajouter manuellement un lead dans le CRM, avec le même accès centralisé que les leads reçus du site.">
    <div className="mb-5"><Link to="/crm"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>CRM</Button></Link></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card className="space-y-5 border-border/60 p-6">
          <p className="tracked text-[10px] text-muted-foreground">Contact</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Nom</Label><Input className="mt-1.5" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Prénom Nom"/></div>
            <div><Label>E-mail</Label><Input className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="lead@email.com"/></div>
            <div><Label>Téléphone</Label><Input className="mt-1.5" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+33… / +55…"/></div>
          </div>
        </Card>
        <Card className="space-y-5 border-border/60 p-6">
          <p className="tracked text-[10px] text-muted-foreground">Projet de voyage</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Arrivée</Label><Input className="mt-1.5" type="date" value={travelStart} onChange={(e) => setTravelStart(e.target.value)}/></div>
            <div><Label>Départ</Label><Input className="mt-1.5" type="date" value={travelEnd} onChange={(e) => setTravelEnd(e.target.value)}/></div>
            <div><Label>Nombre de personnes</Label><Input className="mt-1.5" type="number" min="1" step="1" value={partySize} onChange={(e) => setPartySize(e.target.value)}/></div>
            <div><Label>Source</Label><Select value={source} onValueChange={setSource}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Choisir une source"/></SelectTrigger><SelectContent>{LEAD_SOURCES.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div><Label>Activités souhaitées</Label><ComboboxMulti className="mt-1.5" options={activityOptions} values={activities} onChange={setActivities} placeholder="Choisir dans le catalogue…" searchPlaceholder="Rechercher une activité…" emptyText="Aucune activité trouvée." allowCustomValues/></div>
          <div><Label>Message / contexte</Label><Textarea className="mt-1.5 min-h-32" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Demande, contexte, informations utiles…"/></div>
        </Card>
      </div>
      <Card className="h-fit border-border/60 p-6">
        <p className="tracked mb-4 text-[10px] text-muted-foreground">Enregistrement</p>
        <p className="text-sm text-muted-foreground">Le lead sera créé dans Supabase avec le statut <strong>Nouveau</strong>. Il apparaîtra immédiatement dans l'onglet Leads du CRM.</p>
        <Button className="btn-primary mt-6 w-full" onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4"/>{saving ? "Création…" : "Créer le lead"}</Button>
      </Card>
    </div>
  </PageShell>;
}

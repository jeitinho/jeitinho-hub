import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/clients-gateway";
import { LEGAL_TYPES, type LegalType } from "@/lib/invoices/status";

export const Route = createFileRoute("/_authenticated/clients/new")({
  component: NewClient,
  head: () => ({ meta: [{ title: "Nouveau client — JEITINHO" }] }),
});

function NewClient() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [legalType, setLegalType] = useState<LegalType>("individual");
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!fullName.trim()) return toast.error("Le nom complet est obligatoire.");
    setSaving(true);
    try {
      const client = await createClient({
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        legal_type: legalType,
        company_name: legalType === "company" ? companyName.trim() || null : null,
        siret: legalType === "company" ? siret.trim() || null : null,
        vat_number: legalType === "company" ? vatNumber.trim() || null : null,
        billing_address: billingAddress.trim() || null,
        source: "manual",
        status: "client",
        stage: "nouveau",
        tags: [],
      });
      toast.success("Client créé");
      navigate({ to: "/clients/$id", params: { id: client.id } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Création du client impossible.");
    } finally {
      setSaving(false);
    }
  };

  return <PageShell eyebrow="Base clients" title="Nouveau client" description="Créer manuellement une fiche client directement dans le Hub, sans passer par un prospect.">
    <div className="mb-5"><Link to="/clients"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4"/>Clients</Button></Link></div>
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-6">
        <Card className="space-y-5 border-border/60 p-6">
          <div><p className="tracked mb-4 text-[10px] text-muted-foreground">Identité</p><div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Nom complet</Label><Input className="mt-1.5" required value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Prénom Nom"/></div>
            <div><Label>E-mail</Label><Input className="mt-1.5" type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="client@email.com"/></div>
            <div><Label>Téléphone</Label><Input className="mt-1.5" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+33… / +55…"/></div>
          </div></div>
          <div><Label>Notes internes</Label><Textarea className="mt-1.5 min-h-28" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Contexte, préférences, informations utiles…"/></div>
        </Card>

        <Card className="space-y-5 border-border/60 p-6">
          <p className="tracked text-[10px] text-muted-foreground">Facturation</p>
          <div><Label>Type de client</Label><Select value={legalType} onValueChange={v=>setLegalType(v as LegalType)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{LEGAL_TYPES.map(t=><SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent></Select></div>
          {legalType === "company" && <div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label>Raison sociale</Label><Input className="mt-1.5" value={companyName} onChange={e=>setCompanyName(e.target.value)} placeholder="Nom de la société"/></div><div><Label>SIRET</Label><Input className="mt-1.5" value={siret} onChange={e=>setSiret(e.target.value)}/></div><div><Label>N° TVA intracommunautaire</Label><Input className="mt-1.5" value={vatNumber} onChange={e=>setVatNumber(e.target.value)}/></div></div>}
          <div><Label>Adresse de facturation</Label><Textarea className="mt-1.5 min-h-20" value={billingAddress} onChange={e=>setBillingAddress(e.target.value)} placeholder="Numéro, rue, code postal, ville, pays"/></div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-border/60 p-6"><p className="tracked mb-4 text-[10px] text-muted-foreground">Enregistrement</p><p className="text-sm text-muted-foreground">Cette fiche sera créée dans <strong>Supabase</strong> comme client manuel et pourra immédiatement être utilisée dans les devis, factures et voyages.</p><Button className="btn-primary mt-6 w-full" onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4"/>{saving ? "Création…" : "Créer le client"}</Button></Card>
        <Card className="border-primary/10 bg-primary/5 p-6"><p className="text-sm font-medium">Source</p><p className="mt-1 text-xs text-muted-foreground">Origine : manuel · Statut : client · Étape : nouveau</p></Card>
      </div>
    </div>
  </PageShell>;
}

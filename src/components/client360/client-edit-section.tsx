import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deleteClient, updateClient, type ClientRecord } from "@/lib/clients-gateway";
import { LEGAL_TYPES, type LegalType } from "@/lib/invoices/status";

/** Section repliable « Modifier la fiche » : coordonnées, notes, facturation, suppression. */
export function ClientEditSection({
  client,
  onSaved,
}: {
  client: ClientRecord;
  onSaved: () => Promise<unknown>;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
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

  useEffect(() => {
    setFullName(client.full_name ?? "");
    setEmail(client.email ?? "");
    setPhone(client.phone ?? "");
    setNotes(client.notes ?? "");
    setLegalType((client.legal_type as LegalType) ?? "individual");
    setCompanyName(client.company_name ?? "");
    setSiret(client.siret ?? "");
    setVatNumber(client.vat_number ?? "");
    setBillingAddress(client.billing_address ?? "");
  }, [client]);

  const save = async () => {
    if (!fullName.trim()) {
      toast.error("Le nom complet est obligatoire.");
      return;
    }
    setSaving(true);
    try {
      await updateClient(client.id, {
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        notes: notes.trim() || null,
        legal_type: legalType,
        company_name: legalType === "company" ? companyName.trim() || null : null,
        siret: legalType === "company" ? siret.trim() || null : null,
        vat_number: legalType === "company" ? vatNumber.trim() || null : null,
        billing_address: billingAddress.trim() || null,
      });
      toast.success("Enregistré");
      await onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d'enregistrer le client.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!confirm("Supprimer cette fiche client ? Les devis, voyages et factures sont conservés."))
      return;
    try {
      await deleteClient(client.id);
      toast.success("Client supprimé");
      await qc.invalidateQueries({ queryKey: ["clients"] });
      navigate({ to: "/clients" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer le client.");
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="p-0">
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 p-5 text-left"
          >
            <span>
              <span className="block text-lg" style={{ fontFamily: "Fraunces, serif" }}>
                Modifier la fiche
              </span>
              <span className="text-xs text-muted-foreground">
                Coordonnées, notes, facturation, suppression
              </span>
            </span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-6 border-t border-border/60 p-5">
            <div className="space-y-4">
              <p className="tracked text-[10px] text-muted-foreground">Coordonnées</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Nom complet</Label>
                  <Input
                    className="mt-1.5"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    className="mt-1.5"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <Label>Notes</Label>
                <Textarea
                  className="mt-1.5 min-h-24"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-4">
              <p className="tracked text-[10px] text-muted-foreground">Facturation</p>
              <div>
                <Label>Type</Label>
                <Select value={legalType} onValueChange={(v) => setLegalType(v as LegalType)}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEGAL_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {legalType === "company" && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Label>Raison sociale</Label>
                    <Input
                      className="mt-1.5"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="Nom de la société"
                    />
                  </div>
                  <div>
                    <Label>SIRET</Label>
                    <Input
                      className="mt-1.5"
                      value={siret}
                      onChange={(e) => setSiret(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>N° TVA intracommunautaire</Label>
                    <Input
                      className="mt-1.5"
                      value={vatNumber}
                      onChange={(e) => setVatNumber(e.target.value)}
                    />
                  </div>
                </div>
              )}
              <div>
                <Label>Adresse de facturation</Label>
                <Textarea
                  className="mt-1.5 min-h-16"
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Numéro, rue, code postal, ville, pays"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Ces informations apparaissent sur les factures générées pour ce client.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => void remove()}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Supprimer la fiche
              </Button>
              <Button className="btn-primary" onClick={() => void save()} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

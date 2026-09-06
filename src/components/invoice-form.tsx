import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, FileDown, Plus, Save, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/quotes/status";
import { INVOICE_STATUSES, invoiceStatusLabel, type InvoiceStatus } from "@/lib/invoices/status";
import { downloadInvoicePdf } from "@/lib/invoices/download-invoice-pdf";
import { CatalogLinePicker, type CatalogLineSelection } from "@/components/catalog-line-picker";

type InvoiceLineDraft = {
  id?: string;
  label: string;
  unit: string;
  quantity: number;
  unit_price: number;
  currency: string;
  catalogValue: string;
  experience_id?: string | null;
  service_id?: string | null;
  ticket_offer_id?: string | null;
};

const NEW_CLIENT = "__new__";
const NO_BOOKING = "__none__";

function emptyLine(currency = "EUR"): InvoiceLineDraft {
  return { label: "", unit: "Forfait", quantity: 1, unit_price: 0, currency, catalogValue: "" };
}

export function InvoiceForm({ invoiceId }: { invoiceId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = Boolean(invoiceId);
  const [clientId, setClientId] = useState(NEW_CLIENT);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [legalType, setLegalType] = useState<"individual" | "company">("individual");
  const [companyName, setCompanyName] = useState("");
  const [siret, setSiret] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [title, setTitle] = useState("Facture JEITINHO");
  const [number, setNumber] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [currency, setCurrency] = useState("EUR");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingId, setBookingId] = useState(NO_BOOKING);
  const [lines, setLines] = useState<InvoiceLineDraft[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "invoice-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("clients").select("id,full_name,email,phone,legal_type,company_name,siret,vat_number,billing_address").order("full_name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings", "invoice-options"],
    enabled: !isEdit,
    queryFn: async () => {
      const { data, error } = await supabase.from("bookings").select("id,reference,prenom,nom,email,telephone,items,subtotal,status,created_at").order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", invoiceId],
    enabled: isEdit,
    queryFn: async () => {
      const [{ data: invoice, error }, { data: lineRows, error: linesError }] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", invoiceId!).single(),
        supabase.from("invoice_lines").select("*").eq("invoice_id", invoiceId!).order("position"),
      ]);
      if (error) throw new Error(error.message);
      if (linesError) throw new Error(linesError.message);
      return { invoice: invoice as any, lineRows: (lineRows ?? []) as any[] };
    },
  });

  useEffect(() => {
    if (!data?.invoice) return;
    const invoice = data.invoice;
    setClientId(invoice.client_id ?? NEW_CLIENT);
    setTitle(invoice.title ?? "Facture JEITINHO");
    setNumber(invoice.number ?? "");
    setStatus(invoice.status);
    setCurrency(invoice.currency ?? "EUR");
    setIssueDate(invoice.issue_date ?? new Date().toISOString().slice(0, 10));
    setDueDate(invoice.due_date ?? "");
    setNotes(invoice.notes ?? "");
    setLegalType(invoice.billing_legal_type ?? "individual");
    setCompanyName(invoice.billing_company_name ?? "");
    setSiret(invoice.billing_siret ?? "");
    setVatNumber(invoice.billing_vat_number ?? "");
    setBillingAddress(invoice.billing_address ?? "");
    setClientName(invoice.billing_name ?? "");
    setLines(
      data.lineRows.length
        ? data.lineRows.map((line: any) => ({
            id: line.id,
            label: line.label,
            unit: line.unit,
            quantity: Number(line.quantity),
            unit_price: Number(line.unit_price),
            currency: line.currency ?? invoice.currency ?? "EUR",
            catalogValue: line.experience_id ? `experience:${line.experience_id}` : line.service_id ? `service:${line.service_id}` : line.ticket_offer_id ? `ticket:${line.ticket_offer_id}` : "",
            experience_id: line.experience_id ?? null,
            service_id: line.service_id ?? null,
            ticket_offer_id: line.ticket_offer_id ?? null,
          }))
        : [emptyLine(invoice.currency ?? "EUR")],
    );
  }, [data]);

  const total = useMemo(() => lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_price) || 0), 0), [lines]);
  const selectedClient = (clients as any[]).find((client) => client.id === clientId);

  const applyClient = (id: string) => {
    setClientId(id);
    if (id === NEW_CLIENT) return;
    const client = (clients as any[]).find((row) => row.id === id);
    if (!client) return;
    setClientName(client.full_name ?? "");
    setClientEmail(client.email ?? "");
    setClientPhone(client.phone ?? "");
    setLegalType(client.legal_type ?? "individual");
    setCompanyName(client.company_name ?? "");
    setSiret(client.siret ?? "");
    setVatNumber(client.vat_number ?? "");
    setBillingAddress(client.billing_address ?? "");
  };

  const applyBooking = (id: string) => {
    setBookingId(id);
    if (id === NO_BOOKING) return;
    const booking = (bookings as any[]).find((row) => row.id === id);
    if (!booking) return;
    setClientId(NEW_CLIENT);
    setClientName([booking.prenom, booking.nom].filter(Boolean).join(" "));
    setClientEmail(booking.email ?? "");
    setClientPhone(booking.telephone ?? "");
    setTitle(`Réservation ${booking.reference ?? "JEITINHO"}`);
    const mapped = (Array.isArray(booking.items) ? booking.items : []).map((item: any) => ({
      label: item.title ?? item.slug ?? "Prestation",
      unit: item.travelers ? "Personne" : "Forfait",
      quantity: Number(item.travelers ?? 1),
      unit_price: Number(item.unitPrice ?? 0),
      currency,
      catalogValue: "",
    }));
    setLines(mapped.length ? mapped : [emptyLine(currency)]);
  };

  const updateLine = (index: number, patch: Partial<InvoiceLineDraft>) => setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));

  const applyCatalogSelection = (index: number, selection: CatalogLineSelection & { value?: string }) => {
    const sourcePatch = {
      experience_id: selection.sourceType === "experience" ? selection.sourceId : null,
      service_id: selection.sourceType === "service" ? selection.sourceId : null,
      ticket_offer_id: selection.sourceType === "ticket" ? selection.sourceId : null,
    };
    updateLine(index, {
      catalogValue: selection.value ?? `${selection.sourceType}:${selection.sourceId}`,
      label: selection.label,
      unit: selection.unit,
      unit_price: selection.unitPrice,
      currency: selection.currency || currency,
      ...sourcePatch,
    });
  };

  const save = async () => {
    const validLines = lines.filter((line) => line.label.trim());
    if (!number.trim()) return toast.error("Renseignez le numéro de facture.");
    if (!title.trim()) return toast.error("Le titre de la facture est obligatoire.");
    if (clientId === NEW_CLIENT && !clientName.trim()) return toast.error("Renseignez le nom du client.");
    if (!validLines.length) return toast.error("Ajoutez au moins une ligne de prestation.");

    setSaving(true);
    try {
      let resolvedClientId = clientId === NEW_CLIENT ? null : clientId;
      if (!resolvedClientId) {
        const { data: existingClient, error: lookupError } = clientEmail.trim()
          ? await supabase.from("clients").select("id").eq("email", clientEmail.trim()).limit(1).maybeSingle()
          : { data: null, error: null };
        if (lookupError) throw new Error(lookupError.message);
        if (existingClient?.id) {
          resolvedClientId = existingClient.id;
        } else {
          const { data: created, error } = await supabase.from("clients").insert({
            full_name: clientName.trim(),
            email: clientEmail.trim() || null,
            phone: clientPhone.trim() || null,
            status: "client",
            stage: "nouveau",
            legal_type: legalType,
            company_name: companyName.trim() || null,
            siret: siret.trim() || null,
            vat_number: vatNumber.trim() || null,
            billing_address: billingAddress.trim() || null,
          } as any).select("id").single();
          if (error) throw new Error(error.message);
          resolvedClientId = (created as any).id;
        }
      }

      const me = await fetch("/api/auth/me", { credentials: "include" }).then((response) => response.json()).catch(() => null);
      const billingName = legalType === "company" ? (companyName.trim() || clientName.trim()) : clientName.trim();
      const payload: any = {
        number: number.trim(),
        client_id: resolvedClientId,
        title: title.trim(),
        status,
        currency,
        total_amount: total,
        issue_date: issueDate,
        due_date: dueDate || null,
        notes: notes.trim() || null,
        billing_legal_type: legalType,
        billing_name: billingName || "Client",
        billing_company_name: companyName.trim() || null,
        billing_siret: siret.trim() || null,
        billing_vat_number: vatNumber.trim() || null,
        billing_address: billingAddress.trim() || null,
        created_by: me?.user?.id ?? null,
        ...(isEdit ? {} : { booking_id: bookingId === NO_BOOKING ? null : bookingId, quote_id: null }),
      };
      if (status === "paid") payload.paid_at = data?.invoice?.paid_at ?? new Date().toISOString();
      if (status !== "paid") payload.paid_at = null;

      let id = invoiceId;
      if (id) {
        const { error } = await supabase.from("invoices").update(payload).eq("id", id);
        if (error) throw new Error(error.message);
      } else {
        const finalNumber = number.trim();
        if (!finalNumber) {
          const { data: generated, error } = await supabase.rpc("next_invoice_number");
          if (error) throw new Error(error.message);
          payload.number = generated;
        }
        const { data: created, error } = await supabase.from("invoices").insert(payload).select("id,number").single();
        if (error) {
          if (error.message.toLowerCase().includes("invoices_number_key")) throw new Error("Ce numéro de facture existe déjà.");
          if (error.message.toLowerCase().includes("invoices_booking_id_unique")) throw new Error("Une facture existe déjà pour cette réservation.");
          throw new Error(error.message);
        }
        id = (created as any).id;
      }

      const { error: deleteError } = await supabase.from("invoice_lines").delete().eq("invoice_id", id!);
      if (deleteError) throw new Error(deleteError.message);
      const { error: lineError } = await supabase.from("invoice_lines").insert(
        validLines.map((line, position) => ({
          invoice_id: id!,
          position,
          label: line.label.trim(),
          unit: line.unit.trim() || "Forfait",
          quantity: Number(line.quantity) || 0,
          unit_price: Number(line.unit_price) || 0,
          currency: line.currency || currency,
          experience_id: line.experience_id ?? null,
          service_id: line.service_id ?? null,
          ticket_offer_id: line.ticket_offer_id ?? null,
        })) as any,
      );
      if (lineError) throw new Error(lineError.message);

      await qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(isEdit ? "Facture enregistrée." : "Facture créée.");
      if (!isEdit) navigate({ to: "/devis/factures/$id", params: { id: id! } });
      else await qc.invalidateQueries({ queryKey: ["invoice", id] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const download = async () => {
    if (!isEdit && !number.trim()) return toast.error("Enregistrez la facture pour obtenir son numéro.");
    setDownloading(true);
    try {
      await downloadInvoicePdf({
        number: number || "—",
        title,
        status,
        currency,
        issueDate,
        dueDate: dueDate || null,
        notes,
        billing: {
          legalType,
          name: clientName || "Client",
          companyName: companyName || null,
          siret: siret || null,
          vatNumber: vatNumber || null,
          address: billingAddress || null,
        },
        lines: lines.filter((line) => line.label.trim()).map((line) => ({ label: line.label, unit: line.unit, quantity: Number(line.quantity), unit_price: Number(line.unit_price) })),
      });
    } catch {
      toast.error("Génération du PDF impossible.");
    } finally {
      setDownloading(false);
    }
  };

  if (isEdit && isLoading) return <PageShell title="Chargement…">{null}</PageShell>;

  return (
    <PageShell
      eyebrow="Facturation"
      title={number || "Nouvelle facture"}
      description={isEdit ? title : "Facture autonome — avec ou sans devis lié"}
      actions={<div className="flex gap-2"><Link to="/devis/factures"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Toutes les factures</Button></Link><Button variant="outline" disabled={downloading} onClick={download}><FileDown className="mr-2 h-4 w-4" />PDF</Button></div>}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>Client</h2>{selectedClient && <Badge variant="outline">Client existant</Badge>}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              {!isEdit && <div className="sm:col-span-2"><Label>Réservation jeitinho.fr (optionnel)</Label><Select value={bookingId} onValueChange={applyBooking}><SelectTrigger className="mt-1.5"><SelectValue placeholder="Aucune réservation" /></SelectTrigger><SelectContent><SelectItem value={NO_BOOKING}>Aucune — facture manuelle</SelectItem>{(bookings as any[]).map((booking) => <SelectItem key={booking.id} value={booking.id}>{booking.reference} — {[booking.prenom, booking.nom].filter(Boolean).join(" ")} — {booking.email}</SelectItem>)}</SelectContent></Select><p className="mt-1.5 text-xs text-muted-foreground">Les achats directs du site sont repris ici avec leurs prestations et prix.</p></div>}
              <div className="sm:col-span-2"><Label>Client existant</Label><Select value={clientId} onValueChange={applyClient}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value={NEW_CLIENT}>Nouveau client…</SelectItem>{(clients as any[]).map((client) => <SelectItem key={client.id} value={client.id}>{client.full_name}</SelectItem>)}</SelectContent></Select></div>
              {clientId === NEW_CLIENT ? <>
                <div><Label>Nom complet</Label><Input className="mt-1.5" value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={120} /></div>
                <div><Label>E-mail</Label><Input className="mt-1.5" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} maxLength={200} /></div>
                <div><Label>Téléphone</Label><Input className="mt-1.5" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} maxLength={40} /></div>
              </> : <div className="sm:col-span-2 text-sm text-muted-foreground">{selectedClient?.email ?? "—"} · {selectedClient?.phone ?? "—"}</div>}
              <div><Label>Type</Label><Select value={legalType} onValueChange={(value) => setLegalType(value as "individual" | "company")}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="individual">Particulier</SelectItem><SelectItem value="company">Entreprise</SelectItem></SelectContent></Select></div>
              <div><Label>Nom société</Label><Input className="mt-1.5" value={companyName} onChange={(e) => setCompanyName(e.target.value)} maxLength={160} /></div>
              <div><Label>SIRET</Label><Input className="mt-1.5" value={siret} onChange={(e) => setSiret(e.target.value)} maxLength={40} /></div>
              <div><Label>N° TVA</Label><Input className="mt-1.5" value={vatNumber} onChange={(e) => setVatNumber(e.target.value)} maxLength={40} /></div>
              <div className="sm:col-span-2"><Label>Adresse de facturation</Label><Textarea className="mt-1.5 min-h-20" value={billingAddress} onChange={(e) => setBillingAddress(e.target.value)} maxLength={500} /></div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Titre de la facture</Label><Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} /></div>
              <div className="sm:col-span-2"><Label>Numéro de facture</Label><Input className="mt-1.5" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="FAC-2026-005" maxLength={50} /></div>
              <div><Label>Date d'émission</Label><Input className="mt-1.5" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} disabled={isEdit} /></div>
              <div><Label>Échéance</Label><Input className="mt-1.5" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>Prestations</h2><Button variant="outline" size="sm" onClick={() => setLines((current) => [...current, emptyLine(currency)])}><Plus className="mr-2 h-3.5 w-3.5" />Ligne</Button></div>
            <div className="space-y-4">
              {lines.map((line, index) => <div key={line.id ?? index} className="rounded-lg border border-border/60 p-3">
                <div className="mb-2 text-xs text-muted-foreground">Catalogue</div>
                <CatalogLinePicker value={line.catalogValue} currency={currency} onSelect={(selection) => applyCatalogSelection(index, selection)} />
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_110px_90px_110px_36px] sm:items-end">
                  <div><Label className="mb-1.5 block text-xs">Description</Label><Input value={line.label} onChange={(e) => updateLine(index, { label: e.target.value })} placeholder="Prestation" maxLength={200} /></div>
                  <div><Label className="mb-1.5 block text-xs">Unité</Label><Input value={line.unit} onChange={(e) => updateLine(index, { unit: e.target.value })} /></div>
                  <div><Label className="mb-1.5 block text-xs">Qté</Label><Input type="number" min={0} step="0.5" value={line.quantity} onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })} /></div>
                  <div><Label className="mb-1.5 block text-xs">Prix unitaire</Label><Input type="number" min={0} step="0.01" value={line.unit_price} onChange={(e) => updateLine(index, { unit_price: Number(e.target.value) })} /></div>
                  <Button variant="ghost" size="icon" aria-label="Supprimer la ligne" onClick={() => setLines((current) => current.length > 1 ? current.filter((_, i) => i !== index) : current)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>)}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4"><span className="tracked text-[10px] text-muted-foreground">TOTAL TTC</span><span className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>{formatMoney(total, currency)}</span></div>
          </Card>

          <Card className="p-5"><Label>Notes</Label><Textarea className="mt-1.5 min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} /></Card>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Card className="space-y-4 p-5">
            <div><Label>Statut</Label><Select value={status} onValueChange={(value) => setStatus(value as InvoiceStatus)}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent>{INVOICE_STATUSES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label>Devise</Label><Select value={currency} onValueChange={(value) => { setCurrency(value); setLines((current) => current.map((line) => ({ ...line, currency: value }))); }}><SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="EUR">EUR</SelectItem><SelectItem value="BRL">BRL</SelectItem><SelectItem value="USD">USD</SelectItem></SelectContent></Select></div>
            <Button className="btn-primary mt-2 w-full" onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? "Enregistrement…" : "Enregistrer"}</Button>
            <Button variant="outline" className="w-full" onClick={download} disabled={downloading}><FileDown className="mr-2 h-4 w-4" />{downloading ? "Génération…" : "Générer le PDF"}</Button>
          </Card>
          {isEdit && <Card className="border-primary/10 bg-primary/5 p-5"><p className="font-medium">Statut actuel</p><p className="mt-2"><span className="pill">{invoiceStatusLabel(status)}</span></p></Card>}
        </div>
      </div>
    </PageShell>
  );
}

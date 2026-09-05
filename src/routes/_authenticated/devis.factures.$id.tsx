import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileDown } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/quotes/status";
import { INVOICE_STATUSES, invoiceStatusLabel, legalTypeLabel, type InvoiceStatus } from "@/lib/invoices/status";
import { downloadInvoicePdf } from "@/lib/invoices/download-invoice-pdf";

export const Route = createFileRoute("/_authenticated/devis/factures/$id")({ component: InvoiceDetail, head: () => ({ meta: [{ title: "Facture — JEITINHO" }] }) });

function InvoiceDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [status, setStatus] = useState<InvoiceStatus>("draft");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["invoice", id],
    queryFn: async () => {
      const [{ data: invoice, error }, { data: lines, error: linesError }] = await Promise.all([
        supabase.from("invoices").select("*").eq("id", id).single(),
        supabase.from("invoice_lines").select("*").eq("invoice_id", id).order("position"),
      ]);
      if (error) throw new Error(error.message);
      if (linesError) throw new Error(linesError.message);
      return { invoice: invoice as any, lines: (lines ?? []) as any[] };
    },
  });

  useEffect(() => {
    if (!data?.invoice) return;
    setStatus(data.invoice.status);
    setDueDate(data.invoice.due_date ?? "");
    setNotes(data.invoice.notes ?? "");
  }, [data]);

  if (isLoading || !data) return <PageShell title="Chargement…">{null}</PageShell>;
  const { invoice, lines } = data;
  const total = lines.reduce((acc: number, l: any) => acc + Number(l.quantity) * Number(l.unit_price), 0);

  const save = async () => {
    setSaving(true);
    const payload: any = { status, due_date: dueDate || null, notes: notes.trim() || null };
    if (status === "paid" && !invoice.paid_at) payload.paid_at = new Date().toISOString();
    if (status !== "paid") payload.paid_at = null;
    const { error } = await supabase.from("invoices").update(payload).eq("id", id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Facture enregistrée.");
    qc.invalidateQueries({ queryKey: ["invoice", id] });
    qc.invalidateQueries({ queryKey: ["invoices"] });
  };

  const download = async () => {
    setDownloading(true);
    try {
      await downloadInvoicePdf({
        number: invoice.number,
        title: invoice.title,
        status: invoice.status,
        currency: invoice.currency,
        issueDate: invoice.issue_date,
        dueDate: invoice.due_date,
        notes: invoice.notes,
        billing: {
          legalType: invoice.billing_legal_type,
          name: invoice.billing_name,
          companyName: invoice.billing_company_name,
          siret: invoice.billing_siret,
          vatNumber: invoice.billing_vat_number,
          address: invoice.billing_address,
        },
        lines: lines.map((l: any) => ({ label: l.label, unit: l.unit, quantity: Number(l.quantity), unit_price: Number(l.unit_price) })),
      });
    } catch {
      toast.error("Génération du PDF impossible.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <PageShell
      eyebrow="Facturation"
      title={invoice.number}
      description={invoice.title}
      actions={
        <div className="flex gap-2">
          <Link to="/devis/factures"><Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" />Toutes les factures</Button></Link>
          <Button variant="outline" disabled={downloading} onClick={download}><FileDown className="mr-2 h-4 w-4" />{downloading ? "Génération…" : "Télécharger le PDF"}</Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>Prestations</h2>
              <Badge variant="outline">{lines.length} ligne{lines.length > 1 ? "s" : ""}</Badge>
            </div>
            <div className="space-y-2">
              {lines.map((l: any) => (
                <div key={l.id} className="flex items-center justify-between gap-4 rounded-md border border-border/60 p-3 text-sm">
                  <div className="min-w-0">
                    <p className="truncate">{l.label}</p>
                    <p className="text-xs text-muted-foreground">{l.quantity} × {formatMoney(Number(l.unit_price), l.currency)} · {l.unit}</p>
                  </div>
                  <span className="shrink-0 font-medium">{formatMoney(Number(l.quantity) * Number(l.unit_price), l.currency)}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
              <span className="tracked text-[10px] text-muted-foreground">TOTAL TTC</span>
              <span className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>{formatMoney(total, invoice.currency)}</span>
            </div>
          </Card>

          <Card className="space-y-4 p-5">
            <p className="tracked text-[10px] text-muted-foreground">Facturé à</p>
            <div>
              <p className="text-sm font-medium">{invoice.billing_legal_type === "company" ? (invoice.billing_company_name || invoice.billing_name) : invoice.billing_name}</p>
              <p className="text-xs text-muted-foreground">{legalTypeLabel(invoice.billing_legal_type)}</p>
              {invoice.billing_legal_type === "company" && (invoice.billing_siret || invoice.billing_vat_number) && (
                <p className="mt-1 text-xs text-muted-foreground">{[invoice.billing_siret && `SIRET ${invoice.billing_siret}`, invoice.billing_vat_number && `TVA ${invoice.billing_vat_number}`].filter(Boolean).join(" · ")}</p>
              )}
              {invoice.billing_address && <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{invoice.billing_address}</p>}
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-4 p-5">
            <div>
              <Label>Statut</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {INVOICE_STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Date d'émission</Label>
              <Input className="mt-1.5" value={invoice.issue_date ?? ""} disabled />
            </div>
            <div>
              <Label>Échéance</Label>
              <Input className="mt-1.5" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea className="mt-1.5 min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <Button className="btn-primary w-full" onClick={save} disabled={saving}>{saving ? "Enregistrement…" : "Enregistrer"}</Button>
          </Card>
          <Card className="border-primary/10 bg-primary/5 p-5">
            <p className="font-medium">Statut actuel</p>
            <p className="mt-2"><span className="pill">{invoiceStatusLabel(invoice.status)}</span></p>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

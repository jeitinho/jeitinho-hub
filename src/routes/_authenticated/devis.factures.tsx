import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { formatMoney } from "@/lib/quotes/status";
import { INVOICE_STATUSES, invoiceStatusLabel } from "@/lib/invoices/status";

export const Route = createFileRoute("/_authenticated/devis/factures")({ component: InvoicesList, head: () => ({ meta: [{ title: "Factures — JEITINHO" }] }) });

function InvoicesList() {
  const [filter, setFilter] = useState("all");
  const { data, isLoading, error } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => {
      const { data: invoices, error: invoicesError } = await supabase
        .from("invoices")
        .select("id,number,title,status,total_amount,currency,issue_date,due_date,billing_name")
        .order("created_at", { ascending: false });
      if (invoicesError) throw new Error(invoicesError.message);
      return (invoices ?? []) as any[];
    },
  });
  const rows = (data ?? []).filter((i: any) => filter === "all" || i.status === filter);

  return (
    <PageShell
      eyebrow="Facturation"
      title="Factures"
      description="Les factures sont générées à partir d'un devis accepté."
      actions={
        <div className="flex gap-2">
          <Link to="/devis"><button className="rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground">Devis</button></Link>
          <span className="rounded-md border border-primary bg-primary px-3 py-2 text-xs text-primary-foreground">Factures</span>
        </div>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {[{ value: "all", label: "Toutes" }, ...INVOICE_STATUSES].map((s) => (
          <button key={s.value} onClick={() => setFilter(s.value)} className={`rounded-full border px-3 py-1.5 text-xs ${filter === s.value ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground"}`}>{s.label}</button>
        ))}
      </div>
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Chargement…</div>
      ) : error ? (
        <Card className="border-destructive/40 p-8"><h2 className="font-semibold">Impossible de charger les factures</h2><p className="mt-2 text-sm text-muted-foreground">{(error as Error).message}</p></Card>
      ) : !rows.length ? (
        <Card className="border-dashed p-16 text-center">
          <FileText className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h2 className="text-xl">Aucune facture</h2>
          <p className="mt-2 text-sm text-muted-foreground">Une facture se crée depuis un devis accepté.</p>
          <Link to="/devis" className="mt-6 inline-block"><span className="btn-primary inline-flex h-9 items-center rounded-md px-4 text-sm">Voir les devis</span></Link>
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((inv: any) => (
            <Link key={inv.id} to="/devis/factures/$id" params={{ id: inv.id }} className="block">
              <Card className="flex flex-wrap items-center justify-between gap-4 p-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <span className="tracked text-[10px] text-muted-foreground">{inv.number}</span>
                    <span className="pill">{invoiceStatusLabel(inv.status)}</span>
                  </div>
                  <h3 className="truncate text-base">{inv.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{inv.billing_name ?? "Client non renseigné"}{inv.due_date ? ` · Échéance ${inv.due_date}` : ""}</p>
                </div>
                <span className="text-lg">{formatMoney(Number(inv.total_amount ?? 0), inv.currency)}</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { invoiceStatusLabel } from "@/lib/invoices/status";

export function ConvertQuoteToInvoiceButton({ quoteId }: { quoteId: string }) {
  const navigate = useNavigate(); const qc = useQueryClient(); const [converting, setConverting] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["quote-invoice-link", quoteId],
    queryFn: async () => {
      const [{ data: quote, error: quoteError }, { data: invoice, error: invoiceError }] = await Promise.all([
        supabase.from("quotes").select("id,status").eq("id", quoteId).single(),
        supabase.from("invoices").select("id,number,status").eq("quote_id", quoteId).maybeSingle(),
      ]);
      if (quoteError) throw new Error(quoteError.message);
      if (invoiceError) throw new Error(invoiceError.message);
      return { quote: quote as any, invoice: invoice as any };
    },
  });
  if (isLoading || !data) return null;
  if (data.invoice) return (
    <Card className="flex flex-wrap items-center justify-between gap-3 border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-5 w-5 text-primary" />
        <div>
          <p className="font-medium">Facture créée</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="secondary">{data.invoice.number}</Badge>
            <span>{invoiceStatusLabel(data.invoice.status)}</span>
          </div>
        </div>
      </div>
      <Button variant="outline" onClick={() => navigate({ to: "/devis/factures/$id", params: { id: data.invoice.id } })}>
        Ouvrir la facture <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </Card>
  );
  if (data.quote.status !== "accepted") return null;
  const convert = async () => {
    setConverting(true);
    try {
      const { data: invoiceId, error } = await supabase.rpc("convert_quote_to_invoice", { p_quote_id: quoteId });
      if (error) throw new Error(error.message);
      if (!invoiceId) throw new Error("La conversion n'a pas retourné de facture.");
      toast.success("Facture créée à partir du devis accepté.");
      await qc.invalidateQueries({ queryKey: ["quote-invoice-link", quoteId] });
      navigate({ to: "/devis/factures/$id", params: { id: invoiceId } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer la facture.");
    } finally {
      setConverting(false);
    }
  };
  return (
    <Card className="flex flex-wrap items-center justify-between gap-4 border-amber-500/30 bg-amber-500/5 p-4">
      <div>
        <p className="font-medium">Devis accepté</p>
        <p className="mt-1 text-sm text-muted-foreground">Génère la facture correspondante, avec les coordonnées de facturation du client.</p>
      </div>
      <Button onClick={convert} disabled={converting} className="btn-primary">
        {converting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
        Créer la facture
      </Button>
    </Card>
  );
}

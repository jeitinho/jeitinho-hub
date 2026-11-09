import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  fetchQuoteCandidates,
  importQuoteIntoTrip,
  quoteLabel,
  type QuoteCandidate,
} from "@/lib/ops/trip-from-quote";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Sur la fiche voyage : si un devis existe déjà pour ce client / cette demande et que ses lignes
 * ne sont pas encore dans le voyage, propose de tout reprendre en un clic.
 */
export function QuoteImportBanner({
  tripId,
  clientId,
  prospectId,
  linkedQuoteId,
  importedQuoteLineIds,
  onImported,
}: {
  tripId: string;
  clientId: string | null;
  prospectId: string | null;
  linkedQuoteId: string | null;
  importedQuoteLineIds: string[];
  onImported: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const { data: candidates = [] } = useQuery({
    queryKey: [
      "trip-quote-candidates",
      tripId,
      clientId,
      prospectId,
      linkedQuoteId,
      importedQuoteLineIds.length,
    ],
    enabled: !dismissed && (!!clientId || !!prospectId || !!linkedQuoteId),
    queryFn: async (): Promise<QuoteCandidate[]> => {
      const list = (await fetchQuoteCandidates()).filter(
        (q) =>
          (clientId && q.client_id === clientId) || (prospectId && q.prospect_id === prospectId),
      );
      // Devis déjà lié au voyage mais lignes jamais reprises (voyage créé avant cette fonction).
      if (
        linkedQuoteId &&
        importedQuoteLineIds.length === 0 &&
        !list.some((q) => q.id === linkedQuoteId)
      ) {
        const { data } = await db
          .from("quotes")
          .select(
            "id,number,reference,title,status,client_id,prospect_id,period_start,period_end,party_size,currency,total_amount,client:clients(full_name),lines:quote_lines(label,is_optional)",
          )
          .eq("id", linkedQuoteId)
          .maybeSingle();
        if (data) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const lines = ((data.lines ?? []) as any[]).filter((l) => !l.is_optional);
          if (lines.length)
            list.unshift({
              ...data,
              client_name: data.client?.full_name ?? null,
              total_amount: data.total_amount == null ? null : Number(data.total_amount),
              line_count: lines.length,
              line_labels: lines.map((l) => String(l.label ?? "")),
            });
        }
      }
      return list.filter((q) => q.line_count > 0);
    },
  });

  if (dismissed || candidates.length === 0) return null;

  const run = async (q: QuoteCandidate) => {
    setBusy(q.id);
    try {
      const n = await importQuoteIntoTrip(tripId, q.id);
      toast.success(
        n
          ? `${n} prestation${n > 1 ? "s" : ""} reprise${n > 1 ? "s" : ""} du devis, à placer dans le planning.`
          : "Ce devis est déjà repris dans le voyage.",
      );
      onImported();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="mt-6 border-primary/40 bg-primary/5 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <FileText className="h-5 w-5 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">
            {candidates.length === 1
              ? "Un devis existe pour ce voyage."
              : `${candidates.length} devis existent pour ce voyage.`}
          </p>
          <p className="text-xs text-muted-foreground">
            Remplir le voyage avec : dates et voyageurs manquants, montant, et les prestations (dans
            « À placer »).
          </p>
        </div>
        {candidates.slice(0, 3).map((q) => (
          <Button
            key={q.id}
            size="sm"
            className="btn-primary"
            disabled={!!busy}
            onClick={() => run(q)}
          >
            {busy === q.id && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
            {quoteLabel(q)} · {q.line_count} presta.
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
          Plus tard
        </Button>
      </div>
    </Card>
  );
}

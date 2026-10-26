import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileDown, FilePlus2, FileText, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { formatMoney, quoteStatusLabel } from "@/lib/quotes/status";
import { activityStatusLabel } from "@/lib/trips/status";
import { fetchPayments, paymentBalance, PAYMENT_RATES } from "@/lib/ops/payments";
import { downloadPlanningPdf } from "@/lib/trips/download-planning-pdf";
import {
  generateOrUpdateQuoteFromTrip,
  hasPlanningChangedSince,
} from "@/lib/trips/generate-quote-from-trip";
import { SLOTS, type PlanningActivity } from "@/components/trips/trip-planning-tab";

const WEEKDAY = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "short" }).toUpperCase();
const SLOT_LABEL: Record<string, string> = Object.fromEntries(SLOTS.map((s) => [s.key, s.label]));

function fmtDay(iso: string | null): string {
  if (!iso) return "—";
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function enumerateDays(start: string, end: string): string[] {
  const days: string[] = [];
  let cur = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);
  while (cur <= last) {
    days.push(cur.toISOString().slice(0, 10));
    cur = new Date(cur.getTime() + 86_400_000);
  }
  return days;
}

export function TripSummaryTab({
  tripId,
  quoteId,
  clientName,
  startDate,
  endDate,
  partySize,
  currency,
  guideName,
  depositPct,
  activities,
}: {
  tripId: string;
  quoteId: string | null;
  clientName: string;
  startDate: string | null;
  endDate: string | null;
  partySize: number | null;
  currency: string;
  guideName: string | null;
  depositPct: number;
  activities: PlanningActivity[];
}) {
  const cur = (currency || "EUR").toUpperCase();
  const billable = activities.filter((a) => a.kind === "activity");
  const total = billable.reduce(
    (sum, a) => sum + (a.is_offered ? 0 : Number(a.sale_price || 0)),
    0,
  );
  const perPerson = partySize && partySize > 0 ? total / partySize : null;
  const deposit = (total * depositPct) / 100;

  const { data: payments = [] } = useQuery({
    queryKey: ["payments", quoteId ?? null, tripId],
    queryFn: () => fetchPayments({ tripId, quoteId }),
  });
  const balance = paymentBalance(total, cur, payments, PAYMENT_RATES);

  const qc = useQueryClient();
  const { data: linkedQuote } = useQuery({
    queryKey: ["trip-quote-link", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotes")
        .select("id,number,reference,status,planning_synced_at")
        .eq("id", quoteId!)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
  });
  const frozen = !!linkedQuote && linkedQuote.status !== "draft";
  const { data: planningChanged = false } = useQuery({
    queryKey: ["planning-changed", tripId, linkedQuote?.planning_synced_at],
    enabled: frozen && !!linkedQuote?.planning_synced_at,
    queryFn: () => hasPlanningChangedSince(tripId, linkedQuote!.planning_synced_at!),
  });
  const [generating, setGenerating] = useState(false);
  const generateQuote = async () => {
    setGenerating(true);
    try {
      const { quoteId: newQuoteId, versioned } = await generateOrUpdateQuoteFromTrip(tripId);
      toast.success(versioned ? "Nouvelle version du devis créée." : "Devis généré.");
      await qc.invalidateQueries({ queryKey: ["trip", tripId] });
      await qc.invalidateQueries({ queryKey: ["trip-quote-link"] });
      await qc.invalidateQueries({ queryKey: ["quotes"] });
      return newQuoteId;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de générer le devis.");
      return null;
    } finally {
      setGenerating(false);
    }
  };

  const [pdfTitle, setPdfTitle] = useState(() => {
    if (startDate && endDate) {
      const days = Math.round(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000 + 1,
      );
      return days >= 6 && days <= 8 ? "Une semaine à Rio" : "Votre séjour à Rio";
    }
    return "Votre séjour à Rio";
  });
  const [printStart, setPrintStart] = useState(startDate ?? "");
  const [printEnd, setPrintEnd] = useState(endDate ?? "");

  const generatePdf = async () => {
    if (!printStart || !printEnd) return toast.error("Choisis la plage de dates à imprimer.");
    const days = enumerateDays(printStart, printEnd).map((date) => {
      const lines = activities
        .filter((a) => a.day === date && (a.kind === "activity" || a.kind === "free"))
        .sort(
          (x, y) =>
            SLOTS.findIndex((s) => s.key === x.slot) - SLOTS.findIndex((s) => s.key === y.slot),
        )
        .map((a) => ({
          slotLabel: SLOT_LABEL[a.slot ?? ""] ?? "",
          title: a.title,
          displayTime: a.display_time,
          category: a.category,
          isOffered: a.is_offered,
          kind: a.kind,
        }));
      return { date, weekdayLabel: WEEKDAY(date), lines };
    });
    const nightEntries = activities
      .filter(
        (a) =>
          a.kind === "activity" &&
          a.category === "soiree" &&
          a.day &&
          a.day >= printStart &&
          a.day <= printEnd,
      )
      .sort((x, y) => (x.day! < y.day! ? -1 : 1))
      .map((a) => ({ date: a.day as string, title: a.title }));
    try {
      await downloadPlanningPdf({
        clientName,
        periodStart: printStart,
        periodEnd: printEnd,
        title: pdfTitle,
        days,
        nightEntries,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de générer le PDF.");
    }
  };

  return (
    <div className="space-y-6">
      <Card className="space-y-3 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Devis</h2>
          {linkedQuote && (
            <Link
              to="/devis/$id"
              params={{ id: linkedQuote.id }}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <FileText className="h-3.5 w-3.5" />
              {linkedQuote.number ?? linkedQuote.reference} · {quoteStatusLabel(linkedQuote.status)}
            </Link>
          )}
        </div>
        {frozen && planningChanged && (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
            Le planning a changé depuis l'envoi du devis.
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {!linkedQuote ? (
            <Button onClick={generateQuote} disabled={generating || billable.length === 0}>
              <FilePlus2 className="mr-2 h-4 w-4" />
              {generating ? "Génération…" : "Générer le devis"}
            </Button>
          ) : frozen ? (
            <Button onClick={generateQuote} disabled={generating || billable.length === 0}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {generating ? "Création…" : "Mettre à jour le devis"}
            </Button>
          ) : (
            <Button onClick={generateQuote} disabled={generating || billable.length === 0}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {generating ? "Régénération…" : "Régénérer les lignes depuis le planning"}
            </Button>
          )}
        </div>
      </Card>

      <Card className="overflow-x-auto p-5">
        <h2 className="mb-4 font-semibold">Synthèse</h2>
        {billable.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune prestation facturable sur ce voyage.
          </p>
        ) : (
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-muted-foreground">
                <th className="py-2 pr-2">Activité</th>
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Accompagnateur</th>
                <th className="py-2 pr-2">Statut</th>
                <th className="py-2 pr-2 text-right">Prix/pers</th>
                <th className="py-2 text-right">Prix total</th>
              </tr>
            </thead>
            <tbody>
              {billable.map((a) => {
                const qty = Number(a.quantity) || 1;
                const salePrice = Number(a.sale_price) || 0;
                return (
                  <tr key={a.id} className="border-b border-border/60">
                    <td className="py-2 pr-2">
                      {a.title}
                      {a.is_offered && (
                        <Badge variant="outline" className="ml-1.5">
                          Offert
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 pr-2 text-muted-foreground">{fmtDay(a.day)}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{guideName ?? "—"}</td>
                    <td className="py-2 pr-2 text-muted-foreground">
                      {activityStatusLabel(a.status)}
                    </td>
                    <td className="py-2 pr-2 text-right">
                      {a.is_offered
                        ? "—"
                        : formatMoney(qty > 0 ? salePrice / qty : salePrice, a.currency || cur)}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {a.is_offered ? "Offert" : formatMoney(salePrice, a.currency || cur)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-6 border-t pt-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Total</p>
            <p className="font-semibold">{formatMoney(total, cur)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total/pers</p>
            <p className="font-semibold">{perPerson != null ? formatMoney(perPerson, cur) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Acompte ({depositPct}%)</p>
            <p className="font-semibold">{formatMoney(deposit, cur)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reçu</p>
            <p className="font-semibold text-primary">{formatMoney(balance.paid, cur)}</p>
          </div>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <h2 className="font-semibold">PDF planning</h2>
        <p className="text-xs text-muted-foreground">
          Document sans prix, à partager avec le client. Pré-planning adaptable (encadré météo
          inclus automatiquement).
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5 sm:col-span-1">
            <Label>Titre</Label>
            <Input value={pdfTitle} onChange={(e) => setPdfTitle(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Du</Label>
            <Input type="date" value={printStart} onChange={(e) => setPrintStart(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Au</Label>
            <Input type="date" value={printEnd} onChange={(e) => setPrintEnd(e.target.value)} />
          </div>
        </div>
        <Button onClick={generatePdf}>
          <FileDown className="mr-2 h-4 w-4" />
          PDF planning
        </Button>
      </Card>
    </div>
  );
}

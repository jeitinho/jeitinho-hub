import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatMoney } from "@/lib/quotes/status";
import {
  CLIENT_PAYMENT_KINDS,
  PAYMENT_KIND_LABEL,
  PAYMENT_METHODS,
  PAYMENT_RATES,
  addPayment,
  deletePayment,
  fetchPayments,
  paymentBalance,
  paymentSign,
  type PaymentKind,
  type PaymentRow,
} from "@/lib/ops/payments";

const CURRENCIES = ["EUR", "BRL", "USD"];

function todayRio() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

function fmtDay(d: string) {
  const [y, m, day] = d.slice(0, 10).split("-");
  return `${day}/${m}/${y}`;
}

/**
 * Bloc « Paiements » : liste, ajout, suppression, reste à payer.
 * - sur un devis : quoteId (les paiements ajoutés sont rattachés au devis)
 * - sur un voyage : tripId (+ quoteId du devis source : ses paiements sont aussi listés,
 *   et les nouveaux paiements sont rattachés aux deux)
 */
export function PaymentsBlock({
  quoteId,
  tripId,
  clientId,
  currency,
  total,
  totalLabel = "Total du devis",
  invalidateKeys = [],
}: {
  quoteId?: string | null;
  tripId?: string | null;
  clientId?: string | null;
  currency: string;
  total: number;
  totalLabel?: string;
  invalidateKeys?: readonly (readonly unknown[])[];
}) {
  const qc = useQueryClient();
  const cur = (currency || "EUR").toUpperCase();
  const key = ["payments", quoteId ?? null, tripId ?? null] as const;
  const {
    data: payments = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: key,
    queryFn: () => fetchPayments({ quoteId, tripId }),
  });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState<PaymentRow | null>(null);
  const emptyForm = () => ({
    paid_at: todayRio(),
    amount: "",
    currency: cur,
    kind: "acompte" as PaymentKind,
    method: "",
    notes: "",
  });
  const [f, setF] = useState(emptyForm);

  const balance = paymentBalance(total, cur, payments, PAYMENT_RATES);
  const otherCurrencies = Object.keys(balance.otherCurrencies);
  const unconverted = Object.keys(balance.unconverted);

  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["payments"] }),
      qc.invalidateQueries({ queryKey: ["finances"] }),
      qc.invalidateQueries({ queryKey: ["quotes"] }),
      qc.invalidateQueries({ queryKey: ["demandes"] }),
      ...(quoteId
        ? [
            qc.invalidateQueries({ queryKey: ["quote-meta", quoteId] }),
            qc.invalidateQueries({ queryKey: ["quote-trip-link", quoteId] }),
            qc.invalidateQueries({ queryKey: ["quote-invoice-link", quoteId] }),
          ]
        : []),
      ...invalidateKeys.map((k) => qc.invalidateQueries({ queryKey: k as unknown[] })),
    ]);
  };

  const submit = async () => {
    const amount = Number(String(f.amount).replace(",", "."));
    setSaving(true);
    try {
      await addPayment({
        paid_at: f.paid_at,
        amount,
        currency: f.currency,
        kind: f.kind,
        method: f.method || null,
        notes: f.notes.trim() || null,
        client_id: clientId ?? null,
        quote_id: quoteId ?? null,
        trip_id: tripId ?? null,
      });
      toast.success("Paiement enregistré.");
      setF(emptyForm());
      setOpen(false);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deletePayment(toDelete.id);
      toast.success("Paiement supprimé.");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Suppression impossible.");
    } finally {
      setToDelete(null);
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Wallet className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Paiements</h2>
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Ajouter un paiement
        </Button>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">{totalLabel}</p>
          <p className="font-medium tabular-nums">{formatMoney(balance.total, cur)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Déjà payé</p>
          <p className="font-medium tabular-nums">{formatMoney(balance.paid, cur)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Reste à payer</p>
          <p
            className={`font-semibold tabular-nums ${balance.remaining > 0 ? "" : "text-emerald-700 dark:text-emerald-300"}`}
          >
            {balance.settled ? "Soldé" : formatMoney(balance.remaining, cur)}
          </p>
        </div>
      </div>
      {otherCurrencies.length > 0 && (
        <p className="mb-3 text-xs text-amber-700 dark:text-amber-300">
          Payé aussi en autre devise :{" "}
          {otherCurrencies.map((c) => formatMoney(balance.otherCurrencies[c], c)).join(" + ")}.{" "}
          {unconverted.length
            ? `Pas de taux connu pour ${unconverted.join(", ")} : non déduit du reste.`
            : `Converti au taux indicatif (1 EUR = ${PAYMENT_RATES.BRL} BRL) dans le reste à payer.`}{" "}
          Le passage automatique en « Payé » ne compte que les paiements en {cur}.
        </p>
      )}

      {open && (
        <div className="mb-4 grid gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Date</Label>
            <Input
              type="date"
              value={f.paid_at}
              onChange={(e) => setF({ ...f, paid_at: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Montant</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={f.amount}
              onChange={(e) => setF({ ...f, amount: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Devise</Label>
            <Select value={f.currency} onValueChange={(v) => setF({ ...f, currency: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...new Set([cur, ...CURRENCIES])].map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Type</Label>
            <Select value={f.kind} onValueChange={(v) => setF({ ...f, kind: v as PaymentKind })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CLIENT_PAYMENT_KINDS.map((k) => (
                  <SelectItem key={k.value} value={k.value}>
                    {k.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Moyen de paiement</Label>
            <Select
              value={f.method || "__none__"}
              onValueChange={(v) => setF({ ...f, method: v === "__none__" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Non précisé</SelectItem>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Note</Label>
            <Input
              value={f.notes}
              maxLength={300}
              onChange={(e) => setF({ ...f, notes: e.target.value })}
            />
          </div>
          <div className="flex gap-2 sm:col-span-3">
            <Button size="sm" className="btn-primary" disabled={saving} onClick={submit}>
              {saving ? "Enregistrement…" : "Enregistrer le paiement"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun paiement enregistré.</p>
      ) : (
        <ul className="divide-y divide-border/50">
          {payments.map((p) => (
            <li key={p.id} className="flex items-start justify-between gap-3 py-2 text-sm">
              <div className="min-w-0">
                <p className="font-medium">
                  {PAYMENT_KIND_LABEL[p.kind] ?? p.kind}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {fmtDay(p.paid_at)}
                    {p.method ? ` · ${p.method}` : ""}
                  </span>
                </p>
                {p.notes && <p className="truncate text-xs text-muted-foreground">{p.notes}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span
                  className={`tabular-nums ${paymentSign(p.kind) < 0 ? "text-destructive" : ""}`}
                >
                  {paymentSign(p.kind) < 0 ? "− " : ""}
                  {formatMoney(Number(p.amount), p.currency.toUpperCase())}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  aria-label="Supprimer ce paiement"
                  title="Supprimer ce paiement"
                  onClick={() => setToDelete(p)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce paiement ?</AlertDialogTitle>
            <AlertDialogDescription>
              {toDelete
                ? `${PAYMENT_KIND_LABEL[toDelete.kind] ?? toDelete.kind} de ${formatMoney(Number(toDelete.amount), toDelete.currency.toUpperCase())} du ${fmtDay(toDelete.paid_at)}. `
                : ""}
              Le reste à payer sera recalculé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Wallet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/quotes/status";
import { paymentSchedule, SCHEDULE_LABEL, type ScheduleState } from "@/lib/quotes/payment-schedule";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const today = () => new Date().toLocaleDateString("fr-CA", { timeZone: "America/Sao_Paulo" });

const TONE: Record<ScheduleState, string> = {
  en_retard: "bg-destructive/10 text-destructive ring-1 ring-inset ring-destructive/20",
  acompte_attendu: "bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-300/60",
  solde_a_venir: "bg-primary/10 text-primary ring-1 ring-inset ring-primary/20",
  acompte_recu: "bg-sky-50 text-sky-800 ring-1 ring-inset ring-sky-200",
  solde: "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-200",
};
const ORDER: ScheduleState[] = [
  "en_retard",
  "acompte_attendu",
  "solde_a_venir",
  "acompte_recu",
  "solde",
];

/**
 * Échéancier des devis acceptés (modèle WeTravel) : qui doit quoi, pour quand.
 * Les relances correspondantes arrivent toutes seules dans « À envoyer ».
 */
export function PaymentsTracker() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(true);
  const { data = [] } = useQuery({
    queryKey: ["payments-tracker"],
    queryFn: async () => {
      const { data: quotes, error } = await db
        .from("quotes")
        .select(
          "id,number,reference,title,status,total_amount,currency,deposit_pct,accepted_at,balance_due_on,period_start,client:clients(full_name),payments(amount,currency,kind,paid_at)",
        )
        .in("status", ["accepted", "ready", "paid"])
        .order("period_start", { ascending: true, nullsFirst: false });
      if (error) throw new Error(error.message);
      const d = today();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return ((quotes ?? []) as any[])
        .map((q) => ({ q, s: paymentSchedule(q, q.payments ?? [], d) }))
        .filter(({ q, s }) => s.state !== "solde" || (q.period_start && q.period_start >= d))
        .sort((a, b) => ORDER.indexOf(a.s.state) - ORDER.indexOf(b.s.state));
    },
  });
  if (data.length === 0) return null;
  const dueTotal = data.filter(({ s }) => s.state !== "solde");

  const setDue = async (id: string, value: string) => {
    const { error } = await db
      .from("quotes")
      .update({ balance_due_on: value || null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(
      value ? "Échéance du solde enregistrée : la relance est programmée." : "Échéance retirée.",
    );
    void qc.invalidateQueries({ queryKey: ["payments-tracker"] });
  };

  return (
    <Card className="mb-6 overflow-hidden p-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30"
      >
        <Wallet className="h-4 w-4 text-primary" />
        <span className="font-medium">Encaissements à suivre</span>
        <span className="text-xs text-muted-foreground">
          {dueTotal.length} devis avec un montant restant
          {data.some(({ s }) => s.state === "en_retard") && (
            <span className="ml-1 font-medium text-destructive">
              · {data.filter(({ s }) => s.state === "en_retard").length} en retard
            </span>
          )}
        </span>
        <ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="divide-y divide-border/50 border-t border-border/60">
          {data.map(({ q, s }) => (
            <div
              key={q.id}
              className="grid items-center gap-3 px-4 py-3 sm:grid-cols-[1fr_200px_150px_130px]"
            >
              <Link to="/devis/$id" params={{ id: q.id }} className="min-w-0 hover:underline">
                <p className="truncate text-sm font-medium">
                  {q.client?.full_name ?? q.title}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    {q.number ?? q.reference}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Acompte {q.deposit_pct ?? 0} % : {formatMoney(s.deposit, s.currency)}{" "}
                  {s.depositPaid ? "✓" : ""}
                  {s.state === "acompte_attendu" &&
                    s.daysSinceAccepted != null &&
                    ` · accepté il y a ${s.daysSinceAccepted} j`}
                  {s.otherCurrencyCount > 0 &&
                    ` · ${s.otherCurrencyCount} paiement(s) dans une autre devise, non comptés`}
                </p>
              </Link>
              <div>
                <div className="mb-1 flex justify-between text-xs tabular-nums">
                  <span>{formatMoney(s.paid, s.currency)}</span>
                  <span className="text-muted-foreground">
                    / {formatMoney(s.total, s.currency)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      s.state === "en_retard" ? "bg-destructive" : "bg-emerald-600",
                    )}
                    style={{ width: `${s.progress * 100}%` }}
                  />
                </div>
              </div>
              <label className="text-xs text-muted-foreground">
                Solde à payer avant le
                <Input
                  type="date"
                  className="mt-0.5 h-8 text-xs"
                  defaultValue={q.balance_due_on ?? ""}
                  onBlur={(e) =>
                    e.target.value !== (q.balance_due_on ?? "") && void setDue(q.id, e.target.value)
                  }
                />
              </label>
              <span
                className={cn(
                  "justify-self-start rounded-full px-2.5 py-1 text-[11px] font-medium sm:justify-self-end",
                  TONE[s.state],
                )}
              >
                {SCHEDULE_LABEL[s.state]}
                {s.state !== "solde" &&
                  s.remaining > 0 &&
                  ` · ${formatMoney(s.remaining, s.currency)}`}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

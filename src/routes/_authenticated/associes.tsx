import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Plus,
  Settings2,
  Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fmtMoney } from "@/lib/ops/ops";
import { useAuth } from "@/hooks/use-auth";
import {
  computeMonthSplit,
  entryMargin,
  monthBounds,
  type LedgerEntry,
  type Member,
  type PartnerSettings,
} from "@/lib/ops/partner-split";

export const Route = createFileRoute("/_authenticated/associes")({
  component: AssociesPage,
  head: () => ({ meta: [{ title: "Associés — JEITINHO" }] }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const NONE = "none";

type Row = LedgerEntry & {
  id: string;
  occurred_on: string;
  label: string;
  source_type: string;
  cash_status: "a_recevoir" | "recu";
  expected_amount: number | null;
  expected_currency: string | null;
  expected_on: string | null;
  received_on: string | null;
  notes: string | null;
};
type Settings = PartnerSettings & {
  currency: string;
  start_date: string;
  tax_confirmed: boolean;
};

const today = () => new Date().toLocaleDateString("fr-CA", { timeZone: "America/Sao_Paulo" });
const thisMonth = () => today().slice(0, 7);
function shift(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
function monthTitle(month: string) {
  const [y, m] = month.split("-").map(Number);
  const s = new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
const frDate = (iso: string | null) => (iso ? iso.split("-").reverse().join("/") : "—");
const num = (v: unknown) => (v == null ? null : Number(v));
const SOURCE_LABEL: Record<string, string> = {
  manual: "Saisie",
  ota_booking: "GetYourGuide",
  payment: "Paiement client",
  trip_activity: "Voyage",
};

function AssociesPage() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth();
  const [month, setMonth] = useState(thisMonth());
  const [adding, setAdding] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [receiving, setReceiving] = useState<Row | null>(null);
  const { from, to } = monthBounds(month);

  const membersQ = useQuery({
    queryKey: ["partner-members"],
    queryFn: async () => {
      const { data, error } = await db
        .from("partner_members")
        .select("user_id,display_name")
        .eq("active", true)
        .order("sort_order");
      if (error) throw new Error(error.message);
      return (data ?? []) as Member[];
    },
  });
  const settingsQ = useQuery({
    queryKey: ["partner-settings"],
    queryFn: async () => {
      const { data, error } = await db.from("partner_settings").select("*").eq("id", 1).single();
      if (error) throw new Error(error.message);
      return data as Settings;
    },
  });
  const normalize = (r: Row): Row => ({
    ...r,
    revenue: Number(r.revenue),
    direct_cost: Number(r.direct_cost),
    expected_amount: num(r.expected_amount),
  });
  // Partage du mois = argent REÇU pendant le mois (date de réception).
  const receivedQ = useQuery({
    queryKey: ["partner-ledger", "recu", month],
    queryFn: async () => {
      const { data, error } = await db
        .from("partner_ledger_entries")
        .select("*")
        .eq("cash_status", "recu")
        .gte("received_on", from)
        .lte("received_on", to)
        .order("received_on", { ascending: false });
      if (error) throw new Error(error.message);
      return ((data ?? []) as Row[]).map(normalize);
    },
  });
  // À venir = toutes les ventes faites dont l'argent n'est pas encore arrivé, quel que soit le mois.
  const pendingQ = useQuery({
    queryKey: ["partner-ledger", "a_recevoir"],
    queryFn: async () => {
      const { data, error } = await db
        .from("partner_ledger_entries")
        .select("*")
        .eq("cash_status", "a_recevoir")
        .order("occurred_on", { ascending: true });
      if (error) throw new Error(error.message);
      return ((data ?? []) as Row[]).map(normalize);
    },
  });

  const members = membersQ.data ?? [];
  const settings = settingsQ.data;
  const received = receivedQ.data ?? [];
  const pending = pendingQ.data ?? [];
  const cur = settings?.currency ?? "BRL";
  const split = useMemo(
    () => (settings ? computeMonthSplit([...received, ...pending], members, settings) : null),
    [received, pending, members, settings],
  );
  const refresh = () => qc.invalidateQueries({ queryKey: ["partner-ledger"] });
  const beforeStart = settings?.start_date ? to < settings.start_date : false;

  const importMonth = async () => {
    const { data, error } = await db.rpc("partner_ledger_import_month", { p_month: from });
    if (error) return toast.error(error.message);
    toast.success(
      data
        ? `${data} vente(s) ajoutée(s), en « À venir ».`
        : "Rien de nouveau à importer pour ce mois.",
    );
    refresh();
  };
  const patch = async (id: string, values: Partial<Row>) => {
    const { error } = await db.from("partner_ledger_entries").update(values).eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  };
  const remove = async (id: string) => {
    const { error } = await db.from("partner_ledger_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Ligne supprimée.");
    refresh();
  };
  const missing = received.filter(
    (e) => (e.guided_internally && !e.guide_id) || !e.apporteur_id,
  ).length;
  const pendingTotal = split
    ? Object.entries(split.pending_by_currency)
        .map(([c, v]) => fmtMoney(v, c))
        .join(" + ")
    : "";

  return (
    <PageShell
      eyebrow="Association JEITINHO"
      title="Registre des parts"
      description={`Les comptes de l'association depuis le ${frDate(settings?.start_date ?? "2026-11-09")}. On ne partage que l'argent réellement arrivé sur le compte, au montant reçu.`}
      actions={
        <>
          {isAdmin && (
            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              title="Paramètres du partage"
            >
              <Settings2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="outline" onClick={importMonth}>
            <Download className="mr-2 h-4 w-4" />
            Importer les ventes
          </Button>
          <Button className="btn-primary" onClick={() => setAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter une vente
          </Button>
        </>
      }
    >
      {(membersQ.error || settingsQ.error || receivedQ.error || pendingQ.error) && (
        <Card className="mb-6 border-destructive/40 p-4 text-sm text-destructive">
          Chargement impossible :{" "}
          {String(
            (membersQ.error || settingsQ.error || receivedQ.error || pendingQ.error)?.message,
          )}
        </Card>
      )}

      {/* ---------------- À venir */}
      <section className="mb-8">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>
            À venir
          </h2>
          <span className="text-sm text-muted-foreground">
            {pending.length
              ? `${pending.length} vente(s) pas encore payée(s) · attendu ${pendingTotal}`
              : "Rien en attente"}
          </span>
        </div>
        {pending.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Les réservations GetYourGuide et les paiements enregistrés arrivent ici automatiquement,
            jusqu'à ce que l'argent soit sur le compte.
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.map((e) => (
              <Card key={e.id} className="flex flex-wrap items-center gap-3 p-3">
                <Clock className="h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">{e.label}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {SOURCE_LABEL[e.source_type] ?? e.source_type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Vente du {frDate(e.occurred_on)}
                    {e.expected_amount != null &&
                      ` · attendu ${fmtMoney(e.expected_amount, e.expected_currency ?? "BRL")}`}
                    {e.source_type === "ota_booking" &&
                      " (prix client, commission plateforme à déduire)"}
                  </p>
                </div>
                <Button size="sm" className="btn-primary" onClick={() => setReceiving(e)}>
                  <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  Marquer reçu
                </Button>
                <ConfirmDelete onConfirm={() => remove(e.id)} />
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- Mois */}
      <div className="mb-4 flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonth(shift(month, -1))}
          aria-label="Mois précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-40 text-center text-lg" style={{ fontFamily: "Fraunces, serif" }}>
          {monthTitle(month)}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMonth(shift(month, 1))}
          aria-label="Mois suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {month !== thisMonth() && (
          <Button variant="link" size="sm" onClick={() => setMonth(thisMonth())}>
            Ce mois-ci
          </Button>
        )}
      </div>

      {beforeStart ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Le registre commence le {frDate(settings?.start_date ?? null)}. Rien n'est compté avant.
        </Card>
      ) : (
        split && (
          <>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat
                label="Reçu ce mois"
                value={fmtMoney(split.revenue, cur)}
                hint={`${received.length} encaissement(s)`}
              />
              <Stat
                label="Marge"
                value={fmtMoney(split.margin, cur)}
                hint={
                  settings?.tax_confirmed
                    ? `après impôts (${settings.tax_pct} %) et coûts`
                    : "impôts non déduits : taux à confirmer"
                }
              />
              <Stat
                label="Réserve société"
                value={fmtMoney(split.reserve, cur)}
                hint={`${settings?.reserve_pct} % du reste`}
              />
              <Stat
                label="Solde partagé"
                value={fmtMoney(split.balance, cur)}
                hint={
                  members.length ? `${fmtMoney(split.balance / members.length, cur)} chacun` : ""
                }
              />
            </div>

            {(!settings?.tax_confirmed || split.warnings.length > 0 || missing > 0) && (
              <Card className="mb-6 border-amber-500/40 bg-amber-500/5 p-4 text-sm">
                <div className="flex gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <ul className="space-y-1">
                    {!settings?.tax_confirmed && (
                      <li>
                        Le taux d'impôt n'est pas encore connu : aucun impôt n'est déduit. À
                        renseigner dès que le contador l'a donné.
                      </li>
                    )}
                    {missing > 0 && (
                      <li>
                        {missing} encaissement(s) sans guide ou sans apporteur : complète-les pour
                        des primes justes.
                      </li>
                    )}
                    {split.warnings.map((w) => (
                      <li key={w}>
                        {w}
                        {w.includes("réserve")
                          ? ` Manque : ${fmtMoney(split.shortfall, cur)}.`
                          : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            )}

            <Card className="mb-8 overflow-x-auto p-0">
              <table className="w-full text-sm">
                <thead className="border-b border-border/60 text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Associé</th>
                    <th className="px-4 py-3 text-right">Pró-labore</th>
                    <th className="px-4 py-3 text-right">Prime guide</th>
                    <th className="px-4 py-3 text-right">Prime apporteur</th>
                    <th className="px-4 py-3 text-right">Part du solde</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3 text-right">Frais véhicule</th>
                  </tr>
                </thead>
                <tbody>
                  {split.members.map((m) => (
                    <tr key={m.user_id} className="border-b border-border/40 last:border-0">
                      <td className="px-4 py-3 font-medium">{m.display_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {fmtMoney(m.pro_labore, cur)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {fmtMoney(m.guide_bonus, cur)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {fmtMoney(m.apporteur_bonus, cur)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {fmtMoney(m.balance_share, cur)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold tabular-nums">
                        {fmtMoney(m.total, cur)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
                        {m.vehicle_refund ? fmtMoney(m.vehicle_refund, cur) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>

            <h2 className="mb-3 text-xl" style={{ fontFamily: "Fraunces, serif" }}>
              Encaissé ce mois
            </h2>
            {received.length === 0 ? (
              <Card className="p-8 text-center text-sm text-muted-foreground">
                Aucun argent reçu ce mois-ci. Quand un versement arrive, clique « Marquer reçu »
                dans « À venir », ou ajoute une vente payée sur place.
              </Card>
            ) : (
              <div className="space-y-2">
                {received.map((e) => (
                  <Card key={e.id} className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{e.label}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {SOURCE_LABEL[e.source_type] ?? e.source_type}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Vente du {frDate(e.occurred_on)} · reçu le {frDate(e.received_on)}
                          {e.expected_amount != null &&
                            ` · attendu ${fmtMoney(e.expected_amount, e.expected_currency ?? "BRL")}`}
                        </div>
                      </div>
                      <div className="text-right text-sm">
                        <div className="font-semibold tabular-nums">{fmtMoney(e.revenue, cur)}</div>
                        <div className="text-xs text-muted-foreground">
                          marge {settings ? fmtMoney(entryMargin(e, settings), cur) : "—"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                      <MoneyField
                        key={`${e.id}-${e.direct_cost}`}
                        label="Coûts directs"
                        value={e.direct_cost}
                        onSave={(v) => patch(e.id, { direct_cost: v })}
                      />
                      <PersonSelect
                        label="Apporteur"
                        value={e.apporteur_id}
                        members={members}
                        onChange={(v) => patch(e.id, { apporteur_id: v })}
                      />
                      <div className="flex items-end gap-2">
                        <Switch
                          checked={e.guided_internally}
                          onCheckedChange={(v) => patch(e.id, { guided_internally: v })}
                          id={`g-${e.id}`}
                        />
                        <Label htmlFor={`g-${e.id}`} className="pb-0.5 text-xs">
                          Guidé par un associé
                        </Label>
                      </div>
                      {e.guided_internally ? (
                        <PersonSelect
                          label="Guide"
                          value={e.guide_id}
                          members={members}
                          onChange={(v) => patch(e.id, { guide_id: v })}
                        />
                      ) : (
                        <div />
                      )}
                      <div className="flex items-end justify-between gap-2">
                        <div className="flex items-end gap-2">
                          <Switch
                            checked={e.vehicle_used}
                            onCheckedChange={(v) => patch(e.id, { vehicle_used: v })}
                            id={`v-${e.id}`}
                          />
                          <Label htmlFor={`v-${e.id}`} className="pb-0.5 text-xs">
                            Véhicule
                          </Label>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-xs"
                          onClick={() => patch(e.id, { cash_status: "a_recevoir" } as Partial<Row>)}
                          title="Remettre en « À venir »"
                        >
                          Annuler la réception
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )
      )}

      <ReceiveDialog
        row={receiving}
        currency={cur}
        onClose={() => setReceiving(null)}
        onSaved={refresh}
      />
      <AddEntryDialog
        open={adding}
        onOpenChange={setAdding}
        members={members}
        currency={cur}
        minDate={settings?.start_date ?? "2026-11-09"}
        onSaved={refresh}
      />
      {settings && isAdmin && (
        <SettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          settings={settings}
          onSaved={() => qc.invalidateQueries({ queryKey: ["partner-settings"] })}
        />
      )}
    </PageShell>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <p className="tracked text-[10px] text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl tabular-nums" style={{ fontFamily: "Fraunces, serif" }}>
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function PersonSelect({
  label,
  value,
  members,
  onChange,
}: {
  label: string;
  value: string | null;
  members: Member[];
  onChange: (v: string | null) => void;
}) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Select value={value ?? NONE} onValueChange={(v) => onChange(v === NONE ? null : v)}>
        <SelectTrigger className="mt-1 h-9">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>—</SelectItem>
          {members.map((m) => (
            <SelectItem key={m.user_id} value={m.user_id}>
              {m.display_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function parseAmount(v: string) {
  const n = Number(v.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function MoneyField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (v: number) => void;
}) {
  const [v, setV] = useState(String(value ?? 0));
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input
        className="mt-1 h-9"
        inputMode="decimal"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const n = parseAmount(v);
          if (!(n >= 0)) {
            setV(String(value));
            return toast.error("Montant invalide.");
          }
          if (n !== value) onSave(n);
        }}
      />
    </div>
  );
}

function ConfirmDelete({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);
  return armed ? (
    <div className="flex gap-1">
      <Button
        size="sm"
        variant="destructive"
        onClick={() => {
          setArmed(false);
          onConfirm();
        }}
      >
        Supprimer
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setArmed(false)}>
        Non
      </Button>
    </div>
  ) : (
    <Button
      size="icon"
      variant="ghost"
      onClick={() => setArmed(true)}
      aria-label="Supprimer la ligne"
    >
      <Trash2 className="h-4 w-4 text-muted-foreground" />
    </Button>
  );
}

function ReceiveDialog({
  row,
  currency,
  onClose,
  onSaved,
}: {
  row: Row | null;
  currency: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!row) return;
    const n = parseAmount(amount);
    if (!(n > 0)) return toast.error("Indique le montant réellement reçu sur le compte.");
    setSaving(true);
    const { error } = await db
      .from("partner_ledger_entries")
      .update({ cash_status: "recu", revenue: n, received_on: date })
      .eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Encaissement enregistré.");
    setAmount("");
    onClose();
    onSaved();
  };
  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Argent reçu</DialogTitle>
        </DialogHeader>
        {row && (
          <div className="grid gap-4">
            <p className="text-sm text-muted-foreground">
              {row.label}
              {row.expected_amount != null &&
                ` — attendu ${fmtMoney(row.expected_amount, row.expected_currency ?? "BRL")}`}
              . Saisis le montant exact arrivé sur le compte (après commission, change et frais).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Montant reçu ({currency})</Label>
                <Input
                  className="mt-1.5"
                  inputMode="decimal"
                  autoFocus
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div>
                <Label>Reçu le</Label>
                <Input
                  className="mt-1.5"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AddEntryDialog({
  open,
  onOpenChange,
  members,
  currency,
  minDate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  members: Member[];
  currency: string;
  minDate: string;
  onSaved: () => void;
}) {
  const empty = {
    label: "",
    date: today(),
    amount: "",
    cost: "",
    paid: true,
    guided: true,
    guide: NONE,
    apporteur: NONE,
    vehicle: false,
  };
  const [f, setF] = useState(empty);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const amount = parseAmount(f.amount);
    const cost = f.cost ? parseAmount(f.cost) : 0;
    if (!f.label.trim())
      return toast.error("Décris la vente (ex. « Rocinha — 4 pers., espèces »).");
    if (!(amount > 0))
      return toast.error(f.paid ? "Montant reçu invalide." : "Montant attendu invalide.");
    if (!(cost >= 0)) return toast.error("Coût invalide.");
    if (f.date < minDate) return toast.error(`Le registre commence le ${frDate(minDate)}.`);
    setSaving(true);
    const { error } = await db.from("partner_ledger_entries").insert({
      occurred_on: f.date,
      label: f.label.trim(),
      source_type: "manual",
      cash_status: f.paid ? "recu" : "a_recevoir",
      revenue: f.paid ? amount : 0,
      received_on: f.paid ? f.date : null,
      expected_amount: f.paid ? null : amount,
      expected_currency: f.paid ? null : currency,
      direct_cost: cost,
      guided_internally: f.guided,
      guide_id: f.guided && f.guide !== NONE ? f.guide : null,
      apporteur_id: f.apporteur !== NONE ? f.apporteur : null,
      vehicle_used: f.vehicle,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(f.paid ? "Vente encaissée ajoutée." : "Vente ajoutée en « À venir ».");
    setF(empty);
    onOpenChange(false);
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter une vente</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div>
            <Label>Vente</Label>
            <Input
              className="mt-1.5"
              placeholder="Rocinha — 4 pers. (espèces)"
              value={f.label}
              onChange={(e) => setF({ ...f, label: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2 rounded-md bg-muted/50 p-2.5">
            <Switch
              id="add-paid"
              checked={f.paid}
              onCheckedChange={(v) => setF({ ...f, paid: v })}
            />
            <Label htmlFor="add-paid" className="text-sm">
              {f.paid
                ? "Argent déjà reçu (espèces, Pix, virement arrivé)"
                : "Pas encore payé : va dans « À venir »"}
            </Label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date de la vente</Label>
              <Input
                className="mt-1.5"
                type="date"
                min={minDate}
                value={f.date}
                onChange={(e) => setF({ ...f, date: e.target.value })}
              />
            </div>
            <div>
              <Label>
                {f.paid ? "Reçu" : "Attendu"} ({currency})
              </Label>
              <Input
                className="mt-1.5"
                inputMode="decimal"
                value={f.amount}
                onChange={(e) => setF({ ...f, amount: e.target.value })}
              />
            </div>
            <div>
              <Label>Coûts directs</Label>
              <Input
                className="mt-1.5"
                inputMode="decimal"
                placeholder="0"
                value={f.cost}
                onChange={(e) => setF({ ...f, cost: e.target.value })}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="add-guided"
              checked={f.guided}
              onCheckedChange={(v) => setF({ ...f, guided: v })}
            />
            <Label htmlFor="add-guided">Tour guidé par un associé</Label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {f.guided && (
              <PersonSelect
                label="Guide"
                value={f.guide === NONE ? null : f.guide}
                members={members}
                onChange={(v) => setF({ ...f, guide: v ?? NONE })}
              />
            )}
            <PersonSelect
              label="Apporteur du client"
              value={f.apporteur === NONE ? null : f.apporteur}
              members={members}
              onChange={(v) => setF({ ...f, apporteur: v ?? NONE })}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="add-vehicle"
              checked={f.vehicle}
              onCheckedChange={(v) => setF({ ...f, vehicle: v })}
            />
            <Label htmlFor="add-vehicle">Fait avec le véhicule de Luan (forfait)</Label>
          </div>
        </div>
        <DialogFooter>
          <Button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? "Enregistrement…" : "Ajouter"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  settings: Settings;
  onSaved: () => void;
}) {
  const fields: { key: keyof Settings; label: string }[] = [
    { key: "pro_labore", label: "Pró-labore par associé" },
    { key: "tax_pct", label: "Impôts (% du reçu)" },
    { key: "guide_pct", label: "Prime guide (% de la marge)" },
    { key: "apporteur_pct", label: "Prime apporteur (% de la marge)" },
    { key: "reserve_pct", label: "Réserve (% du reste)" },
    { key: "vehicle_fee", label: "Forfait véhicule par tour" },
  ];
  const [v, setV] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, String(settings[f.key] ?? 0)])),
  );
  const [taxConfirmed, setTaxConfirmed] = useState(!!settings.tax_confirmed);
  const save = async () => {
    const values: Record<string, number> = {};
    for (const f of fields) {
      const n = parseAmount(String(v[f.key]));
      if (!(n >= 0)) return toast.error(`${f.label} : valeur invalide.`);
      values[f.key] = n;
    }
    const { error } = await db
      .from("partner_settings")
      .update({ ...values, tax_confirmed: taxConfirmed, updated_at: new Date().toISOString() })
      .eq("id", 1);
    if (error) return toast.error(error.message);
    toast.success("Paramètres enregistrés.");
    onOpenChange(false);
    onSaved();
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Paramètres du partage</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          {fields.map((f) => (
            <div key={f.key}>
              <Label className="text-xs">{f.label}</Label>
              <Input
                className="mt-1"
                inputMode="decimal"
                value={v[f.key]}
                onChange={(e) => setV({ ...v, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Switch id="tax-ok" checked={taxConfirmed} onCheckedChange={setTaxConfirmed} />
          <Label htmlFor="tax-ok" className="text-sm">
            Taux d'impôt confirmé par le contador
          </Label>
        </div>
        <p className="text-xs text-muted-foreground">
          Changer ces règles demande l'accord des trois associés (unanimité).
        </p>
        <DialogFooter>
          <Button className="btn-primary" onClick={save}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

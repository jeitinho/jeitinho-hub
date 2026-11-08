import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Trash2,
  Settings2,
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  original_amount: number | null;
  original_currency: string | null;
  notes: string | null;
};
type Settings = PartnerSettings & { currency: string; eur_brl: number };

function thisMonth() {
  return new Date().toLocaleDateString("fr-CA", { timeZone: "America/Sao_Paulo" }).slice(0, 7);
}
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
  const entriesQ = useQuery({
    queryKey: ["partner-ledger", month],
    queryFn: async () => {
      const { data, error } = await db
        .from("partner_ledger_entries")
        .select("*")
        .gte("occurred_on", from)
        .lte("occurred_on", to)
        .order("occurred_on", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map((r: Row) => ({
        ...r,
        revenue: Number(r.revenue),
        direct_cost: Number(r.direct_cost),
      })) as Row[];
    },
  });

  const members = membersQ.data ?? [];
  const settings = settingsQ.data;
  const entries = entriesQ.data ?? [];
  const cur = settings?.currency ?? "BRL";
  const split = useMemo(
    () => (settings ? computeMonthSplit(entries, members, settings) : null),
    [entries, members, settings],
  );
  const nameOf = (id: string | null) => members.find((m) => m.user_id === id)?.display_name ?? "—";
  const refresh = () => qc.invalidateQueries({ queryKey: ["partner-ledger", month] });

  const importMonth = async () => {
    const { data, error } = await db.rpc("partner_ledger_import_month", { p_month: from });
    if (error) return toast.error(error.message);
    toast.success(
      data
        ? `${data} vente(s) ajoutée(s) au registre.`
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

  const missing = entries.filter(
    (e) => (e.guided_internally && !e.guide_id) || !e.apporteur_id,
  ).length;

  return (
    <PageShell
      eyebrow="Association JEITINHO"
      title="Registre des parts"
      description="Chaque vente du mois, qui l'a guidée, qui a amené le client, et ce que touche chacun selon le modèle validé : pró-labore, primes, réserve, solde à parts égales."
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
      <div className="mb-6 flex items-center gap-2">
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

      {(membersQ.error || settingsQ.error || entriesQ.error) && (
        <Card className="mb-6 border-destructive/40 p-4 text-sm text-destructive">
          Chargement impossible :{" "}
          {String((membersQ.error || settingsQ.error || entriesQ.error)?.message)}
        </Card>
      )}

      {split && (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Encaissé"
              value={fmtMoney(split.revenue, cur)}
              hint={`${entries.length} vente(s)`}
            />
            <Stat
              label="Marge"
              value={fmtMoney(split.margin, cur)}
              hint={`après impôts (${settings?.tax_pct} %) et coûts`}
            />
            <Stat
              label="Réserve société"
              value={fmtMoney(split.reserve, cur)}
              hint={`${settings?.reserve_pct} % du reste`}
            />
            <Stat
              label="Solde partagé"
              value={fmtMoney(split.balance, cur)}
              hint={members.length ? `${fmtMoney(split.balance / members.length, cur)} chacun` : ""}
            />
          </div>

          {(split.warnings.length > 0 || missing > 0) && (
            <Card className="mb-6 border-amber-500/40 bg-amber-500/5 p-4 text-sm">
              <div className="flex gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <ul className="space-y-1">
                  {missing > 0 && (
                    <li>
                      {missing} vente(s) sans guide ou sans apporteur : complète-les pour que les
                      primes soient justes.
                    </li>
                  )}
                  {split.warnings.map((w) => (
                    <li key={w}>
                      {w}
                      {w.includes("réserve") ? ` Manque : ${fmtMoney(split.shortfall, cur)}.` : ""}
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
        </>
      )}

      <h2 className="mb-3 text-xl" style={{ fontFamily: "Fraunces, serif" }}>
        Ventes du mois
      </h2>
      {entries.length === 0 && !entriesQ.isLoading ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Aucune vente pour ce mois. « Importer les ventes » reprend les réservations GetYourGuide
          et les paiements clients ; « Ajouter une vente » sert pour le reste (tour payé en espèces,
          prestation…).
        </Card>
      ) : (
        <div className="space-y-2">
          {entries.map((e) => (
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
                    {e.occurred_on.split("-").reverse().join("/")}
                    {e.original_currency &&
                      e.original_currency !== cur &&
                      e.original_amount != null &&
                      ` · ${fmtMoney(e.original_amount, e.original_currency)} converti`}
                    {e.notes ? ` · ${e.notes}` : ""}
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
                  <ConfirmDelete onConfirm={() => remove(e.id)} />
                </div>
              </div>
              {e.guided_internally && !e.guide_id && (
                <p className="mt-2 text-xs text-amber-700">Indique qui a guidé ce tour.</p>
              )}
              {!e.apporteur_id && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Sans apporteur, la prime de 10 % reste dans le solde partagé.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      <AddEntryDialog
        open={adding}
        onOpenChange={setAdding}
        members={members}
        currency={cur}
        defaultDate={
          month === thisMonth()
            ? new Date().toLocaleDateString("fr-CA", { timeZone: "America/Sao_Paulo" })
            : from
        }
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
          const num = Number(v.replace(",", "."));
          if (!Number.isFinite(num) || num < 0) {
            setV(String(value));
            return toast.error("Montant invalide.");
          }
          if (num !== value) onSave(num);
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

function AddEntryDialog({
  open,
  onOpenChange,
  members,
  currency,
  defaultDate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  members: Member[];
  currency: string;
  defaultDate: string;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    label: "",
    date: "",
    revenue: "",
    cost: "",
    guided: true,
    guide: NONE,
    apporteur: NONE,
    vehicle: false,
  });
  const [saving, setSaving] = useState(false);
  const date = f.date || defaultDate;
  const save = async () => {
    const revenue = Number(f.revenue.replace(",", "."));
    const cost = Number((f.cost || "0").replace(",", "."));
    if (!f.label.trim()) return toast.error("Décris la vente (ex. « Rocinha — 4 pers. »).");
    if (!Number.isFinite(revenue) || revenue <= 0) return toast.error("Montant encaissé invalide.");
    if (!Number.isFinite(cost) || cost < 0) return toast.error("Coût invalide.");
    setSaving(true);
    const { error } = await db.from("partner_ledger_entries").insert({
      occurred_on: date,
      label: f.label.trim(),
      revenue,
      direct_cost: cost,
      guided_internally: f.guided,
      guide_id: f.guided && f.guide !== NONE ? f.guide : null,
      apporteur_id: f.apporteur !== NONE ? f.apporteur : null,
      vehicle_used: f.vehicle,
      source_type: "manual",
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Vente ajoutée.");
    setF({
      label: "",
      date: "",
      revenue: "",
      cost: "",
      guided: true,
      guide: NONE,
      apporteur: NONE,
      vehicle: false,
    });
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                className="mt-1.5"
                type="date"
                value={date}
                onChange={(e) => setF({ ...f, date: e.target.value })}
              />
            </div>
            <div>
              <Label>Encaissé ({currency})</Label>
              <Input
                className="mt-1.5"
                inputMode="decimal"
                value={f.revenue}
                onChange={(e) => setF({ ...f, revenue: e.target.value })}
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
    { key: "tax_pct", label: "Impôts (% du CA)" },
    { key: "guide_pct", label: "Prime guide (% de la marge)" },
    { key: "apporteur_pct", label: "Prime apporteur (% de la marge)" },
    { key: "reserve_pct", label: "Réserve (% du reste)" },
    { key: "vehicle_fee", label: "Forfait véhicule par tour" },
    { key: "eur_brl", label: "Taux EUR → BRL" },
  ];
  const [v, setV] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.key, String(settings[f.key])])),
  );
  const save = async () => {
    const values: Record<string, number> = {};
    for (const f of fields) {
      const num = Number(String(v[f.key]).replace(",", "."));
      if (!Number.isFinite(num) || num < 0) return toast.error(`${f.label} : valeur invalide.`);
      values[f.key] = num;
    }
    const { error } = await db
      .from("partner_settings")
      .update({ ...values, updated_at: new Date().toISOString() })
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

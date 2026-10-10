import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Copy } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  copyText,
  fmtDateTime,
  fmtMoney,
  saveSalesChannel,
  type SalesChannel,
} from "@/lib/ops/ops";
import {
  fetchManuelSales,
  parseCommissionPercent,
  setSaleCommissionPaid,
  unpaidCommission,
} from "@/lib/ops/finances";

// Stripe : amount_total et commission_amount sont en centimes.
const eur = (v: number | null | undefined) => Number(v ?? 0) / 100;

export const Route = createFileRoute("/_authenticated/manuel")({
  component: ManuelPage,
  head: () => ({ meta: [{ title: "Manuel — JEITINHO" }] }),
});

const MANUEL_URL = "https://jeitinho.fr/manuel";

function ManuelPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["ops", "manuel"],
    queryFn: fetchManuelSales,
  });
  const sales = useMemo(() => data?.sales ?? [], [data]);
  const channels = useMemo(() => data?.channels ?? [], [data]);
  const channelName = useMemo(() => new Map(channels.map((c) => [c.id, c.name])), [channels]);

  const paid = sales.filter((s) => Number(s.amount_total ?? 0) > 0);
  const weekAgo = Date.now() - 7 * 86_400_000;
  const revenue = paid.reduce((sum, s) => sum + eur(s.amount_total), 0);
  const last7 = paid.filter((s) => new Date(s.created_at).getTime() >= weekAgo);
  const commissions = unpaidCommission(sales);
  const currency = (sales[0]?.currency ?? "eur").toUpperCase();

  const byChannel = useMemo(() => {
    const map = new Map<
      string,
      { count: number; revenue: number; commission: number; due: number }
    >();
    for (const s of sales) {
      const k = s.channel_id ?? "direct";
      const cur = map.get(k) ?? { count: 0, revenue: 0, commission: 0, due: 0 };
      cur.count += 1;
      cur.revenue += eur(s.amount_total);
      cur.commission += eur(s.commission_amount);
      if (!s.commission_paid_at) cur.due += eur(s.commission_amount);
      map.set(k, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].revenue - a[1].revenue);
  }, [sales]);

  const [nc, setNc] = useState({ name: "", slug: "", commission_rate: "" });
  const save = async (row: Partial<SalesChannel> & { name: string }) => {
    try {
      await saveSalesChannel(row);
      toast.success("Canal enregistré");
      qc.invalidateQueries({ queryKey: ["ops", "manuel"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const togglePaid = async (id: string, paid: boolean) => {
    try {
      await setSaleCommissionPaid(id, paid);
      toast.success(paid ? "Commission marquée versée" : "Commission à nouveau due");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["ops", "manuel"] }),
        qc.invalidateQueries({ queryKey: ["finances"] }),
      ]);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <PageShell
      eyebrow="Commercial"
      title="Manuel JEITINHO"
      description="Ventes du guide numérique (30 €), canaux de vente trackés ?ref= et commissions."
    >
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <Card className="border-destructive/40 p-6 text-sm">{(error as Error).message}</Card>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Kpi label="Ventes payantes" value={String(paid.length)} />
        <Kpi label="7 derniers jours" value={String(last7.length)} />
        <Kpi label="Chiffre d'affaires" value={fmtMoney(revenue, currency)} />
        <Kpi label="Commissions dues" value={fmtMoney(commissions, currency)} />
      </div>

      <Card className="mb-6 p-5">
        <h2 className="mb-3 text-base font-semibold">Par canal</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Canal</TableHead>
              <TableHead>Ventes</TableHead>
              <TableHead>CA</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Reste dû</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byChannel.map(([id, v]) => (
              <TableRow key={id}>
                <TableCell className="font-medium">{channelName.get(id) ?? "Direct"}</TableCell>
                <TableCell>{v.count}</TableCell>
                <TableCell>{fmtMoney(v.revenue, currency)}</TableCell>
                <TableCell>{fmtMoney(v.commission, currency)}</TableCell>
                <TableCell>{fmtMoney(v.due, currency)}</TableCell>
              </TableRow>
            ))}
            {byChannel.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-sm text-muted-foreground">
                  Aucune vente.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Card className="mb-6 p-5">
        <h2 className="mb-1 text-base font-semibold">Canaux de vente</h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Chaque canal a son lien {MANUEL_URL}?ref=slug. La commission (en %, ex. 10 pour 10 %)
          s'applique automatiquement au paiement.
        </p>
        <div className="mb-4 grid gap-2 sm:grid-cols-4">
          <Input
            placeholder="Nom (ex. Hostel Lapa)"
            value={nc.name}
            onChange={(e) => setNc({ ...nc, name: e.target.value })}
          />
          <Input
            placeholder="slug (ex. hostel-lapa)"
            value={nc.slug}
            onChange={(e) => setNc({ ...nc, slug: e.target.value })}
          />
          <div className="relative">
            <Input
              type="number"
              step="0.5"
              min={0}
              max={100}
              inputMode="decimal"
              className="pr-8"
              placeholder="Commission (ex. 10)"
              value={nc.commission_rate}
              onChange={(e) => setNc({ ...nc, commission_rate: e.target.value })}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              %
            </span>
          </div>
          <Button
            onClick={() => {
              if (!nc.name || !nc.slug) return toast.error("Nom et slug obligatoires");
              const rate = parseCommissionPercent(nc.commission_rate);
              if (rate == null) return toast.error("Commission : un pourcentage entre 0 et 100");
              void save({
                name: nc.name,
                slug: nc.slug,
                commission_rate: rate,
                active: true,
              });
              setNc({ name: "", slug: "", commission_rate: "" });
            }}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Ajouter
          </Button>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Lien</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Actif</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {channels.map((c) => {
              const link = c.slug ? `${MANUEL_URL}?ref=${c.slug}` : "";
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    {link && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyText(link).then(() => toast.success("Lien copié"))}
                      >
                        <Copy className="mr-1.5 h-3.5 w-3.5" />
                        ?ref={c.slug}
                      </Button>
                    )}
                  </TableCell>
                  <TableCell>
                    {(Math.round(Number(c.commission_rate) * 1000) / 10).toLocaleString("fr-FR")} %
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={c.active}
                      onCheckedChange={(v) => void save({ ...c, active: v })}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-5">
        <h2 className="mb-3 text-base font-semibold">Dernières ventes</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Montant</TableHead>
              <TableHead>Commission</TableHead>
              <TableHead>Commission versée</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sales.slice(0, 50).map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-xs">{fmtDateTime(s.created_at)}</TableCell>
                <TableCell>{s.customer_email ?? "—"}</TableCell>
                <TableCell>
                  {s.channel_id ? (channelName.get(s.channel_id) ?? "—") : "Direct"}
                </TableCell>
                <TableCell>
                  {fmtMoney(eur(s.amount_total), (s.currency ?? currency).toUpperCase())}
                </TableCell>
                <TableCell>
                  {Number(s.commission_amount ?? 0) > 0
                    ? fmtMoney(eur(s.commission_amount), (s.currency ?? currency).toUpperCase())
                    : "—"}
                </TableCell>
                <TableCell>
                  {Number(s.commission_amount ?? 0) > 0 ? (
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={!!s.commission_paid_at}
                        aria-label="Commission versée"
                        onCheckedChange={(v) => void togglePaid(s.id, v)}
                      />
                      {s.commission_paid_at && (
                        <span className="text-xs text-muted-foreground">
                          {fmtDateTime(s.commission_paid_at)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </PageShell>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </Card>
  );
}

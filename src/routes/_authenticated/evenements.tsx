import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, CalendarDays, Plus, Ticket, Users, Wallet } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TICKET_CHANNELS,
  addTicketCount,
  computeSplit,
  daysUntil,
  fetchEventDetail,
  fetchEvents,
  fmtDateTime,
  fmtMoney,
  latestByChannel,
  saveEvent,
  saveSettlement,
  upsertPartnerSale,
  type EventRow,
  type PartnerSale,
  type Settlement,
  type TicketCount,
} from "@/lib/ops/ops";

const searchSchema = z.object({ id: z.string().uuid().optional() });
export const Route = createFileRoute("/_authenticated/evenements")({
  validateSearch: searchSchema,
  component: EventsPage,
  head: () => ({ meta: [{ title: "Événements — JEITINHO" }] }),
});

const STATUS_LABEL: Record<EventRow["status"], string> = {
  planifie: "Planifié",
  en_vente: "En vente",
  termine: "Terminé",
  annule: "Annulé",
};

function EventsPage() {
  const { id } = Route.useSearch();
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({ queryKey: ["ops", "events"], queryFn: fetchEvents });
  const [creating, setCreating] = useState(false);
  const event = id ? data.find((e) => e.id === id) : undefined;
  if (id && event) return <EventDetail event={event} />;

  return (
    <PageShell
      eyebrow="Événementiel"
      title="Événements"
      description="Billetterie, relais et commissions, caisse et partage de chaque soirée."
      actions={
        <Button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel événement
        </Button>
      }
    >
      {creating && <EventForm onDone={() => setCreating(false)} />}
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <Card className="border-destructive/40 p-6 text-sm">{(error as Error).message}</Card>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {data.map((e) => (
          <Link key={e.id} to="/evenements" search={{ id: e.id }}>
            <Card className="p-5 transition-colors hover:bg-muted/30">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="secondary">{STATUS_LABEL[e.status]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {daysUntil(e.starts_at) >= 0 ? `J-${daysUntil(e.starts_at)}` : "passé"}
                </span>
              </div>
              <h3 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>
                {e.name}
              </h3>
              <p className="text-sm text-muted-foreground">{e.edition}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                <CalendarDays className="mr-1 inline h-3.5 w-3.5" />
                {fmtDateTime(e.starts_at)} · {e.venue} {e.neighborhood ? `(${e.neighborhood})` : ""}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

function EventForm({ event, onDone }: { event?: EventRow; onDone: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: event?.name ?? "",
    edition: event?.edition ?? "",
    starts_at: event ? toLocalInput(event.starts_at) : "",
    venue: event?.venue ?? "",
    neighborhood: event?.neighborhood ?? "",
    capacity: String(event?.capacity ?? ""),
    presale_target: String(event?.presale_target ?? ""),
    door_price: String(event?.door_price ?? ""),
    status: event?.status ?? "planifie",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });
  const submit = async () => {
    try {
      if (!f.name || !f.starts_at) throw new Error("Nom et date obligatoires");
      await saveEvent({
        id: event?.id,
        name: f.name,
        edition: f.edition || null,
        starts_at: new Date(f.starts_at).toISOString(),
        venue: f.venue || null,
        neighborhood: f.neighborhood || null,
        capacity: f.capacity ? Number(f.capacity) : null,
        presale_target: f.presale_target ? Number(f.presale_target) : null,
        door_price: f.door_price ? Number(f.door_price) : null,
        status: f.status as EventRow["status"],
      });
      toast.success("Événement enregistré");
      qc.invalidateQueries({ queryKey: ["ops", "events"] });
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Card className="mb-5 grid gap-3 p-4 sm:grid-cols-3">
      <Field label="Nom">
        <Input value={f.name} onChange={set("name")} />
      </Field>
      <Field label="Édition">
        <Input value={f.edition} onChange={set("edition")} />
      </Field>
      <Field label="Début (heure de Rio)">
        <Input type="datetime-local" value={f.starts_at} onChange={set("starts_at")} />
      </Field>
      <Field label="Lieu">
        <Input value={f.venue} onChange={set("venue")} />
      </Field>
      <Field label="Quartier">
        <Input value={f.neighborhood} onChange={set("neighborhood")} />
      </Field>
      <Field label="Capacité">
        <Input type="number" value={f.capacity} onChange={set("capacity")} />
      </Field>
      <Field label="Objectif prévente">
        <Input type="number" value={f.presale_target} onChange={set("presale_target")} />
      </Field>
      <Field label="Prix porte (R$)">
        <Input type="number" value={f.door_price} onChange={set("door_price")} />
      </Field>
      <Field label="Statut">
        <Select
          value={f.status}
          onValueChange={(v) => setF({ ...f, status: v as EventRow["status"] })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <div className="flex gap-2 sm:col-span-3">
        <Button onClick={submit}>Enregistrer</Button>
        <Button variant="ghost" onClick={onDone}>
          Annuler
        </Button>
      </div>
    </Card>
  );
}

function EventDetail({ event }: { event: EventRow }) {
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["ops", "event", event.id],
    queryFn: () => fetchEventDetail(event.id),
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["ops", "event", event.id] });
  const latest = useMemo(() => latestByChannel(data?.counts ?? []), [data]);
  const totalTickets = Array.from(latest.values()).reduce((s, c) => s + c.tickets, 0);
  const totalVip = Array.from(latest.values()).reduce((s, c) => s + c.vip_tables, 0);
  const presale = Array.from(latest.values())
    .filter((c) => c.channel !== "porte")
    .reduce((s, c) => s + c.tickets, 0);
  const j = daysUntil(event.starts_at);

  return (
    <PageShell
      eyebrow="Événementiel"
      title={event.name}
      description={`${event.edition ?? ""} · ${fmtDateTime(event.starts_at)} · ${event.venue ?? ""}`}
      actions={
        <>
          <Link to="/evenements">
            <Button variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour
            </Button>
          </Link>
          <Button variant="outline" onClick={() => setEditing((v) => !v)}>
            Modifier
          </Button>
        </>
      }
    >
      {editing && (
        <EventForm
          event={event}
          onDone={() => {
            setEditing(false);
            qc.invalidateQueries({ queryKey: ["ops", "events"] });
          }}
        />
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Kpi label="Compte à rebours" value={j >= 0 ? `J-${j}` : "Passé"} />
        <Kpi
          label="Billets vendus"
          value={`${totalTickets}${event.capacity ? ` / ${event.capacity}` : ""}`}
        />
        <Kpi
          label="Prévente vs objectif"
          value={`${presale}${event.presale_target ? ` / ${event.presale_target}` : ""}`}
        />
        <Kpi label="Tables VIP" value={String(totalVip)} />
      </div>
      {isLoading || !data ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="space-y-6">
          <TicketsSection event={event} counts={data.counts} latest={latest} onSaved={refresh} />
          <PartnersSection event={event} partners={data.partners} onSaved={refresh} />
          <SettlementSection
            event={event}
            settlement={data.settlement}
            partners={data.partners}
            onSaved={refresh}
          />
        </div>
      )}
    </PageShell>
  );
}

function TicketsSection({
  event,
  counts,
  latest,
  onSaved,
}: {
  event: EventRow;
  counts: TicketCount[];
  latest: Map<string, TicketCount>;
  onSaved: () => void;
}) {
  const [f, setF] = useState({
    channel: "sympla",
    tickets: "",
    revenue: "",
    vip_tables: "",
    vip_revenue: "",
    note: "",
  });
  const submit = async () => {
    try {
      if (f.tickets === "") throw new Error("Indique le total cumulé de billets");
      await addTicketCount({
        event_id: event.id,
        channel: f.channel as TicketCount["channel"],
        tickets: Number(f.tickets),
        revenue: f.revenue ? Number(f.revenue) : null,
        vip_tables: f.vip_tables ? Number(f.vip_tables) : 0,
        vip_revenue: f.vip_revenue ? Number(f.vip_revenue) : null,
        note: f.note || null,
      });
      toast.success("Relevé enregistré");
      setF({ ...f, tickets: "", revenue: "", vip_tables: "", vip_revenue: "", note: "" });
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  return (
    <Card className="p-5">
      <SectionTitle
        icon={Ticket}
        title="Billetterie"
        hint="Saisis le total CUMULÉ affiché par Sympla ou Shotgun. Le dernier relevé de chaque canal fait foi."
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-6">
        <Select value={f.channel} onValueChange={(v) => setF({ ...f, channel: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TICKET_CHANNELS.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="number"
          placeholder="Billets (cumul)"
          value={f.tickets}
          onChange={(e) => setF({ ...f, tickets: e.target.value })}
        />
        <Input
          type="number"
          placeholder="CA billets R$"
          value={f.revenue}
          onChange={(e) => setF({ ...f, revenue: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Tables VIP"
          value={f.vip_tables}
          onChange={(e) => setF({ ...f, vip_tables: e.target.value })}
        />
        <Input
          type="number"
          placeholder="CA VIP R$"
          value={f.vip_revenue}
          onChange={(e) => setF({ ...f, vip_revenue: e.target.value })}
        />
        <Button onClick={submit}>
          <Plus className="mr-1.5 h-4 w-4" />
          Relevé
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Canal</TableHead>
            <TableHead>Billets</TableHead>
            <TableHead>CA billets</TableHead>
            <TableHead>Tables VIP</TableHead>
            <TableHead>Relevé</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from(latest.values()).map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-medium">{c.channel}</TableCell>
              <TableCell>{c.tickets}</TableCell>
              <TableCell>{fmtMoney(c.revenue, event.currency)}</TableCell>
              <TableCell>{c.vip_tables}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {fmtDateTime(c.recorded_at)}
              </TableCell>
            </TableRow>
          ))}
          {latest.size === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">
                Aucun relevé pour l'instant.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {counts.length > latest.size && (
        <p className="mt-2 text-xs text-muted-foreground">
          {counts.length} relevés au total (historique conservé).
        </p>
      )}
    </Card>
  );
}

function PartnersSection({
  event,
  partners,
  onSaved,
}: {
  event: EventRow;
  partners: PartnerSale[];
  onSaved: () => void;
}) {
  const [f, setF] = useState({ partner_name: "", tickets: "", vip_revenue: "" });
  const commission = (p: PartnerSale) =>
    p.tickets * Number(event.partner_ticket_commission) +
    (p.vip_revenue * Number(event.partner_vip_commission_pct)) / 100;
  const save = async (row: Omit<PartnerSale, "id">) => {
    try {
      await upsertPartnerSale(row);
      toast.success("Relais mis à jour");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const total = partners.reduce((s, p) => s + commission(p), 0);
  return (
    <Card className="p-5">
      <SectionTitle
        icon={Users}
        title="Relais et commissions"
        hint={`${fmtMoney(event.partner_ticket_commission, event.currency)} par billet + ${event.partner_vip_commission_pct} % des tables VIP. Total dû : ${fmtMoney(total, event.currency)}.`}
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <Input
          placeholder="Nom du relais"
          value={f.partner_name}
          onChange={(e) => setF({ ...f, partner_name: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Billets vendus"
          value={f.tickets}
          onChange={(e) => setF({ ...f, tickets: e.target.value })}
        />
        <Input
          type="number"
          placeholder="CA tables VIP R$"
          value={f.vip_revenue}
          onChange={(e) => setF({ ...f, vip_revenue: e.target.value })}
        />
        <Button
          onClick={() => {
            if (!f.partner_name) return toast.error("Nom du relais obligatoire");
            void save({
              event_id: event.id,
              partner_id: null,
              partner_name: f.partner_name,
              tickets: Number(f.tickets || 0),
              vip_revenue: Number(f.vip_revenue || 0),
              paid: false,
              note: null,
            });
            setF({ partner_name: "", tickets: "", vip_revenue: "" });
          }}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Ajouter / mettre à jour
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Relais</TableHead>
            <TableHead>Billets</TableHead>
            <TableHead>CA VIP</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Payé</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {partners.map((p) => (
            <TableRow key={p.id}>
              <TableCell className="font-medium">{p.partner_name}</TableCell>
              <TableCell>{p.tickets}</TableCell>
              <TableCell>{fmtMoney(p.vip_revenue, event.currency)}</TableCell>
              <TableCell>{fmtMoney(commission(p), event.currency)}</TableCell>
              <TableCell>
                <Switch checked={p.paid} onCheckedChange={(v) => void save({ ...p, paid: v })} />
              </TableCell>
            </TableRow>
          ))}
          {partners.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">
                Aucun relais enregistré.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function SettlementSection({
  event,
  settlement,
  partners,
  onSaved,
}: {
  event: EventRow;
  settlement: Settlement | null;
  partners: PartnerSale[];
  onSaved: () => void;
}) {
  const empty: Settlement = {
    event_id: event.id,
    ticket_revenue: 0,
    vip_revenue: 0,
    bar_revenue: 0,
    drinks_cost: 0,
    house_costs: 0,
    other_costs: 0,
    notes: null,
  };
  const [s, setS] = useState<Settlement>(settlement ?? empty);
  useEffect(() => setS(settlement ?? empty), [settlement]); // eslint-disable-line react-hooks/exhaustive-deps
  const split = computeSplit(event, s, partners);
  const num = (k: keyof Settlement) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS({ ...s, [k]: Number(e.target.value || 0) });
  const c = event.currency;
  return (
    <Card className="p-5">
      <SectionTitle
        icon={Wallet}
        title="Caisse et partage"
        hint={`Lieu ${event.venue_share_pct} % / équipe ${100 - Number(event.venue_share_pct)} %, puis Rafael ${event.cofounder_share_pct} % / Tareq ${100 - Number(event.cofounder_share_pct)} % de la part équipe.`}
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Entrées (R$)">
          <Input type="number" value={s.ticket_revenue} onChange={num("ticket_revenue")} />
        </Field>
        <Field label="Tables VIP (R$)">
          <Input type="number" value={s.vip_revenue} onChange={num("vip_revenue")} />
        </Field>
        <Field label="Bar — ventes (R$)">
          <Input type="number" value={s.bar_revenue} onChange={num("bar_revenue")} />
        </Field>
        <Field label="Bar — coût des boissons (R$)">
          <Input type="number" value={s.drinks_cost} onChange={num("drinks_cost")} />
        </Field>
        <Field label="Custos da casa (R$)">
          <Input type="number" value={s.house_costs} onChange={num("house_costs")} />
        </Field>
        <Field label="Autres frais (R$)">
          <Input type="number" value={s.other_costs} onChange={num("other_costs")} />
        </Field>
      </div>
      <Button
        className="mt-3"
        onClick={async () => {
          try {
            await saveSettlement(s);
            toast.success("Caisse enregistrée");
            onSaved();
          } catch (e) {
            toast.error((e as Error).message);
          }
        }}
      >
        Enregistrer la caisse
      </Button>
      <Table className="mt-4">
        <TableBody>
          <Line label="Marge bar" value={fmtMoney(split.barMargin, c)} />
          <Line label="Recettes (entrées + VIP + marge bar)" value={fmtMoney(split.gross, c)} />
          <Line label="Commissions relais" value={`− ${fmtMoney(split.commissions, c)}`} />
          <Line label="Bénéfice à partager" value={fmtMoney(split.profit, c)} strong />
          <Line
            label={`Part du lieu (${event.venue ?? "lieu"})`}
            value={fmtMoney(split.venue, c)}
          />
          <Line label="Part Rafael" value={fmtMoney(split.rafael, c)} strong />
          <Line label="Part Tareq" value={fmtMoney(split.tareq, c)} strong />
        </TableBody>
      </Table>
    </Card>
  );
}

function SectionTitle({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-4">
      <h2 className="flex items-center gap-2 text-base font-semibold">
        <Icon className="h-4 w-4 text-primary" />
        {title}
      </h2>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <TableRow>
      <TableCell className={strong ? "font-semibold" : ""}>{label}</TableCell>
      <TableCell className={`text-right ${strong ? "font-semibold" : ""}`}>{value}</TableCell>
    </TableRow>
  );
}

function toLocalInput(iso: string) {
  const d = new Date(new Date(iso).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

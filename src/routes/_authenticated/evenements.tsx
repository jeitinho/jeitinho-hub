import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  Layers,
  Pencil,
  Plus,
  Tag,
  Ticket,
  Trash2,
  Users,
  Wallet,
} from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  type EventRow,
  type PartnerSale,
  type Settlement,
  type TicketCount,
} from "@/lib/ops/ops";
import {
  PROMO_PLATFORMS,
  deletePartnerSale,
  deletePromoCode,
  deleteTicketCount,
  deleteTicketLot,
  fetchEventPartners,
  fetchPromoCodes,
  fetchTicketLots,
  savePartnerSale,
  savePromoCode,
  saveTicketLot,
  setPartnerSalePaid,
} from "@/lib/ops/event-extras";
import { fromRioInput, toRioInput } from "@/lib/rio-time";

const searchSchema = z.object({ id: z.string().uuid().optional() });
export const Route = createFileRoute("/_authenticated/evenements")({
  validateSearch: searchSchema,
  component: EventsPage,
  head: () => ({ meta: [{ title: "Événements — JEITINHO" }] }),
});

const CHANNEL_LABEL: Record<string, string> = {
  sympla: "Sympla",
  shotgun: "Shotgun",
  porte: "Porte",
  invitation: "Invitations",
  autre: "Autre",
};

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
    starts_at: toRioInput(event?.starts_at),
    ends_at: toRioInput(event?.ends_at),
    venue: event?.venue ?? "",
    neighborhood: event?.neighborhood ?? "",
    capacity: String(event?.capacity ?? ""),
    presale_target: String(event?.presale_target ?? ""),
    door_price: String(event?.door_price ?? ""),
    currency: event?.currency ?? "BRL",
    partner_ticket_commission: String(event?.partner_ticket_commission ?? 5),
    partner_vip_commission_pct: String(event?.partner_vip_commission_pct ?? 10),
    venue_share_pct: String(event?.venue_share_pct ?? 50),
    cofounder_share_pct: String(event?.cofounder_share_pct ?? 50),
    notes: event?.notes ?? "",
    status: event?.status ?? "planifie",
  });
  const set =
    (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setF({ ...f, [k]: e.target.value });
  const pct = (label: string, v: string) => {
    const n = Number(v.replace(",", "."));
    if (!Number.isFinite(n) || n < 0 || n > 100) throw new Error(`${label} : entre 0 et 100 %`);
    return n;
  };
  const submit = async () => {
    try {
      if (!f.name || !f.starts_at) throw new Error("Nom et date obligatoires");
      const startsAt = fromRioInput(f.starts_at);
      const endsAt = fromRioInput(f.ends_at);
      if (!startsAt) throw new Error("Date de début invalide");
      if (endsAt && endsAt <= startsAt) throw new Error("La fin doit être après le début");
      await saveEvent({
        id: event?.id,
        name: f.name,
        edition: f.edition || null,
        starts_at: startsAt,
        ends_at: endsAt,
        venue: f.venue || null,
        neighborhood: f.neighborhood || null,
        capacity: f.capacity ? Number(f.capacity) : null,
        presale_target: f.presale_target ? Number(f.presale_target) : null,
        door_price: f.door_price ? Number(f.door_price) : null,
        currency: f.currency,
        partner_ticket_commission: Number(f.partner_ticket_commission.replace(",", ".")) || 0,
        partner_vip_commission_pct: pct("Commission VIP", f.partner_vip_commission_pct),
        venue_share_pct: pct("Part du lieu", f.venue_share_pct),
        cofounder_share_pct: pct("Part de Rafael", f.cofounder_share_pct),
        notes: f.notes.trim() || null,
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
      <Field label="Début (heure de Rio)">
        <Input type="datetime-local" value={f.starts_at} onChange={set("starts_at")} />
      </Field>
      <Field label="Fin (heure de Rio)">
        <Input type="datetime-local" value={f.ends_at} onChange={set("ends_at")} />
      </Field>
      <Field label="Devise">
        <Select value={f.currency} onValueChange={(v) => setF({ ...f, currency: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="BRL">BRL (R$)</SelectItem>
            <SelectItem value="EUR">EUR (€)</SelectItem>
          </SelectContent>
        </Select>
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
      <Field label={`Prix porte (${f.currency})`}>
        <Input type="number" value={f.door_price} onChange={set("door_price")} />
      </Field>
      <Field label={`Commission relais par billet (${f.currency})`}>
        <Input
          type="number"
          step="0.5"
          min={0}
          value={f.partner_ticket_commission}
          onChange={set("partner_ticket_commission")}
        />
      </Field>
      <Field label="Commission relais sur tables VIP (%)">
        <Input
          type="number"
          min={0}
          max={100}
          value={f.partner_vip_commission_pct}
          onChange={set("partner_vip_commission_pct")}
        />
      </Field>
      <Field label="Part du lieu sur le bénéfice (%)">
        <Input
          type="number"
          min={0}
          max={100}
          value={f.venue_share_pct}
          onChange={set("venue_share_pct")}
        />
      </Field>
      <Field label="Part de Rafael dans la part équipe (%)">
        <Input
          type="number"
          min={0}
          max={100}
          value={f.cofounder_share_pct}
          onChange={set("cofounder_share_pct")}
        />
      </Field>
      <div className="sm:col-span-3">
        <Field label="Notes">
          <Textarea className="min-h-16" value={f.notes} onChange={set("notes")} />
        </Field>
      </div>
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
  // Billets vendus : hors invitations (comme le cockpit) ; prévente : hors porte et invitations.
  const totalTickets = Array.from(latest.values())
    .filter((c) => c.channel !== "invitation")
    .reduce((s, c) => s + c.tickets, 0);
  const invitations = latest.get("invitation")?.tickets ?? 0;
  const totalVip = Array.from(latest.values()).reduce((s, c) => s + c.vip_tables, 0);
  const presale = Array.from(latest.values())
    .filter((c) => c.channel !== "porte" && c.channel !== "invitation")
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
      {event.notes && (
        <Card className="mb-4 whitespace-pre-wrap p-4 text-sm text-muted-foreground">
          {event.notes}
        </Card>
      )}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <Kpi label="Compte à rebours" value={j >= 0 ? `J-${j}` : "Passé"} />
        <Kpi
          label={invitations ? `Billets vendus (+ ${invitations} invitations)` : "Billets vendus"}
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
          <TicketLotsSection event={event} />
          <PartnersSection event={event} partners={data.partners} onSaved={refresh} />
          <PromoCodesSection event={event} />
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
  const [showHistory, setShowHistory] = useState(false);
  const removeCount = async (c: TicketCount) => {
    if (
      !confirm(
        `Supprimer le relevé ${CHANNEL_LABEL[c.channel] ?? c.channel} du ${fmtDateTime(c.recorded_at)} (${c.tickets} billets) ?`,
      )
    )
      return;
    try {
      await deleteTicketCount(c.id);
      toast.success("Relevé supprimé");
      onSaved();
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
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
                {CHANNEL_LABEL[c] ?? c}
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
          placeholder={`CA billets ${event.currency}`}
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
          placeholder={`CA VIP ${event.currency}`}
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
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {(showHistory ? counts : Array.from(latest.values())).map((c) => (
            <TableRow key={c.id} className={latest.get(c.channel)?.id === c.id ? "" : "opacity-60"}>
              <TableCell className="font-medium">{CHANNEL_LABEL[c.channel] ?? c.channel}</TableCell>
              <TableCell>{c.tickets}</TableCell>
              <TableCell>{fmtMoney(c.revenue, event.currency)}</TableCell>
              <TableCell>{c.vip_tables}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {fmtDateTime(c.recorded_at)}
              </TableCell>
              <TableCell>
                <DeleteIcon label="Supprimer ce relevé" onClick={() => void removeCount(c)} />
              </TableCell>
            </TableRow>
          ))}
          {latest.size === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-sm text-muted-foreground">
                Aucun relevé pour l'instant.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {counts.length > latest.size && (
        <button
          type="button"
          className="mt-2 text-xs text-muted-foreground underline-offset-2 hover:underline"
          onClick={() => setShowHistory((v) => !v)}
        >
          {showHistory
            ? "Afficher seulement le dernier relevé par canal"
            : `Voir l'historique (${counts.length} relevés)`}
        </button>
      )}
    </Card>
  );
}

const OTHER_PARTNER = "__autre__";

function PartnersSection({
  event,
  partners,
  onSaved,
}: {
  event: EventRow;
  partners: PartnerSale[];
  onSaved: () => void;
}) {
  const { data: allPartners = [] } = useQuery({
    queryKey: ["event-partners-options"],
    queryFn: fetchEventPartners,
  });
  const relais = allPartners.filter((p) => p.kind === "relais_evenement" && p.is_active);
  // choice : id d'un partenaire « relais », OTHER_PARTNER (nom libre) ou "" (rien choisi).
  const empty = { id: "", choice: "", partner_name: "", tickets: "", vip_revenue: "" };
  const [f, setF] = useState(empty);
  const commission = (p: PartnerSale) =>
    p.tickets * Number(event.partner_ticket_commission) +
    (p.vip_revenue * Number(event.partner_vip_commission_pct)) / 100;
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      onSaved();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
  const submit = async () => {
    const picked = allPartners.find((p) => p.id === f.choice);
    const name = picked?.name ?? (f.choice === OTHER_PARTNER ? f.partner_name : "");
    if (!name.trim()) return void toast.error("Choisis un relais ou saisis son nom");
    const done = await run(
      () =>
        savePartnerSale(partners, {
          id: f.id || undefined,
          event_id: event.id,
          partner_id: picked?.id ?? null,
          partner_name: name,
          tickets: Number(f.tickets || 0),
          vip_revenue: Number(f.vip_revenue || 0),
        }),
      "Relais mis à jour",
    );
    if (done) setF(empty);
  };
  const total = partners.reduce((s, p) => s + commission(p), 0);
  const due = partners.filter((p) => !p.paid).reduce((s, p) => s + commission(p), 0);
  return (
    <Card className="p-5">
      <SectionTitle
        icon={Users}
        title="Relais et commissions"
        hint={`${fmtMoney(event.partner_ticket_commission, event.currency)} par billet + ${event.partner_vip_commission_pct} % des tables VIP. Total : ${fmtMoney(total, event.currency)}, dont ${fmtMoney(due, event.currency)} encore à payer.`}
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-5">
        <Select value={f.choice} onValueChange={(v) => setF({ ...f, choice: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Choisir le relais" />
          </SelectTrigger>
          <SelectContent>
            {relais.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
            {/* Relais lié à un partenaire désactivé ou d'un autre type : reste sélectionnable. */}
            {f.choice && f.choice !== OTHER_PARTNER && !relais.some((p) => p.id === f.choice) && (
              <SelectItem value={f.choice}>
                {allPartners.find((p) => p.id === f.choice)?.name ?? f.partner_name}
              </SelectItem>
            )}
            <SelectItem value={OTHER_PARTNER}>Autre (saisir le nom)…</SelectItem>
          </SelectContent>
        </Select>
        {f.choice === OTHER_PARTNER ? (
          <Input
            placeholder="Nom du relais"
            value={f.partner_name}
            onChange={(e) => setF({ ...f, partner_name: e.target.value })}
          />
        ) : (
          <div className="hidden sm:block" />
        )}
        <Input
          type="number"
          min={0}
          placeholder="Billets vendus"
          value={f.tickets}
          onChange={(e) => setF({ ...f, tickets: e.target.value })}
        />
        <Input
          type="number"
          min={0}
          placeholder={`CA tables VIP ${event.currency}`}
          value={f.vip_revenue}
          onChange={(e) => setF({ ...f, vip_revenue: e.target.value })}
        />
        <div className="flex gap-1">
          <Button className="flex-1" onClick={() => void submit()}>
            <Plus className="mr-1.5 h-4 w-4" />
            {f.id ? "Mettre à jour" : "Ajouter"}
          </Button>
          {f.id && (
            <Button variant="ghost" onClick={() => setF(empty)}>
              Annuler
            </Button>
          )}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Relais</TableHead>
            <TableHead>Billets</TableHead>
            <TableHead>CA VIP</TableHead>
            <TableHead>Commission</TableHead>
            <TableHead>Payé</TableHead>
            <TableHead className="w-20" />
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
                <Switch
                  checked={p.paid}
                  aria-label="Commission payée"
                  onCheckedChange={(v) =>
                    void run(
                      () => setPartnerSalePaid(p.id, v),
                      v ? "Commission marquée payée" : "Commission à nouveau due",
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <EditIcon
                    label="Modifier ce relais"
                    onClick={() =>
                      setF({
                        id: p.id,
                        choice: p.partner_id ?? OTHER_PARTNER,
                        partner_name: p.partner_name,
                        tickets: String(p.tickets),
                        vip_revenue: String(p.vip_revenue),
                      })
                    }
                  />
                  <DeleteIcon
                    label="Supprimer ce relais"
                    onClick={() => {
                      if (!confirm(`Retirer ${p.partner_name} de cette soirée ?`)) return;
                      void run(() => deletePartnerSale(p.id), "Relais supprimé");
                    }}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {partners.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-sm text-muted-foreground">
                Aucun relais enregistré.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function TicketLotsSection({ event }: { event: EventRow }) {
  const qc = useQueryClient();
  const key = ["ops", "event-lots", event.id];
  const { data: lots = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchTicketLots(event.id),
  });
  const empty = {
    id: "",
    name: "",
    price: "",
    quantity: "",
    sales_start: "",
    sales_end: "",
    notes: "",
  };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      await qc.invalidateQueries({ queryKey: key });
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
  const submit = async () => {
    const existing = lots.find((l) => l.id === f.id);
    const done = await run(
      () =>
        saveTicketLot({
          id: f.id || undefined,
          event_id: event.id,
          name: f.name,
          price: f.price === "" ? null : Number(f.price),
          quantity: f.quantity === "" ? null : Number(f.quantity),
          sales_start: f.sales_start || null,
          sales_end: f.sales_end || null,
          sort: existing?.sort ?? (lots.length ? Math.max(...lots.map((l) => l.sort)) + 1 : 0),
          notes: f.notes.trim() || null,
        }),
      f.id ? "Lot mis à jour" : "Lot ajouté",
    );
    if (done) setF(empty);
  };
  const fmtDay = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");
  return (
    <Card className="p-5">
      <SectionTitle
        icon={Layers}
        title="Lots de billets"
        hint="Les paliers de prix (1er lot, 2e lot…) avec leur quantité et leurs dates de vente."
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-7">
        <Input placeholder="Nom (ex. 1er lot)" value={f.name} onChange={set("name")} />
        <Input
          type="number"
          min={0}
          placeholder={`Prix ${event.currency}`}
          value={f.price}
          onChange={set("price")}
        />
        <Input
          type="number"
          min={0}
          placeholder="Quantité"
          value={f.quantity}
          onChange={set("quantity")}
        />
        <Input
          type="date"
          title="Début des ventes"
          value={f.sales_start}
          onChange={set("sales_start")}
        />
        <Input type="date" title="Fin des ventes" value={f.sales_end} onChange={set("sales_end")} />
        <Input placeholder="Note" value={f.notes} onChange={set("notes")} />
        <div className="flex gap-1">
          <Button className="flex-1" onClick={() => void submit()}>
            <Plus className="mr-1.5 h-4 w-4" />
            {f.id ? "Modifier" : "Lot"}
          </Button>
          {f.id && (
            <Button variant="ghost" onClick={() => setF(empty)}>
              Annuler
            </Button>
          )}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Lot</TableHead>
            <TableHead>Prix</TableHead>
            <TableHead>Quantité</TableHead>
            <TableHead>Ventes</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {lots.map((l) => (
            <TableRow key={l.id}>
              <TableCell className="font-medium">
                {l.name}
                {l.notes && <span className="block text-xs text-muted-foreground">{l.notes}</span>}
              </TableCell>
              <TableCell>{fmtMoney(l.price, event.currency)}</TableCell>
              <TableCell>{l.quantity ?? "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {fmtDay(l.sales_start)} → {fmtDay(l.sales_end)}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <EditIcon
                    label="Modifier ce lot"
                    onClick={() =>
                      setF({
                        id: l.id,
                        name: l.name,
                        price: l.price == null ? "" : String(l.price),
                        quantity: l.quantity == null ? "" : String(l.quantity),
                        sales_start: l.sales_start ?? "",
                        sales_end: l.sales_end ?? "",
                        notes: l.notes ?? "",
                      })
                    }
                  />
                  <DeleteIcon
                    label="Supprimer ce lot"
                    onClick={() => {
                      if (!confirm(`Supprimer le lot « ${l.name} » ?`)) return;
                      void run(() => deleteTicketLot(l.id), "Lot supprimé");
                    }}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && lots.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-sm text-muted-foreground">
                Aucun lot défini.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

const NO_PARTNER = "__none__";

function PromoCodesSection({ event }: { event: EventRow }) {
  const qc = useQueryClient();
  const key = ["ops", "event-promo", event.id];
  const { data: codes = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => fetchPromoCodes(event.id),
  });
  const { data: allPartners = [] } = useQuery({
    queryKey: ["event-partners-options"],
    queryFn: fetchEventPartners,
  });
  const partnerName = new Map(allPartners.map((p) => [p.id, p.name]));
  // Relais d'événement d'abord, puis les autres partenaires actifs.
  const options = [...allPartners]
    .filter((p) => p.is_active)
    .sort(
      (a, b) =>
        Number(b.kind === "relais_evenement") - Number(a.kind === "relais_evenement") ||
        a.name.localeCompare(b.name),
    );
  const empty = {
    id: "",
    code: "",
    partner_id: NO_PARTNER,
    discount_pct: "10",
    platform: "sympla_shotgun",
    uses: "",
    revenue: "",
    vip_revenue: "",
    paid: false,
  };
  const [f, setF] = useState(empty);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      toast.success(ok);
      await qc.invalidateQueries({ queryKey: key });
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  };
  const submit = async () => {
    const discount = Number(f.discount_pct.replace(",", "."));
    if (!Number.isFinite(discount) || discount < 0 || discount > 100)
      return void toast.error("Réduction : entre 0 et 100 %");
    const done = await run(
      () =>
        savePromoCode({
          id: f.id || undefined,
          event_id: event.id,
          code: f.code,
          partner_id: f.partner_id === NO_PARTNER ? null : f.partner_id,
          discount_pct: discount,
          platform: f.platform,
          uses: Number(f.uses || 0),
          revenue: Number(f.revenue || 0),
          vip_revenue: Number(f.vip_revenue || 0),
          paid: f.paid,
        }),
      f.id ? "Code mis à jour" : "Code ajouté",
    );
    if (done) setF(empty);
  };
  const platformLabel = (v: string) => PROMO_PLATFORMS.find((p) => p.value === v)?.label ?? v;
  return (
    <Card className="p-5">
      <SectionTitle
        icon={Tag}
        title="Codes promo"
        hint="Un code par relais ou partenaire : utilisations et CA relevés sur Sympla / Shotgun."
      />
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <Input placeholder="Code (ex. LILI10)" value={f.code} onChange={set("code")} />
        <Select value={f.partner_id} onValueChange={(v) => setF({ ...f, partner_id: v })}>
          <SelectTrigger>
            <SelectValue placeholder="Partenaire" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PARTNER}>Sans partenaire</SelectItem>
            {options.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={f.platform} onValueChange={(v) => setF({ ...f, platform: v })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PROMO_PLATFORMS.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <Input
            type="number"
            min={0}
            max={100}
            className="pr-8"
            placeholder="Réduction"
            value={f.discount_pct}
            onChange={set("discount_pct")}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            %
          </span>
        </div>
        <Input
          type="number"
          min={0}
          placeholder="Utilisations"
          value={f.uses}
          onChange={set("uses")}
        />
        <Input
          type="number"
          min={0}
          placeholder={`CA billets ${event.currency}`}
          value={f.revenue}
          onChange={set("revenue")}
        />
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={f.paid} onCheckedChange={(v) => setF({ ...f, paid: v })} />
          Commission payée
        </label>
        <div className="flex gap-1">
          <Button className="flex-1" onClick={() => void submit()}>
            <Plus className="mr-1.5 h-4 w-4" />
            {f.id ? "Mettre à jour" : "Ajouter"}
          </Button>
          {f.id && (
            <Button variant="ghost" onClick={() => setF(empty)}>
              Annuler
            </Button>
          )}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Code</TableHead>
            <TableHead>Partenaire</TableHead>
            <TableHead>Plateforme</TableHead>
            <TableHead>Réduction</TableHead>
            <TableHead>Utilisations</TableHead>
            <TableHead>CA</TableHead>
            <TableHead>Payé</TableHead>
            <TableHead className="w-20" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {codes.map((c) => (
            <TableRow key={c.id}>
              <TableCell className="font-mono font-medium">{c.code}</TableCell>
              <TableCell>{c.partner_id ? (partnerName.get(c.partner_id) ?? "—") : "—"}</TableCell>
              <TableCell>{platformLabel(c.platform)}</TableCell>
              <TableCell>{Number(c.discount_pct)} %</TableCell>
              <TableCell>{c.uses}</TableCell>
              <TableCell>{fmtMoney(c.revenue, event.currency)}</TableCell>
              <TableCell>
                <Switch
                  checked={c.paid}
                  aria-label="Commission payée"
                  onCheckedChange={(v) =>
                    void run(
                      () => savePromoCode({ ...c, paid: v }),
                      v ? "Marqué payé" : "Marqué non payé",
                    )
                  }
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <EditIcon
                    label="Modifier ce code"
                    onClick={() =>
                      setF({
                        id: c.id,
                        code: c.code,
                        partner_id: c.partner_id ?? NO_PARTNER,
                        discount_pct: String(c.discount_pct),
                        platform: c.platform,
                        uses: String(c.uses),
                        revenue: String(c.revenue),
                        vip_revenue: String(c.vip_revenue),
                        paid: c.paid,
                      })
                    }
                  />
                  <DeleteIcon
                    label="Supprimer ce code"
                    onClick={() => {
                      if (!confirm(`Supprimer le code ${c.code} ?`)) return;
                      void run(() => deletePromoCode(c.id), "Code supprimé");
                    }}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
          {!isLoading && codes.length === 0 && (
            <TableRow>
              <TableCell colSpan={8} className="text-sm text-muted-foreground">
                Aucun code promo.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Card>
  );
}

function EditIcon({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Pencil className="h-3.5 w-3.5" />
    </Button>
  );
}

function DeleteIcon({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7 text-muted-foreground hover:text-destructive"
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
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

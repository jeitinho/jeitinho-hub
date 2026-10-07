import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, FileText, Inbox, Save } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TASK_KIND_LABELS, fmtDateTime, fmtMoney } from "@/lib/ops/ops";
import {
  KIND_LABEL,
  PARTNER_KINDS,
  SOURCE_LABEL,
  contactedTodayPatch,
  fromLocalInput,
  inDaysAt10,
  isNewApplication,
  isOverdue,
  patchFromApplication,
  salesFor,
  statusPatch,
  tasksFor,
  toLocalInput,
  type Partner,
  type PartnerKind,
  type PartnerLinks,
  type PartnerPatch,
} from "@/lib/ops/partenaires";
import { PartnerTimeline } from "@/components/client360/partner-timeline";
import { ApplicationView } from "./application-view";
import { ContactButtons, KindPill, NewBadge, StatusMenu, StatusPill } from "./shared";
import { usePartnerUpdate } from "./use-partner-update";

const TEXT_FIELDS = [
  "name",
  "category",
  "contact_name",
  "phone",
  "whatsapp",
  "email",
  "instagram",
  "website",
  "location",
  "address",
  "google_maps_url",
  "terms",
  "next_action",
  "notes",
] as const;
type TextField = (typeof TEXT_FIELDS)[number];

type FormState = Record<TextField, string> & {
  kind: PartnerKind;
  commission_rate: string;
  next_action_at: string;
  is_active: boolean;
};

function toForm(p: Partner): FormState {
  const f = {} as FormState;
  for (const k of TEXT_FIELDS) f[k] = p[k] ?? "";
  f.kind = p.kind;
  f.commission_rate = p.commission_rate == null ? "" : String(p.commission_rate);
  f.next_action_at = toLocalInput(p.next_action_at);
  f.is_active = p.is_active;
  return f;
}

/** Champs modifiés par rapport à la fiche en base. */
function diff(form: FormState, p: Partner): PartnerPatch {
  const base = toForm(p);
  const patch: Record<string, unknown> = {};
  for (const k of TEXT_FIELDS) {
    if (form[k].trim() !== base[k].trim()) patch[k] = form[k].trim() || null;
  }
  if (patch.name === null) delete patch.name;
  if (form.kind !== base.kind) patch.kind = form.kind;
  if (form.commission_rate.trim() !== base.commission_rate)
    patch.commission_rate =
      form.commission_rate.trim() === "" ? null : Number(form.commission_rate.replace(",", "."));
  if (form.next_action_at !== base.next_action_at)
    patch.next_action_at = fromLocalInput(form.next_action_at);
  if (form.is_active !== base.is_active) patch.is_active = form.is_active;
  return patch as PartnerPatch;
}

export function PartnerSheet({
  partner,
  links,
  neighborhoods,
  onOpenChange,
}: {
  partner: Partner | null;
  links: PartnerLinks | undefined;
  neighborhoods: string[];
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Sheet open={!!partner} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {partner && (
          <PartnerForm
            key={partner.id}
            partner={partner}
            links={links}
            neighborhoods={neighborhoods}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-t border-border/60 pt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="tracked text-[10px] text-muted-foreground">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1 block text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function PartnerForm({
  partner: p,
  links,
  neighborhoods,
}: {
  partner: Partner;
  links: PartnerLinks | undefined;
  neighborhoods: string[];
}) {
  const update = usePartnerUpdate();
  const [form, setForm] = useState<FormState>(() => toForm(p));
  const [saving, setSaving] = useState(false);
  const patch = diff(form, p);
  const dirty = Object.keys(patch).length > 0;
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));
  const text = (k: TextField, placeholder?: string, type = "text") => (
    <Input
      type={type}
      value={form[k]}
      placeholder={placeholder}
      onChange={(e) => set(k, e.target.value)}
    />
  );

  const save = async () => {
    if (!form.name.trim()) return;
    if (patch.commission_rate != null && Number.isNaN(patch.commission_rate)) return;
    setSaving(true);
    await update(p.id, patch);
    setSaving(false);
  };

  const fromApplication = patchFromApplication(p);
  const hasFromApplication = Object.keys(fromApplication).length > 0;
  const fillFromApplication = async () => {
    const ok = await update(p.id, fromApplication, "Fiche complétée depuis la candidature");
    if (ok)
      setForm((f) => {
        const next = { ...f };
        for (const [k, v] of Object.entries(fromApplication))
          if (k in next && typeof v === "string") (next as Record<string, unknown>)[k] = v;
        return next;
      });
  };

  const experiences = links?.experiences.filter((e) => e.partner_id === p.id) ?? [];
  const tasks = links ? tasksFor(p, links.tasks) : [];
  const sales = links ? salesFor(p, links.sales) : [];
  const codes = links?.codes.filter((c) => c.partner_id === p.id) ?? [];
  const overdue = isOverdue(p);

  return (
    <div className="space-y-5 pb-20">
      <SheetHeader className="space-y-2 pr-6 text-left">
        <div className="flex flex-wrap items-center gap-1.5">
          {isNewApplication(p) && <NewBadge />}
          <StatusPill status={p.status} />
          <KindPill kind={p.kind} />
          {!p.is_active && <span className="text-[10px] text-muted-foreground">· inactif</span>}
        </div>
        <SheetTitle className="text-xl" style={{ fontFamily: "Fraunces, serif", fontWeight: 500 }}>
          {p.name}
        </SheetTitle>
        <SheetDescription className="text-xs">
          {SOURCE_LABEL[p.source] ?? p.source}
          {p.submitted_at && ` · candidature du ${fmtDateTime(p.submitted_at)}`}
          {` · dernier contact : ${p.last_contact_at ? fmtDateTime(p.last_contact_at) : "jamais"}`}
        </SheetDescription>
      </SheetHeader>

      <div className="flex flex-wrap items-center gap-2">
        <ContactButtons partner={p} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          className="h-8 text-xs"
          onClick={() => void update(p.id, contactedTodayPatch(p), "Contact enregistré")}
        >
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
          Contacté aujourd'hui
        </Button>
        <StatusMenu partner={p} />
        {isNewApplication(p) && (
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() =>
              void update(p.id, statusPatch("a_contacter"), "Candidature prise en charge")
            }
          >
            <Inbox className="mr-1.5 h-3.5 w-3.5" />
            Prendre en charge
          </Button>
        )}
      </div>

      <Section title="Prochaine action">
        <div className="grid gap-2 sm:grid-cols-[1fr_12rem]">
          <Input
            value={form.next_action}
            placeholder="Ex. Relancer pour la visite"
            onChange={(e) => set("next_action", e.target.value)}
          />
          <Input
            type="datetime-local"
            value={form.next_action_at}
            className={overdue && !patch.next_action_at ? "border-destructive/60" : undefined}
            onChange={(e) => set("next_action_at", e.target.value)}
          />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
          {[
            [1, "Demain"],
            [3, "Dans 3 j"],
            [7, "Dans 7 j"],
            [14, "Dans 14 j"],
          ].map(([n, label]) => (
            <Button
              key={n}
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={() => set("next_action_at", toLocalInput(inDaysAt10(n as number)))}
            >
              {label}
            </Button>
          ))}
          {form.next_action_at && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px] text-muted-foreground"
              onClick={() => set("next_action_at", "")}
            >
              Effacer
            </Button>
          )}
          {overdue && <span className="text-[11px] text-destructive">En retard</span>}
        </div>
      </Section>

      <Section title="Fiche">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Nom" className="sm:col-span-2">
            {text("name")}
          </Field>
          <Field label="Type">
            <Select value={form.kind} onValueChange={(v) => set("kind", v as PartnerKind)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PARTNER_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Catégorie">{text("category", "bar, guide, agencia…")}</Field>
          <Field label="Contact">{text("contact_name")}</Field>
          <Field label="Téléphone">{text("phone", "+55 21 …", "tel")}</Field>
          <Field label="WhatsApp">{text("whatsapp", "+55 21 …", "tel")}</Field>
          <Field label="E-mail">{text("email", undefined, "email")}</Field>
          <Field label="Instagram">{text("instagram", "@compte")}</Field>
          <Field label="Site">{text("website", "https://…", "url")}</Field>
          <Field label="Quartier">
            <Input
              list="partner-neighborhoods"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
            />
            <datalist id="partner-neighborhoods">
              {neighborhoods.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
          </Field>
          <Field label="Adresse">{text("address")}</Field>
          <Field label="Lien Google Maps" className="sm:col-span-2">
            {text("google_maps_url", "https://maps.app.goo.gl/…", "url")}
          </Field>
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <Switch checked={form.is_active} onCheckedChange={(v) => set("is_active", v)} />
            Actif
          </label>
        </div>
      </Section>

      <Section title="Conditions">
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <Field label="Commission (%)">
            <Input
              inputMode="decimal"
              value={form.commission_rate}
              placeholder="10"
              onChange={(e) => set("commission_rate", e.target.value)}
            />
          </Field>
          <Field label="Conditions">
            <Textarea
              rows={3}
              value={form.terms}
              placeholder="Tarif partenaire, avantages communauté, modalités de paiement…"
              onChange={(e) => set("terms", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Notes" className="mt-3">
          <Textarea rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </Field>
      </Section>

      {p.application && (
        <Section
          title="Candidature"
          action={
            hasFromApplication ? (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => void fillFromApplication()}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" />
                Compléter la fiche
              </Button>
            ) : undefined
          }
        >
          <ApplicationView application={p.application} />
        </Section>
      )}

      <Section title="Liens">
        {!links ? (
          <p className="text-xs text-muted-foreground">Chargement…</p>
        ) : experiences.length + tasks.length + sales.length + codes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Aucune expérience, tâche ou vente liée.</p>
        ) : (
          <div className="space-y-4 text-xs">
            {experiences.length > 0 && (
              <LinkGroup title={`Expériences (${experiences.length})`}>
                {experiences.map((e) => (
                  <Link
                    key={e.id}
                    to="/experiences/$id"
                    params={{ id: e.id }}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 hover:bg-muted/50"
                  >
                    <span className="truncate">{e.title}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {e.is_published ? "publiée" : "brouillon"}
                    </span>
                  </Link>
                ))}
              </LinkGroup>
            )}
            {tasks.length > 0 && (
              <LinkGroup title={`Tâches (${tasks.length})`}>
                {tasks.map((t) => (
                  <Link
                    key={t.id}
                    to="/a-valider"
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate">{t.title}</span>
                      <span className="text-muted-foreground">
                        {TASK_KIND_LABELS[t.kind] ?? t.kind} · {fmtDateTime(t.due_at)}
                      </span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">{taskStatus(t.status)}</span>
                  </Link>
                ))}
              </LinkGroup>
            )}
            {sales.length > 0 && (
              <LinkGroup title="Ventes AFRO LOVE">
                {sales.map((s) => (
                  <Link
                    key={s.id}
                    to="/evenements"
                    search={{ id: s.event_id }}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 hover:bg-muted/50"
                  >
                    <span className="truncate">{s.events?.name ?? "Événement"}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {s.tickets} billet{s.tickets > 1 ? "s" : ""} · VIP {fmtMoney(s.vip_revenue)}
                      {s.paid ? " · payé" : ""}
                    </span>
                  </Link>
                ))}
              </LinkGroup>
            )}
            {codes.length > 0 && (
              <LinkGroup title="Codes promo">
                {codes.map((c) => (
                  <Link
                    key={c.id}
                    to="/evenements"
                    search={{ id: c.event_id }}
                    className="flex items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 hover:bg-muted/50"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-mono">{c.code}</span>
                      <span className="text-muted-foreground">
                        {c.events?.name ?? "Événement"} · −{Number(c.discount_pct)} %
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-muted-foreground">
                      {c.uses} util. · {fmtMoney(c.revenue)}
                      {c.paid ? " · payé" : ""}
                    </span>
                  </Link>
                ))}
              </LinkGroup>
            )}
          </div>
        )}
      </Section>

      <Section title="Chronologie">
        <PartnerTimeline partner={p} />
      </Section>

      {dirty && (
        <div className="sticky bottom-0 -mx-6 flex items-center justify-end gap-2 border-t border-border/60 bg-background/95 px-6 py-3 backdrop-blur">
          {!form.name.trim() && <span className="text-xs text-destructive">Nom obligatoire</span>}
          {patch.commission_rate != null && Number.isNaN(patch.commission_rate) && (
            <span className="text-xs text-destructive">Commission invalide</span>
          )}
          <Button variant="ghost" size="sm" onClick={() => setForm(toForm(p))}>
            Annuler
          </Button>
          <Button size="sm" disabled={saving} onClick={() => void save()}>
            <Save className="mr-1.5 h-3.5 w-3.5" />
            Enregistrer
          </Button>
        </div>
      )}
    </div>
  );
}

function LinkGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 font-medium">{title}</p>
      <div className="grid gap-1.5">{children}</div>
    </div>
  );
}

function taskStatus(s: string) {
  return (
    (
      { a_valider: "à valider", valide: "validée", envoye: "envoyée", annule: "annulée" } as Record<
        string,
        string
      >
    )[s] ?? s
  );
}

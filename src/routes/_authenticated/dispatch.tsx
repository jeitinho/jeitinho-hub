import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, MapPin, MessageCircle, Phone, UserPlus, Users, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { getLang, t } from "@/lib/i18n";
import { todayRio } from "@/lib/trips/list-rules";
import { mapsLink, whatsappLink } from "@/lib/ops/manifest-rules";
import {
  SOURCE_LABEL,
  SOURCE_TONE,
  addDays,
  conflicts,
  dispatchSummary,
  displayTime,
  filterItems,
  groupByDay,
  isConfirmed,
  itemKey,
  loadByPerson,
  needsStaff,
  type DispatchItem,
} from "@/lib/ops/dispatch-rules";
import { LoadingRows } from "@/components/loading-rows";

export const Route = createFileRoute("/_authenticated/dispatch")({
  head: () => ({ meta: [{ title: "Dispatch — JEITINHO" }] }),
  component: DispatchPage,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Person = { user_id: string; name: string; roles: string[]; whatsapp: string | null };
type Partner = { id: string; name: string; category: string | null; whatsapp: string | null; phone: string | null };

const RANGES = [
  { days: 7, label: "7 jours" },
  { days: 14, label: "14 jours" },
  { days: 30, label: "30 jours" },
  { days: 90, label: "3 mois" },
];

const NONE = "__none";

function dayLabel(day: string) {
  const locale = getLang() === "pt" ? "pt-BR" : getLang() === "en" ? "en-GB" : "fr-FR";
  const s = new Date(`${day}T12:00:00Z`).toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function missionText(i: DispatchItem, who: string) {
  return [
    `JEITINHO — ${t("sortie pour")} ${who}`,
    `${dayLabel(i.day)} · ${displayTime(i.time_label)}`,
    `${i.title}${i.pax ? ` · ${i.pax} pers.` : ""}`,
    i.client_name ? `${t("Client")} : ${i.client_name}${i.language ? ` (${i.language})` : ""}${i.client_phone ? ` · ${i.client_phone}` : ""}` : null,
    i.meeting_point ? `📍 ${i.meeting_point}` : null,
    i.ref ? `Réf. ${i.ref}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

function DispatchPage() {
  const qc = useQueryClient();
  const { user, canOperate } = useAuth();
  const today = todayRio();
  const [range, setRange] = useState(14);
  const [confirmedOnly, setConfirmedOnly] = useState(true);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [personId, setPersonId] = useState<string | null>(canOperate ? null : (user?.id ?? null));
  const [source, setSource] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const to = addDays(today, range);
  const queryKey = ["dispatch", today, to];

  const list = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await db.rpc("dispatch_list", { p_from: today, p_to: to });
      if (error) throw new Error(error.message);
      return (data ?? []) as DispatchItem[];
    },
  });
  const team = useQuery({
    queryKey: ["dispatch-team"],
    enabled: canOperate,
    queryFn: async () => {
      const { data, error } = await db.rpc("dispatch_team");
      if (error) throw new Error(error.message);
      return (data ?? []) as Person[];
    },
  });
  const partners = useQuery({
    queryKey: ["dispatch-partners"],
    enabled: canOperate,
    queryFn: async () => {
      const { data } = await db
        .from("partners")
        .select("id,name,category,whatsapp,phone")
        .eq("is_active", true)
        .order("name");
      return (data ?? []) as Partner[];
    },
  });

  const assign = useMutation({
    mutationFn: async (v: { items: DispatchItem[]; assignee?: string | null; partner?: string | null }) => {
      for (const i of v.items) {
        const { error } = await db.rpc("dispatch_assign", {
          p_source: i.source === "gyg" || i.source === "site" || i.source === "voyage" ? i.source : "ota",
          p_id: i.source_id,
          p_index: i.item_index,
          p_assignee: v.assignee ?? null,
          p_partner: v.partner ?? null,
          p_set_assignee: v.assignee !== undefined,
          p_set_partner: v.partner !== undefined,
        });
        if (error) throw new Error(error.message);
      }
    },
    onMutate: async (v) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<DispatchItem[]>(queryKey);
      const keys = new Set(v.items.map(itemKey));
      qc.setQueryData<DispatchItem[]>(queryKey, (old) =>
        (old ?? []).map((i) =>
          keys.has(itemKey(i))
            ? {
                ...i,
                ...(v.assignee !== undefined ? { assignee_id: v.assignee } : {}),
                ...(v.partner !== undefined ? { partner_id: v.partner } : {}),
              }
            : i,
        ),
      );
      return { prev };
    },
    onError: (e: Error, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(`${t("Assignation impossible")} : ${e.message}`);
    },
    onSuccess: (_d, v) => {
      if (v.items.length > 1) toast.success(`${v.items.length} ${t("sorties assignées")}`);
      setSelected(new Set());
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["dispatch"] }),
  });

  const all = list.data ?? [];
  const items = useMemo(
    () => filterItems(all, { confirmedOnly, unassignedOnly, personId, source }),
    [all, confirmedOnly, unassignedOnly, personId, source],
  );
  const days = groupByDay(items);
  const summary = dispatchSummary(all);
  const load = loadByPerson(all);
  const clash = conflicts(all);
  const people = team.data ?? [];
  const extPartners = partners.data ?? [];
  const personName = (id: string | null) => people.find((p) => p.user_id === id)?.name ?? (id === user?.id ? t("Moi") : "—");
  const selectedItems = all.filter((i) => selected.has(itemKey(i)));

  const toggle = (k: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  return (
    <PageShell
      eyebrow={t("Terrain")}
      title={t("Dispatch")}
      description={t(
        "Toutes les sorties confirmées — GetYourGuide, site, voyages et saisies manuelles — et qui s'en occupe.",
      )}
      actions={
        <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setRange(r.days)}
              className={`rounded-md px-2.5 py-1 text-[13px] font-semibold transition-colors ${
                range === r.days ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(r.label)}
            </button>
          ))}
        </div>
      }
    >
      {/* Résumé + charge de l'équipe */}
      <div className="mb-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="grid grid-cols-3 divide-x divide-border p-0">
          <Stat value={summary.total} label={t("sorties à venir")} />
          <Stat
            value={summary.toStaff}
            label={t("sans personne")}
            alert={summary.toStaff > 0}
            onClick={() => setUnassignedOnly((v) => !v)}
            active={unassignedOnly}
          />
          <Stat value={summary.pax} label={t("voyageurs")} />
        </Card>
        {canOperate && (
          <Card className="flex flex-wrap items-center gap-2 p-3">
            <span className="mr-1 flex items-center gap-1.5 text-[13px] font-semibold">
              <Users className="h-4 w-4 text-muted-foreground" /> {t("Équipe")}
            </span>
            {people.map((p) => (
              <button
                key={p.user_id}
                type="button"
                onClick={() => setPersonId((cur) => (cur === p.user_id ? null : p.user_id))}
                className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12.5px] font-medium transition-colors ${
                  personId === p.user_id
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:border-foreground/30"
                }`}
              >
                {p.name.split(" ")[0]}
                <span className={`tabular-nums ${personId === p.user_id ? "text-background/70" : "text-muted-foreground"}`}>
                  {load[p.user_id] ?? 0}
                </span>
              </button>
            ))}
          </Card>
        )}
      </div>

      {/* Filtres */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={confirmedOnly} onClick={() => setConfirmedOnly((v) => !v)}>
          {t("Confirmées seulement")}
        </Chip>
        <Chip active={unassignedOnly} onClick={() => setUnassignedOnly((v) => !v)}>
          {t("À staffer")}
        </Chip>
        <span className="mx-1 h-4 w-px bg-border" />
        {["gyg", "site", "voyage", "manuel"].map((s) => (
          <Chip key={s} active={source === s} onClick={() => setSource((cur) => (cur === s ? null : s))}>
            {SOURCE_LABEL[s]}
          </Chip>
        ))}
        {user && canOperate && (
          <>
            <span className="mx-1 h-4 w-px bg-border" />
            <Chip active={personId === user.id} onClick={() => setPersonId((c) => (c === user.id ? null : user.id))}>
              {t("Mes sorties")}
            </Chip>
          </>
        )}
      </div>

      {list.isLoading && <LoadingRows />}
      {list.error && <p className="text-sm text-destructive">{(list.error as Error).message}</p>}
      {!list.isLoading && days.length === 0 && (
        <Card className="p-8 text-center">
          <p className="font-display text-xl">{t("Rien à dispatcher sur cette période.")}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("Les réservations GetYourGuide, les paniers payés du site et les prestations des voyages apparaissent ici automatiquement.")}
          </p>
        </Card>
      )}

      <div className="space-y-6 pb-24">
        {days.map(({ day, items: dayItems }) => {
          const missing = dayItems.filter(needsStaff).length;
          return (
            <section key={day}>
              <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-[5] -mx-1 mb-2 flex items-baseline gap-3 bg-background/95 px-1 py-1.5 backdrop-blur">
                <h2 className="font-display text-lg">
                  {day === today ? t("Aujourd'hui") : day === addDays(today, 1) ? t("Demain") : dayLabel(day)}
                </h2>
                <span className="text-[12.5px] text-muted-foreground">
                  {dayItems.length} {dayItems.length > 1 ? t("sorties") : t("sortie")}
                </span>
                {missing > 0 && (
                  <span className="text-[12.5px] font-semibold text-destructive">
                    {missing} {t("sans personne")}
                  </span>
                )}
              </div>
              <Card className="divide-y divide-border overflow-hidden p-0">
                {dayItems.map((i) => {
                  const k = itemKey(i);
                  const person = people.find((p) => p.user_id === i.assignee_id);
                  const partner = extPartners.find((p) => p.id === i.partner_id);
                  const waTarget = whatsappLink(person?.whatsapp ?? partner?.whatsapp ?? partner?.phone ?? null);
                  return (
                    <div
                      key={k}
                      className={`grid gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[auto_5.5rem_minmax(0,1fr)_minmax(0,17rem)] md:items-center ${
                        needsStaff(i) ? "bg-destructive/[0.025]" : ""
                      } ${!isConfirmed(i) ? "opacity-70" : ""} ${i.done ? "opacity-55" : ""}`}
                    >
                      {canOperate ? (
                        <Checkbox
                          className="hidden md:block"
                          checked={selected.has(k)}
                          onCheckedChange={() => toggle(k)}
                          aria-label={t("Sélectionner")}
                        />
                      ) : (
                        <span className="hidden md:block" />
                      )}
                      <div className="flex items-center gap-2 md:block">
                        <p className="font-display text-[17px] leading-none tabular-nums">{displayTime(i.time_label)}</p>
                        <span
                          className={`mt-1.5 inline-block rounded-full px-1.5 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${
                            SOURCE_TONE[i.source] ?? SOURCE_TONE.manuel
                          }`}
                        >
                          {SOURCE_LABEL[i.source] ?? i.source}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold">
                          {i.trip_id ? (
                            <Link to="/voyages/$id" params={{ id: i.trip_id }} className="hover:underline">
                              {i.title}
                            </Link>
                          ) : (
                            i.title
                          )}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12.5px] text-muted-foreground">
                          {i.pax != null && <span className="font-medium text-foreground/80">{i.pax} pers.</span>}
                          {i.client_name && <span>{i.client_name}</span>}
                          {i.language && <span className="uppercase">{i.language}</span>}
                          {i.ref && <span>{i.ref}</span>}
                          {!isConfirmed(i) && <span className="text-amber-700">{t("voyage en préparation")}</span>}
                          {clash.has(k) && (
                            <span className="flex items-center gap-1 font-semibold text-amber-700">
                              <AlertTriangle className="h-3 w-3" /> {t("chevauchement")}
                            </span>
                          )}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {whatsappLink(i.client_phone) && (
                            <IconLink href={whatsappLink(i.client_phone)!} label={t("WhatsApp client")}>
                              <MessageCircle className="h-3.5 w-3.5" />
                            </IconLink>
                          )}
                          {i.client_phone && (
                            <IconLink href={`tel:${i.client_phone}`} label={t("Appeler")}>
                              <Phone className="h-3.5 w-3.5" />
                            </IconLink>
                          )}
                          {mapsLink(i.meeting_point) && (
                            <IconLink href={mapsLink(i.meeting_point)!} label={i.meeting_point!}>
                              <MapPin className="h-3.5 w-3.5" />
                            </IconLink>
                          )}
                        </div>
                      </div>

                      {canOperate ? (
                        <div className="flex items-center gap-1.5">
                          <Select
                            value={i.partner_id ? `p:${i.partner_id}` : i.assignee_id ? `u:${i.assignee_id}` : NONE}
                            onValueChange={(v) => {
                              if (v === NONE) assign.mutate({ items: [i], assignee: null, partner: null });
                              else if (v.startsWith("u:")) assign.mutate({ items: [i], assignee: v.slice(2), partner: null });
                              else assign.mutate({ items: [i], partner: v.slice(2), assignee: null });
                            }}
                          >
                            <SelectTrigger
                              className={`h-9 flex-1 ${needsStaff(i) ? "border-destructive/40 text-destructive" : ""}`}
                            >
                              <SelectValue placeholder={t("Assigner…")} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>{t("Personne")}</SelectItem>
                              <SelectSeparator />
                              <SelectGroup>
                                <SelectLabel>{t("Équipe")}</SelectLabel>
                                {people.map((p) => (
                                  <SelectItem key={p.user_id} value={`u:${p.user_id}`}>
                                    {p.name}
                                    <span className="ml-1 text-muted-foreground">· {load[p.user_id] ?? 0}</span>
                                  </SelectItem>
                                ))}
                              </SelectGroup>
                              {extPartners.length > 0 && (
                                <>
                                  <SelectSeparator />
                                  <SelectGroup>
                                    <SelectLabel>{t("Prestataires externes")}</SelectLabel>
                                    {extPartners.map((p) => (
                                      <SelectItem key={p.id} value={`p:${p.id}`}>
                                        {p.name}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </>
                              )}
                            </SelectContent>
                          </Select>
                          {waTarget && (
                            <Button asChild size="icon" variant="outline" className="h-9 w-9 shrink-0" title={t("Envoyer la mission sur WhatsApp")}>
                              <a
                                href={`${waTarget}?text=${encodeURIComponent(missionText(i, person?.name ?? partner?.name ?? ""))}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <MessageCircle className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      ) : (
                        <p className="text-[13px] font-medium">{personName(i.assignee_id)}</p>
                      )}
                    </div>
                  );
                })}
              </Card>
            </section>
          );
        })}
      </div>

      {/* Barre d'action groupée */}
      {selectedItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-foreground px-4 py-2.5 text-background shadow-[0_18px_40px_-12px_rgb(34_30_26/0.5)]">
            <span className="text-[13px] font-semibold">
              {selectedItems.length} {t("sélectionnée(s)")}
            </span>
            <Select onValueChange={(v) => assign.mutate({ items: selectedItems, assignee: v, partner: null })}>
              <SelectTrigger className="h-8 w-48 border-background/20 bg-background/10 text-background">
                <UserPlus className="mr-1 h-3.5 w-3.5" />
                <SelectValue placeholder={t("Assigner à…")} />
              </SelectTrigger>
              <SelectContent>
                {people.map((p) => (
                  <SelectItem key={p.user_id} value={p.user_id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button type="button" onClick={() => setSelected(new Set())} aria-label={t("Annuler")}>
              <X className="h-4 w-4 opacity-70 hover:opacity-100" />
            </button>
          </div>
        </div>
      )}
    </PageShell>
  );
}

function Stat({
  value,
  label,
  alert,
  onClick,
  active,
}: {
  value: number;
  label: string;
  alert?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`px-4 py-3 text-left ${onClick ? "transition-colors hover:bg-muted/50" : ""} ${active ? "bg-muted/60" : ""}`}
    >
      <p className={`font-display text-[28px] leading-none ${alert ? "text-destructive" : ""}`}>{value}</p>
      <p className="mt-1.5 text-[12.5px] font-medium text-muted-foreground">{label}</p>
    </Comp>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${
        active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground/80 hover:border-foreground/30"
      }`}
    >
      {children}
    </button>
  );
}

function IconLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      title={label}
      aria-label={label}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {children}
    </a>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageCircle,
  Phone,
  UserX,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { getLang, t } from "@/lib/i18n";
import {
  buildManifest,
  manifestSummary,
  mapsLink,
  shiftDay,
  whatsappLink,
  type ManifestActivity,
  type ManifestBooking,
  type ManifestItem,
} from "@/lib/ops/manifest-rules";

export const Route = createFileRoute("/_authenticated/manifest")({
  component: ManifestPage,
  head: () => ({ meta: [{ title: "Sorties du jour — JEITINHO" }] }),
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
const NONE = "none";
const todayRio = () => new Date().toLocaleDateString("fr-CA", { timeZone: "America/Sao_Paulo" });

function dayTitle(day: string) {
  const s = new Date(`${day}T12:00:00Z`).toLocaleDateString(
    getLang() === "pt" ? "pt-BR" : "fr-FR",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: "UTC",
    },
  );
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ManifestPage() {
  const qc = useQueryClient();
  const { user, canOperate } = useAuth();
  const [day, setDay] = useState(todayRio());
  const [mineOnly, setMineOnly] = useState(!canOperate);
  const today = todayRio();

  const { data, isLoading, error } = useQuery({
    queryKey: ["manifest", day],
    queryFn: async () => {
      // Fenêtre large en UTC puis filtrage à l'heure de Rio (une sortie à 22h Rio tombe le lendemain en UTC).
      const from = `${shiftDay(day, -1)}T00:00:00Z`;
      const to = `${shiftDay(day, 2)}T00:00:00Z`;
      const [bookingsR, activitiesR, membersR] = await Promise.all([
        db
          .from("ota_bookings")
          .select(
            "id,platform,booking_ref,activity_title,start_at,participants,participants_detail,lead_name,lead_phone,lead_language,status,guide_id,checkin_status,notes,listing:ota_listings(meeting_point)",
          )
          .gte("start_at", from)
          .lt("start_at", to),
        canOperate
          ? db
              .from("trip_activities")
              .select(
                "id,trip_id,title,day,slot,display_time,scheduled_start,status,kind,trip:trips(title,reference,party_size,guide_id,status,client:clients(full_name,phone))",
              )
              .eq("day", day)
              .neq("kind", "note")
          : Promise.resolve({ data: [], error: null }),
        canOperate
          ? db
              .from("partner_members")
              .select("user_id,display_name")
              .eq("active", true)
              .order("sort_order")
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (bookingsR.error) throw new Error(bookingsR.error.message);
      if (activitiesR.error) throw new Error(activitiesR.error.message);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bookings: ManifestBooking[] = (bookingsR.data ?? []).map((b: any) => ({
        ...b,
        meeting_point: b.listing?.meeting_point ?? null,
      }));
      const activities: ManifestActivity[] = (activitiesR.data ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((a: any) => a.trip && a.trip.status !== "cancelled")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((a: any) => ({
          id: a.id,
          trip_id: a.trip_id,
          trip_title: a.trip.title,
          trip_reference: a.trip.reference,
          title: a.title,
          day: a.day,
          slot: a.slot,
          display_time: a.display_time,
          scheduled_start: a.scheduled_start,
          status: a.status,
          party_size: a.trip.party_size,
          client_name: a.trip.client?.full_name ?? null,
          client_phone: a.trip.client?.phone ?? null,
          guide_id: a.trip.guide_id,
        }));
      return {
        items: buildManifest(day, bookings, activities),
        members: (membersR.data ?? []) as { user_id: string; display_name: string }[],
      };
    },
  });

  const items = useMemo(() => {
    const all = data?.items ?? [];
    return mineOnly && user ? all.filter((i) => i.guideId === user.id) : all;
  }, [data, mineOnly, user]);
  const summary = manifestSummary(items);
  const members = data?.members ?? [];
  const nameOf = (id: string | null) => members.find((m) => m.user_id === id)?.display_name ?? null;

  // Mise à jour optimiste : l'écran change tout de suite, la base suit.
  const optimistic = (key: string, patch: Partial<ManifestItem>) =>
    qc.setQueryData(["manifest", day], (old: typeof data) =>
      old ? { ...old, items: old.items.map((i) => (i.key === key ? { ...i, ...patch } : i)) } : old,
    );
  const run = async (
    key: string,
    patch: Partial<ManifestItem>,
    write: () => Promise<{ error: { message: string } | null }>,
  ) => {
    optimistic(key, patch);
    const { error: e } = await write();
    if (e) {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["manifest", day] });
    }
  };
  const checkin = (i: ManifestItem, status: "present" | "no_show" | null) =>
    run(i.key, { done: status === "present", noShow: status === "no_show" }, () =>
      db
        .from("ota_bookings")
        .update({
          checkin_status: status,
          checked_in_at: status ? new Date().toISOString() : null,
          checked_in_by: status ? user?.id : null,
        })
        .eq("id", i.id),
    );
  const markDone = (i: ManifestItem, done: boolean) =>
    run(i.key, { done }, () =>
      db
        .from("trip_activities")
        .update({
          status: done ? "completed" : "confirmed",
          completed_at: done ? new Date().toISOString() : null,
        })
        .eq("id", i.id),
    );
  const assign = (i: ManifestItem, guideId: string | null) =>
    run(i.key, { guideId }, async () => {
      if (i.kind === "booking")
        return db.from("ota_bookings").update({ guide_id: guideId }).eq("id", i.id);
      const row = (await db.from("trip_activities").select("trip_id").eq("id", i.id).single()).data;
      return db.from("trips").update({ guide_id: guideId }).eq("id", row?.trip_id);
    });

  return (
    <PageShell
      eyebrow="Terrain"
      title={t("Sorties du jour")}
      description={t(
        "Toutes les sorties du jour, réservations plateformes et voyages sur mesure, avec pointage des participants.",
      )}
    >
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex flex-wrap items-center gap-2 bg-background/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:bg-transparent sm:px-0 sm:py-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDay(shiftDay(day, -1))}
          aria-label="Jour précédent"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex gap-1 rounded-lg bg-muted/60 p-1">
          {[
            [shiftDay(today, -1), t("Hier")],
            [today, t("Aujourd'hui")],
            [shiftDay(today, 1), t("Demain")],
          ].map(([d, label]) => (
            <button
              key={d}
              type="button"
              onClick={() => setDay(d)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${day === d ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDay(shiftDay(day, 1))}
          aria-label="Jour suivant"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Input
          type="date"
          className="h-9 w-40"
          value={day}
          onChange={(e) => e.target.value && setDay(e.target.value)}
        />
        {canOperate && (
          <div className="ml-auto flex gap-1 rounded-lg bg-muted/60 p-1">
            {[
              [false, t("Toutes")],
              [true, t("Mes sorties")],
            ].map(([v, label]) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setMineOnly(v as boolean)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium ${mineOnly === v ? "bg-background shadow-sm" : "text-muted-foreground"}`}
              >
                {label as string}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4">
        <h2 className="text-2xl" style={{ fontFamily: "Fraunces, serif" }}>
          {dayTitle(day)}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {summary.departures} {t("sorties")} · {summary.pax} {t("personnes")}
          {canOperate && summary.unassigned > 0 && (
            <span className="ml-1 font-medium text-amber-700">
              · {summary.unassigned} {t("sans guide")}
            </span>
          )}
          {summary.departures > 0 && ` · ${summary.done}/${summary.departures} ${t("pointées")}`}
        </p>
      </div>

      {error ? (
        <Card className="p-6 text-sm text-destructive">{(error as Error).message}</Card>
      ) : isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((k) => (
            <Card key={k} className="h-28 animate-pulse bg-muted/40" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">
          {t("Aucune sortie ce jour-là.")}
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((i) => {
            const wa = whatsappLink(i.contactPhone);
            const maps = mapsLink(i.meetingPoint);
            return (
              <Card
                key={i.key}
                className={`overflow-hidden p-0 transition-opacity ${i.cancelled ? "opacity-50" : ""} ${i.done ? "border-emerald-500/40" : i.noShow ? "border-destructive/40" : ""}`}
              >
                <div className="flex">
                  <div
                    className={`flex w-20 shrink-0 flex-col items-center justify-center gap-1 p-3 ${i.done ? "bg-emerald-600 text-white" : i.noShow ? "bg-destructive/80 text-white" : "bg-primary/10 text-primary"}`}
                  >
                    <span className="text-lg font-semibold tabular-nums leading-none">
                      {i.time}
                    </span>
                    {i.pax != null && (
                      <span className="flex items-center gap-1 text-[11px] opacity-90">
                        <Users className="h-3 w-3" />
                        {i.pax}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{i.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {i.subtitle}
                          {i.cancelled && ` · ${t("Annulée")}`}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {i.source}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      {i.contactName && <span className="font-medium">{i.contactName}</span>}
                      {i.language && (
                        <span className="text-xs text-muted-foreground">{i.language}</span>
                      )}
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:underline"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}
                      {i.contactPhone && (
                        <a
                          href={`tel:${i.contactPhone.replace(/[^\d+]/g, "")}`}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          {t("Appeler")}
                        </a>
                      )}
                    </div>
                    {i.meetingPoint && (
                      <a
                        href={maps ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:underline"
                      >
                        <MapPin className="h-3.5 w-3.5" />
                        {i.meetingPoint}
                      </a>
                    )}
                    {i.notes && <p className="mt-1 text-xs text-muted-foreground">{i.notes}</p>}
                    {!i.cancelled && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {canOperate ? (
                          <Select
                            value={i.guideId ?? NONE}
                            onValueChange={(v) => assign(i, v === NONE ? null : v)}
                          >
                            <SelectTrigger
                              className={`h-8 w-40 text-xs ${i.guideId ? "" : "border-amber-500/60 text-amber-700"}`}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NONE}>{t("Guide")} : —</SelectItem>
                              {members.map((m) => (
                                <SelectItem key={m.user_id} value={m.user_id}>
                                  {t("Guide")} : {m.display_name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          nameOf(i.guideId) && (
                            <span className="text-xs text-muted-foreground">
                              {t("Guide")} : {nameOf(i.guideId)}
                            </span>
                          )
                        )}
                        <div className="ml-auto flex gap-1.5">
                          {i.kind === "booking" ? (
                            <>
                              <Button
                                size="sm"
                                variant={i.done ? "default" : "outline"}
                                className={i.done ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                                onClick={() => checkin(i, i.done ? null : "present")}
                              >
                                <Check className="mr-1 h-3.5 w-3.5" />
                                {t("Présent")}
                              </Button>
                              <Button
                                size="sm"
                                variant={i.noShow ? "destructive" : "outline"}
                                onClick={() => checkin(i, i.noShow ? null : "no_show")}
                              >
                                <UserX className="mr-1 h-3.5 w-3.5" />
                                {t("Absent")}
                              </Button>
                            </>
                          ) : (
                            <Button
                              size="sm"
                              variant={i.done ? "default" : "outline"}
                              className={i.done ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                              onClick={() => markDone(i, !i.done)}
                            >
                              <Check className="mr-1 h-3.5 w-3.5" />
                              {t("Fait")}
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}

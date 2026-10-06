import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarClock, MessageCircle, Phone, Star, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OTA_BOOKING_STATUS_LABELS,
  fetchOtaBookings,
  fmtMoney,
  updateOtaBooking,
  type OtaBooking,
} from "@/lib/ops/ops";

const PLATFORM_LABEL: Record<string, string> = { getyourguide: "GetYourGuide" };
const STATUS_TONE: Record<OtaBooking["status"], string> = {
  confirmee: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  modifiee: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  realisee: "bg-muted text-muted-foreground",
  annulee: "bg-destructive/15 text-destructive",
  no_show: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

function fmtStart(iso: string | null) {
  if (!iso) return "Date à confirmer";
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
}

/** Liste des réservations plateformes. `clientId` → seulement celles d'un client. */
export function OtaBookingsList({ clientId, compact }: { clientId?: string; compact?: boolean }) {
  const qc = useQueryClient();
  const key = ["ops", "ota-bookings", clientId ?? "all"];
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: key,
    queryFn: () => fetchOtaBookings({ clientId }),
  });

  const patch = async (id: string, p: Partial<OtaBooking>, msg: string) => {
    try {
      await updateOtaBooking(id, p);
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["ops", "ota-bookings"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const now = Date.now();
  const upcoming = data
    .filter(
      (b) =>
        b.status !== "annulee" &&
        (!b.start_at || new Date(b.start_at).getTime() >= now - 6 * 3_600_000),
    )
    .sort((a, b) => (a.start_at ?? "").localeCompare(b.start_at ?? ""));
  const past = data.filter((b) => !upcoming.includes(b));

  if (isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;
  if (error)
    return <Card className="border-destructive/40 p-4 text-sm">{(error as Error).message}</Card>;
  if (data.length === 0)
    return (
      <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
        Aucune réservation plateforme{clientId ? " pour ce client" : ""}.
      </Card>
    );

  const row = (b: OtaBooking) => (
    <Card key={b.id} className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[b.status]}`}
            >
              {OTA_BOOKING_STATUS_LABELS[b.status]}
            </span>
            <Badge variant="outline">{PLATFORM_LABEL[b.platform] ?? b.platform}</Badge>
            <span className="text-xs text-muted-foreground">
              {b.booking_ref}
              {b.supplier_ref ? ` · ${b.supplier_ref}` : ""}
            </span>
          </div>
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <CalendarClock className="h-4 w-4 text-primary" />
            {fmtStart(b.start_at)}
          </p>
          <p className="text-sm">{b.activity_title ?? "Activité"}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>
              <Users className="mr-1 inline h-3 w-3" />
              {b.participants ?? "?"} pers.
              {b.participants_detail ? ` (${b.participants_detail})` : ""}
            </span>
            {b.activity_language && <span>Tour en {b.activity_language}</span>}
            {b.price != null && (
              <span className="font-medium text-foreground">
                {fmtMoney(b.price, b.currency ?? "BRL")}
              </span>
            )}
          </p>
          {!compact && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {b.client_id ? (
                <Link
                  to="/clients/$id"
                  params={{ id: b.client_id }}
                  className="font-medium text-primary hover:underline"
                >
                  {b.lead_name ?? "Client"}
                </Link>
              ) : (
                <span className="font-medium">{b.lead_name}</span>
              )}
              {b.lead_language && (
                <span className="text-muted-foreground">parle {b.lead_language}</span>
              )}
              {b.lead_phone && (
                <a
                  className="text-primary"
                  href={`https://wa.me/${b.lead_phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Phone className="mr-1 inline h-3 w-3" />
                  {b.lead_phone}
                </a>
              )}
              {b.lead_email && (
                <a className="text-primary" href={`mailto:${b.lead_email}`}>
                  <MessageCircle className="mr-1 inline h-3 w-3" />
                  messagerie {PLATFORM_LABEL[b.platform] ?? b.platform}
                </a>
              )}
            </p>
          )}
          {b.notes && <p className="text-xs text-muted-foreground">{b.notes}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Select
            value={b.status}
            onValueChange={(v) =>
              void patch(b.id, { status: v as OtaBooking["status"] }, "Statut mis à jour")
            }
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OTA_BOOKING_STATUS_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {b.status === "realisee" && !b.review_requested && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => void patch(b.id, { review_requested: true }, "Avis demandé")}
            >
              <Star className="mr-1.5 h-3.5 w-3.5" />
              Avis demandé
            </Button>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            À venir ({upcoming.length})
          </h3>
          {upcoming.map(row)}
        </div>
      )}
      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Passées / annulées ({past.length})
          </h3>
          {past.map(row)}
        </div>
      )}
    </div>
  );
}

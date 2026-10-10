import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarClock,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Send,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EDITORIAL_KINDS,
  addDays,
  dayKey,
  extractCaption,
  fmtDayKey,
  fmtTime,
  fromLocalInput,
  normalizeStatus,
  rescheduleEditorial,
  rescheduleWhatsapp,
  setEditorialStatus,
  setWhatsappPostStatus,
  statusMeta,
  toLocalInput,
  todayKey,
} from "@/lib/ops/media";
import { fetchWhatsappPosts } from "@/lib/ops/ops";
import { supabase } from "@/integrations/supabase/client";

/*
 * « À poster aujourd'hui » (accueil admin) : tout ce qui doit sortir
 * aujourd'hui (heure de Rio) sur les 3 comptes Instagram et le groupe
 * WhatsApp, avec la légende à copier et les boutons Publié / Reporter.
 */

const TODAY_POSTS_KEY = ["today-posts"];

/** Clés à rafraîchir après une action (planning, accueil Lili, WhatsApp, cockpit, calendrier). */
const RELATED_KEYS = [
  TODAY_POSTS_KEY,
  ["media", "editorial-items"],
  ["my-plan"],
  ["wa-today"],
  ["ops", "whatsapp"],
  ["cockpit"],
  ["calendrier"],
];

type Source = "editorial" | "whatsapp";

type Row = {
  key: string;
  source: Source;
  id: string;
  at: string; // ISO
  group: string;
  format: string;
  title: string;
  status: string;
  statusLabel: string;
  statusTone: string;
  owner: string | null;
  notes: string | null;
  done: boolean; // publié / posté
  dropped: boolean; // abandonné / annulé
};

const GROUPS: { value: string; label: string }[] = [
  { value: "ig_afrolove", label: "@afrolove.brasil" },
  { value: "ig_conciergerie", label: "@jeitinho.conciergerie" },
  { value: "ig_media", label: "@jeitinho.fr · Lili" },
  { value: "whatsapp", label: "Groupe WhatsApp · Lili" },
  { value: "autre", label: "Autres" },
];

const WA_SLOT: Record<string, string> = {
  info_du_jour: "Info du jour",
  bon_plan: "Bon plan",
  sortie: "Sortie",
  extra: "Extra",
};

const WA_STATUS: Record<string, { label: string; tone: string }> = {
  brouillon: { label: "Brouillon", tone: "bg-muted text-muted-foreground" },
  valide: { label: "Prêt à poster", tone: "bg-sky-500/15 text-sky-700 dark:text-sky-300" },
  envoye: {
    label: "Publié",
    tone: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  },
  erreur: { label: "Erreur", tone: "bg-destructive/15 text-destructive" },
  annule: { label: "Annulé", tone: "bg-muted text-muted-foreground line-through" },
};

type EditorialRow = {
  id: string;
  planned_at: string;
  kind: string;
  title: string;
  owner: string | null;
  status: string;
  channel: string | null;
  notes: string | null;
};

/** Formats réseaux (les articles de blog et la prospection restent dans le planning). */
const SOCIAL_KINDS = ["story", "post", "carrousel", "reel", "reseaux"];

/** Début du jour `key` à Rio (UTC-3), en ISO. */
const rioStart = (key: string) => new Date(`${key}T00:00:00-03:00`).toISOString();

async function fetchTodayPosts(): Promise<Row[]> {
  const today = todayKey();
  const from = rioStart(addDays(today, -7));
  const to = rioStart(addDays(today, 1));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("editorial_items")
    .select("id,planned_at,kind,title,owner,status,channel,notes")
    .gte("planned_at", from)
    .lt("planned_at", to)
    .in("kind", SOCIAL_KINDS)
    .order("planned_at");
  if (error) throw new Error(error.message);
  const wa = await fetchWhatsappPosts(from, to);

  const editorial: Row[] = ((data ?? []) as EditorialRow[]).map((r) => {
    const status = normalizeStatus(r.status);
    const meta = statusMeta(status);
    return {
      key: `e:${r.id}`,
      source: "editorial",
      id: r.id,
      at: r.planned_at,
      group: GROUPS.some((g) => g.value === r.channel) ? (r.channel as string) : "autre",
      format: EDITORIAL_KINDS[r.kind] ?? r.kind,
      title: r.title,
      status,
      statusLabel: meta.label,
      statusTone: meta.tone,
      owner: r.owner,
      notes: r.notes,
      done: status === "publie",
      dropped: status === "abandonne",
    };
  });
  const whatsapp: Row[] = wa.map((p) => {
    const meta = WA_STATUS[p.status] ?? { label: p.status, tone: "bg-muted" };
    return {
      key: `w:${p.id}`,
      source: "whatsapp",
      id: p.id,
      at: p.scheduled_at,
      group: "whatsapp",
      format: WA_SLOT[p.slot] ?? p.slot,
      title:
        p.content
          .split("\n")
          .find((l) => l.trim())
          ?.trim() ?? "Post WhatsApp",
      status: p.status,
      statusLabel: meta.label,
      statusTone: meta.tone,
      owner: "Lili",
      notes: p.content,
      done: p.status === "envoye",
      dropped: p.status === "annule",
    };
  });
  return [...editorial, ...whatsapp].sort((a, b) => a.at.localeCompare(b.at));
}

function useRowActions(row: Row) {
  const qc = useQueryClient();
  const refresh = () => RELATED_KEYS.forEach((k) => qc.invalidateQueries({ queryKey: k }));
  const opts = (ok: string) => ({
    onSuccess: () => {
      toast.success(ok);
      refresh();
    },
    onError: (e: Error) => toast.error(`Échec : ${e.message}`),
  });
  const publish = useMutation({
    mutationFn: () =>
      row.source === "editorial"
        ? setEditorialStatus(row.id, "publie")
        : setWhatsappPostStatus(row.id, "envoye"),
    ...opts(`« ${row.title} » marqué publié.`),
  });
  const drop = useMutation({
    mutationFn: () =>
      row.source === "editorial"
        ? setEditorialStatus(row.id, "abandonne")
        : setWhatsappPostStatus(row.id, "annule"),
    ...opts(`« ${row.title} » abandonné.`),
  });
  const reschedule = useMutation({
    mutationFn: (iso: string) =>
      row.source === "editorial"
        ? rescheduleEditorial(row.id, iso)
        : rescheduleWhatsapp(row.id, iso),
    ...opts(`« ${row.title} » reporté.`),
  });
  return { publish, drop, reschedule };
}

function RescheduleBox({
  row,
  onSave,
  onCancel,
  pending,
}: {
  row: Row;
  onSave: (iso: string) => void;
  onCancel: () => void;
  pending: boolean;
}) {
  const [value, setValue] = useState(() => {
    // Par défaut : demain, même heure.
    const d = new Date(new Date(row.at).getTime() + 86_400_000).toISOString();
    return toLocalInput(d);
  });
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Input
        type="datetime-local"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-auto"
        aria-label="Nouvelle date et heure (heure de Rio)"
      />
      <Button
        size="sm"
        className="h-8"
        disabled={!value || pending}
        onClick={() => {
          const iso = fromLocalInput(value);
          if (iso) onSave(iso);
        }}
      >
        Valider
      </Button>
      <Button size="sm" variant="ghost" className="h-8" onClick={onCancel}>
        Annuler
      </Button>
    </div>
  );
}

function copyText(text: string) {
  navigator.clipboard.writeText(text).then(
    () => toast.success("Légende copiée."),
    () => toast.error("Impossible de copier (autorise le presse-papiers)."),
  );
}

function PostRow({ row, late }: { row: Row; late?: boolean }) {
  const [open, setOpen] = useState(false);
  const [moving, setMoving] = useState(false);
  const { publish, drop, reschedule } = useRowActions(row);
  const busy = publish.isPending || drop.isPending || reschedule.isPending;
  const caption = extractCaption(row.notes);
  const isWa = row.source === "whatsapp";

  return (
    <li className={`py-2.5 ${row.done ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span
          className={`w-[4.5rem] flex-shrink-0 text-xs tabular-nums ${
            !row.done && new Date(row.at).getTime() < Date.now()
              ? "font-semibold text-destructive"
              : "text-muted-foreground"
          }`}
          title={!row.done && new Date(row.at).getTime() < Date.now() ? "Heure passée" : undefined}
        >
          {late ? `${fmtDayKey(dayKey(row.at), { weekday: "short", day: "numeric" })} ` : ""}
          {fmtTime(row.at)}
        </span>
        <Badge variant="outline" className="text-[10px]">
          {row.format}
        </Badge>
        {late && (
          <span className="text-[11px] text-muted-foreground">
            {GROUPS.find((g) => g.value === row.group)?.label}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm">
          {row.source === "editorial" ? (
            <Link
              to="/contenus"
              search={{ id: row.id }}
              className="hover:underline"
              title="Ouvrir la fiche"
            >
              {row.title}
            </Link>
          ) : (
            row.title
          )}
        </span>
        <span className={`rounded px-2 py-0.5 text-[11px] font-medium ${row.statusTone}`}>
          {row.statusLabel}
        </span>
        {row.owner && row.owner !== "Rafael" && (
          <span className="text-xs font-medium text-muted-foreground">{row.owner}</span>
        )}
      </div>

      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 pl-0 sm:pl-[5rem]">
        {row.notes && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <ChevronUp className="mr-1 h-3 w-3" />
            ) : (
              <ChevronDown className="mr-1 h-3 w-3" />
            )}
            {isWa ? "Texte du post" : "Légende et consignes"}
          </Button>
        )}
        {!row.done && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={busy}
            onClick={() => publish.mutate()}
          >
            <Check className="mr-1 h-3 w-3" />
            Publié
          </Button>
        )}
        {!row.done && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            disabled={busy}
            onClick={() => setMoving((v) => !v)}
          >
            <CalendarClock className="mr-1 h-3 w-3" />
            Reporter
          </Button>
        )}
        {late && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs text-destructive"
            disabled={busy}
            onClick={() => drop.mutate()}
          >
            <X className="mr-1 h-3 w-3" />
            Abandonner
          </Button>
        )}
      </div>

      {moving && (
        <RescheduleBox
          row={row}
          pending={reschedule.isPending}
          onCancel={() => setMoving(false)}
          onSave={(iso) => reschedule.mutate(iso, { onSuccess: () => setMoving(false) })}
        />
      )}

      {open && row.notes && (
        <div className="mt-2 space-y-2 rounded-md bg-muted/50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              {isWa
                ? "Texte à coller dans le groupe."
                : caption
                  ? "Le bouton copie uniquement la légende."
                  : "Légende non repérée : le bouton copie toutes les notes."}
            </p>
            <Button
              size="sm"
              variant="secondary"
              className="h-7 px-2 text-xs"
              onClick={() => copyText(caption ?? row.notes!)}
            >
              <Copy className="mr-1 h-3 w-3" />
              Copier
            </Button>
          </div>
          <pre className="max-h-[24rem] overflow-auto whitespace-pre-wrap font-sans text-xs leading-relaxed">
            {row.notes}
          </pre>
        </div>
      )}
    </li>
  );
}

/** Bloc « À poster aujourd'hui » de l'accueil admin. */
export function TodayPosts() {
  const {
    data = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: TODAY_POSTS_KEY,
    queryFn: fetchTodayPosts,
    refetchInterval: 120_000,
  });
  const today = todayKey();
  const now = Date.now();

  const todayRows = data.filter((r) => dayKey(r.at) === today && !r.dropped);
  const lateRows = data.filter(
    (r) => !r.done && !r.dropped && dayKey(r.at) < today && new Date(r.at).getTime() < now,
  );
  const toPost = todayRows.filter((r) => !r.done).length;
  const published = todayRows.filter((r) => r.done).length;

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold">À poster aujourd'hui</h2>
        </div>
        <span className="text-xs text-muted-foreground">
          {toPost} à poster aujourd'hui · {published} publié{published > 1 ? "s" : ""}
        </span>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <p className="text-sm text-destructive">
          {(error as Error).message}{" "}
          <Button size="sm" variant="ghost" onClick={() => refetch()}>
            Réessayer
          </Button>
        </p>
      )}

      {lateRows.length > 0 && (
        <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-destructive">
            <AlertTriangle className="h-3.5 w-3.5" />
            En retard · {lateRows.length} (7 derniers jours)
          </p>
          <ul className="divide-y divide-border/60">
            {lateRows.map((r) => (
              <PostRow key={r.key} row={r} late />
            ))}
          </ul>
        </div>
      )}

      {!isLoading && !error && todayRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Rien à poster aujourd'hui.</p>
      ) : (
        <div className="space-y-4">
          {GROUPS.map((g) => {
            const rows = todayRows.filter((r) => r.group === g.value);
            if (!rows.length) return null;
            return (
              <div key={g.value}>
                <p className="tracked text-[10px] text-muted-foreground">
                  {g.label} · {rows.filter((r) => !r.done).length}/{rows.length}
                </p>
                <ul className="divide-y divide-border/60">
                  {rows.map((r) => (
                    <PostRow key={r.key} row={r} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

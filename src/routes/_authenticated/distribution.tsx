import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Plus, Store } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  OTA_STATUS_LABELS,
  fetchExperienceOptions,
  fetchOtaListings,
  fmtDateTime,
  saveOtaListing,
  type OtaListing,
} from "@/lib/ops/ops";
import { OtaBookingsList } from "@/components/ops/ota-bookings";

export const Route = createFileRoute("/_authenticated/distribution")({
  component: DistributionPage,
  head: () => ({ meta: [{ title: "Distribution — JEITINHO" }] }),
});

const STATUS_ORDER: OtaListing["status"][] = [
  "a_corriger",
  "en_examen",
  "brouillon",
  "en_ligne",
  "refuse",
  "archive",
];
const STATUS_TONE: Record<OtaListing["status"], string> = {
  a_corriger: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  en_examen: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  brouillon: "bg-muted text-muted-foreground",
  en_ligne: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  refuse: "bg-destructive/15 text-destructive",
  archive: "bg-muted text-muted-foreground",
};

function DistributionPage() {
  const qc = useQueryClient();
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({ queryKey: ["ops", "ota"], queryFn: fetchOtaListings });
  const { data: experiences = [] } = useQuery({
    queryKey: ["ops", "experience-options"],
    queryFn: fetchExperienceOptions,
  });
  const [creating, setCreating] = useState(false);
  const save = async (row: Partial<OtaListing> & { title: string }) => {
    try {
      await saveOtaListing({ ...row, last_checked_at: new Date().toISOString() });
      toast.success("Fiche enregistrée");
      qc.invalidateQueries({ queryKey: ["ops", "ota"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const sorted = [...data].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status),
  );
  const online = data.filter((l) => l.status === "en_ligne").length;

  return (
    <PageShell
      eyebrow="Commercial"
      title="Distribution"
      description="Fiches sur GetYourGuide et autres plateformes : statut, problème signalé, réservations et avis. L'agent GetYourGuide met cette page à jour."
      actions={
        <Button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouvelle fiche
        </Button>
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">En ligne</p>
          <p className="mt-2 text-2xl font-semibold">{online}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">À corriger / en examen</p>
          <p className="mt-2 text-2xl font-semibold">
            {data.filter((l) => l.status === "a_corriger" || l.status === "en_examen").length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Réservations cumulées</p>
          <p className="mt-2 text-2xl font-semibold">
            {data.reduce((s, l) => s + l.bookings_count, 0)}
          </p>
        </Card>
      </div>
      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold">Réservations clients</h2>
        <OtaBookingsList />
      </section>

      <h2 className="mb-3 text-base font-semibold">Fiches</h2>
      {creating && (
        <ListingForm
          experiences={experiences}
          onSave={(r) => save(r).then(() => setCreating(false))}
          onCancel={() => setCreating(false)}
        />
      )}
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <Card className="border-destructive/40 p-6 text-sm">{(error as Error).message}</Card>
      )}
      <div className="space-y-3">
        {sorted.map((l) => (
          <ListingCard key={l.id} listing={l} experiences={experiences} onSave={save} />
        ))}
        {!isLoading && data.length === 0 && (
          <Card className="border-dashed p-16 text-center">
            <Store className="mx-auto mb-4 h-8 w-8 text-primary" />
            <p className="text-sm text-muted-foreground">Aucune fiche pour l'instant.</p>
          </Card>
        )}
      </div>
    </PageShell>
  );
}

function ListingCard({
  listing,
  experiences,
  onSave,
}: {
  listing: OtaListing;
  experiences: { id: string; title: string }[];
  onSave: (r: Partial<OtaListing> & { title: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const exp = experiences.find((e) => e.id === listing.experience_id);
  if (editing)
    return (
      <ListingForm
        listing={listing}
        experiences={experiences}
        onSave={(r) => onSave(r).then(() => setEditing(false))}
        onCancel={() => setEditing(false)}
      />
    );
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[listing.status]}`}
            >
              {OTA_STATUS_LABELS[listing.status]}
            </span>
            <Badge variant="outline">{listing.platform}</Badge>
            {exp && <span className="text-xs text-muted-foreground">Expérience : {exp.title}</span>}
          </div>
          <h3 className="text-sm font-medium">{listing.title}</h3>
          {listing.issue && (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              Problème : {listing.issue}
            </p>
          )}
          {listing.notes && <p className="mt-1 text-xs text-muted-foreground">{listing.notes}</p>}
          <p className="mt-2 text-xs text-muted-foreground">
            {listing.bookings_count} réservation(s) · {listing.reviews_count} avis
            {listing.rating ? ` · ${listing.rating}/5` : ""} · vérifié{" "}
            {fmtDateTime(listing.last_checked_at)}
          </p>
        </div>
        <div className="flex gap-2">
          {listing.url && (
            <a href={listing.url} target="_blank" rel="noreferrer">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                Voir
              </Button>
            </a>
          )}
          <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
            Modifier
          </Button>
        </div>
      </div>
    </Card>
  );
}

function ListingForm({
  listing,
  experiences,
  onSave,
  onCancel,
}: {
  listing?: OtaListing;
  experiences: { id: string; title: string }[];
  onSave: (r: Partial<OtaListing> & { title: string }) => Promise<void>;
  onCancel: () => void;
}) {
  const [f, setF] = useState({
    title: listing?.title ?? "",
    platform: listing?.platform ?? "getyourguide",
    status: listing?.status ?? "brouillon",
    experience_id: listing?.experience_id ?? "",
    url: listing?.url ?? "",
    issue: listing?.issue ?? "",
    bookings_count: String(listing?.bookings_count ?? 0),
    reviews_count: String(listing?.reviews_count ?? 0),
    rating: listing?.rating != null ? String(listing.rating) : "",
    notes: listing?.notes ?? "",
  });
  return (
    <Card className="mb-3 grid gap-3 p-4 sm:grid-cols-2">
      <Input
        placeholder="Titre de la fiche"
        value={f.title}
        onChange={(e) => setF({ ...f, title: e.target.value })}
      />
      <Input
        placeholder="Plateforme"
        value={f.platform}
        onChange={(e) => setF({ ...f, platform: e.target.value })}
      />
      <Select
        value={f.status}
        onValueChange={(v) => setF({ ...f, status: v as OtaListing["status"] })}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(OTA_STATUS_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={f.experience_id || "none"}
        onValueChange={(v) => setF({ ...f, experience_id: v === "none" ? "" : v })}
      >
        <SelectTrigger>
          <SelectValue placeholder="Expérience liée" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Aucune</SelectItem>
          {experiences.map((e) => (
            <SelectItem key={e.id} value={e.id}>
              {e.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        placeholder="URL de la fiche"
        value={f.url}
        onChange={(e) => setF({ ...f, url: e.target.value })}
      />
      <Input
        placeholder="Problème signalé"
        value={f.issue}
        onChange={(e) => setF({ ...f, issue: e.target.value })}
      />
      <div className="grid grid-cols-3 gap-2">
        <Input
          type="number"
          placeholder="Résas"
          value={f.bookings_count}
          onChange={(e) => setF({ ...f, bookings_count: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Avis"
          value={f.reviews_count}
          onChange={(e) => setF({ ...f, reviews_count: e.target.value })}
        />
        <Input
          type="number"
          step="0.1"
          placeholder="Note"
          value={f.rating}
          onChange={(e) => setF({ ...f, rating: e.target.value })}
        />
      </div>
      <Textarea
        placeholder="Notes"
        value={f.notes}
        onChange={(e) => setF({ ...f, notes: e.target.value })}
      />
      <div className="flex gap-2 sm:col-span-2">
        <Button
          onClick={() => {
            if (!f.title) return toast.error("Titre obligatoire");
            void onSave({
              id: listing?.id,
              title: f.title,
              platform: f.platform,
              status: f.status as OtaListing["status"],
              experience_id: f.experience_id || null,
              url: f.url || null,
              issue: f.issue || null,
              bookings_count: Number(f.bookings_count || 0),
              reviews_count: Number(f.reviews_count || 0),
              rating: f.rating ? Number(f.rating) : null,
              notes: f.notes || null,
            });
          }}
        >
          Enregistrer
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </Card>
  );
}

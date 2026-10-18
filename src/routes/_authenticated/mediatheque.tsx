import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ExternalLink, FileText, Film, Link2, Upload } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  MEDIA_MAX_BYTES,
  addDriveLink,
  fetchMedia,
  parseTags,
  uploadMedia,
  type MediaItem,
} from "@/lib/ops/cm";

export const Route = createFileRoute("/_authenticated/mediatheque")({
  component: MediaLibraryPage,
  head: () => ({ meta: [{ title: "Médiathèque — JEITINHO" }] }),
});

const KINDS = [
  { value: "", label: "Tout" },
  { value: "photo", label: "Photos" },
  { value: "video", label: "Vidéos" },
  { value: "document", label: "Documents" },
];

function size(n: number | null) {
  if (!n) return "";
  return n > 1_048_576 ? `${(n / 1_048_576).toFixed(1)} Mo` : `${Math.round(n / 1024)} Ko`;
}

function Tile({ m }: { m: MediaItem }) {
  const href = m.url ?? m.drive_url ?? "#";
  return (
    <Card className="overflow-hidden">
      <a href={href} target="_blank" rel="noreferrer" className="block aspect-square bg-muted/40">
        {m.kind === "photo" && m.url ? (
          <img
            src={m.url}
            alt={m.caption ?? m.file_name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : m.kind === "video" && m.url ? (
          <video src={m.url} muted preload="metadata" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            {m.kind === "video" ? <Film className="h-8 w-8" /> : <FileText className="h-8 w-8" />}
          </div>
        )}
      </a>
      <div className="space-y-1 p-2">
        <p className="truncate text-xs font-medium" title={m.file_name}>
          {m.caption || m.file_name}
        </p>
        {m.tags?.length ? (
          <p className="truncate text-[11px] text-muted-foreground">#{m.tags.join(" #")}</p>
        ) : null}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{m.drive_url && !m.url ? "Lien Drive" : size(m.size_bytes)}</span>
          {m.url ? (
            <a
              href={m.url}
              download={m.file_name}
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <Download className="h-3 w-3" /> Télécharger
            </a>
          ) : m.drive_url ? (
            <a
              href={m.drive_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" /> Ouvrir
            </a>
          ) : null}
        </div>
      </div>
    </Card>
  );
}

function MediaLibraryPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [pending, setPending] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [driveOpen, setDriveOpen] = useState(false);
  const [drive, setDrive] = useState({ name: "", url: "" });

  const { data = [], isLoading, error } = useQuery({ queryKey: ["media"], queryFn: fetchMedia });
  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return data.filter(
      (m) =>
        (!kind || m.kind === kind) &&
        (!needle ||
          [m.file_name, m.caption ?? "", ...(m.tags ?? [])].some((t) =>
            t.toLowerCase().includes(needle),
          )),
    );
  }, [data, kind, q]);

  const upload = useMutation({
    mutationFn: async () => {
      for (const f of pending) await uploadMedia(user!.id, f, { caption, tags: parseTags(tags) });
    },
    onSuccess: () => {
      toast.success(pending.length > 1 ? `${pending.length} fichiers ajoutés.` : "Fichier ajouté.");
      setPending([]);
      setCaption("");
      setTags("");
      qc.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (e: Error) => {
      toast.error(e.message);
      qc.invalidateQueries({ queryKey: ["media"] });
    },
  });
  const addLink = useMutation({
    mutationFn: () =>
      addDriveLink(user!.id, {
        name: drive.name.trim(),
        driveUrl: drive.url.trim(),
        caption,
        tags: parseTags(tags),
      }),
    onSuccess: () => {
      toast.success("Lien ajouté.");
      setDrive({ name: "", url: "" });
      setDriveOpen(false);
      qc.invalidateQueries({ queryKey: ["media"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const pick = (files: FileList | null) => {
    const list = Array.from(files ?? []);
    const tooBig = list.filter((f) => f.size > MEDIA_MAX_BYTES);
    if (tooBig.length)
      toast.error(`${tooBig.length} fichier(s) de plus de 50 Mo ignoré(s) : ajoute un lien Drive.`);
    setPending(list.filter((f) => f.size <= MEDIA_MAX_BYTES));
  };

  return (
    <PageShell
      eyebrow="Photos, vidéos, visuels"
      title="Médiathèque"
      description="Une seule bibliothèque pour l'équipe : dépose tes créations, récupère les photos et vidéos des soirées."
      actions={
        <>
          <Button variant="outline" onClick={() => setDriveOpen(true)}>
            <Link2 className="mr-2 h-3.5 w-3.5" />
            Lien Drive
          </Button>
          <Button className="btn-primary" onClick={() => fileInput.current?.click()}>
            <Upload className="mr-2 h-3.5 w-3.5" />
            Ajouter des fichiers
          </Button>
        </>
      }
    >
      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/*,video/*,application/pdf"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />

      {pending.length > 0 && (
        <Card className="mb-6 space-y-3 p-4">
          <p className="text-sm">
            {pending.length} fichier{pending.length > 1 ? "s" : ""} prêt
            {pending.length > 1 ? "s" : ""} :{" "}
            <span className="text-muted-foreground">{pending.map((f) => f.name).join(", ")}</span>
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="m-caption">Description</Label>
              <Input
                id="m-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Ex. AFRO LOVE #1 · piste de danse"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="m-tags">Tags (séparés par des virgules)</Label>
              <Input
                id="m-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="afrolove, soiree, story"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              className="btn-primary"
              disabled={upload.isPending}
              onClick={() => upload.mutate()}
            >
              {upload.isPending ? "Envoi…" : "Envoyer"}
            </Button>
            <Button variant="ghost" onClick={() => setPending([])}>
              Annuler
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {KINDS.map((k) => (
          <Button
            key={k.value}
            size="sm"
            variant={kind === k.value ? "default" : "outline"}
            onClick={() => setKind(k.value)}
          >
            {k.label}
          </Button>
        ))}
        <Input
          className="w-full sm:ml-auto sm:w-64"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Chercher (nom, tag)…"
        />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : error ? (
        <Card className="border-destructive/40 p-4 text-sm">{(error as Error).message}</Card>
      ) : shown.length === 0 ? (
        <Card className="border-dashed p-12 text-center text-sm text-muted-foreground">
          {data.length === 0
            ? "La médiathèque est vide. Ajoute les premières photos et vidéos."
            : "Rien ne correspond."}
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {shown.map((m) => (
            <Tile key={m.id} m={m} />
          ))}
        </div>
      )}

      <Dialog open={driveOpen} onOpenChange={setDriveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un lien Drive</DialogTitle>
            <DialogDescription>
              Pour les vidéos de plus de 50 Mo : partage-la sur Drive et colle le lien ici.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="d-name">Nom</Label>
              <Input
                id="d-name"
                value={drive.name}
                onChange={(e) => setDrive((d) => ({ ...d, name: e.target.value }))}
                placeholder="Aftermovie AFRO LOVE #1"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="d-url">Lien</Label>
              <Input
                id="d-url"
                value={drive.url}
                onChange={(e) => setDrive((d) => ({ ...d, url: e.target.value }))}
                placeholder="https://drive.google.com/…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              className="btn-primary"
              disabled={addLink.isPending || !drive.name.trim() || !drive.url.trim()}
              onClick={() => addLink.mutate()}
            >
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}

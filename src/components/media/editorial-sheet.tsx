import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Link2, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  EDITORIAL_KINDS,
  EDITORIAL_OWNERS,
  EDITORIAL_PRIORITIES,
  EDITORIAL_STATUSES,
  deleteEditorialItem,
  fromLocalInput,
  saveEditorialItem,
  toLocalInput,
  type EditorialInput,
  type EditorialItem,
} from "@/lib/ops/media";
import { EDITORIAL_KEY } from "./use-media";
import { ArticlePicker } from "./article-picker";

const NONE = "__none";

type Form = {
  title: string;
  kind: string;
  status: string;
  owner: string;
  priority: string;
  collection: string;
  channel: string;
  planned_at: string; // datetime-local, heure de Rio
  deadline: string;
  url: string;
  notes: string;
  external_ref: string;
};

function toForm(item: Partial<EditorialItem> | null): Form {
  return {
    title: item?.title ?? "",
    kind: item?.kind ?? "article",
    status: item?.status ?? "idee",
    owner: item?.owner ?? "",
    priority: item?.priority ?? "Moyenne",
    collection: item?.collection ?? "",
    channel: item?.channel ?? "",
    planned_at: toLocalInput(item?.planned_at ?? null),
    deadline: item?.deadline ?? "",
    url: item?.url ?? "",
    notes: item?.notes ?? "",
    external_ref: item?.external_ref ?? "",
  };
}

const orNull = (v: string) => (v.trim() ? v.trim() : null);

export function EditorialSheet({
  open,
  onOpenChange,
  item,
  defaults,
  collections,
  channels,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Item à éditer ; null = création. */
  item: EditorialItem | null;
  /** Valeurs initiales pour une création (ex. jour cliqué). */
  defaults?: Partial<EditorialItem>;
  collections: string[];
  channels: string[];
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form>(() => toForm(item ?? defaults ?? null));
  const [picking, setPicking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(toForm(item ?? defaults ?? null));
      setPicking(false);
      setConfirmDelete(false);
    }
  }, [open, item, defaults]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const kinds = { ...EDITORIAL_KINDS };
  if (form.kind && !kinds[form.kind]) kinds[form.kind] = form.kind;
  const owners: string[] = [...EDITORIAL_OWNERS];
  if (form.owner && !owners.includes(form.owner)) owners.push(form.owner);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) return toast.error("Le titre est obligatoire.");
    const row: EditorialInput = {
      ...(item ? { id: item.id } : {}),
      title: form.title.trim(),
      kind: form.kind,
      status: form.status,
      owner: orNull(form.owner),
      priority: orNull(form.priority),
      collection: orNull(form.collection),
      channel: orNull(form.channel),
      planned_at: fromLocalInput(form.planned_at),
      deadline: orNull(form.deadline),
      url: orNull(form.url),
      notes: orNull(form.notes),
      external_ref: orNull(form.external_ref),
    };
    setSaving(true);
    try {
      await saveEditorialItem(row);
      toast.success(item ? "Contenu mis à jour" : "Contenu ajouté au planning");
      qc.invalidateQueries({ queryKey: EDITORIAL_KEY });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!item) return;
    try {
      await deleteEditorialItem(item.id);
      toast.success("Contenu supprimé");
      qc.invalidateQueries({ queryKey: EDITORIAL_KEY });
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{item ? "Modifier le contenu" : "Nouveau contenu"}</SheetTitle>
          <SheetDescription>
            {item?.external_ref ? `Réf. ${item.external_ref}` : "Planning éditorial du média"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ed-title">Titre</Label>
            <Input
              id="ed-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.kind} onValueChange={(v) => set("kind", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(kinds).map(([v, l]) => (
                    <SelectItem key={v} value={v}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Statut</Label>
              <Select value={form.status} onValueChange={(v) => set("status", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDITORIAL_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Responsable</Label>
              <Select
                value={form.owner || NONE}
                onValueChange={(v) => set("owner", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Non attribué</SelectItem>
                  {owners.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priorité</Label>
              <Select
                value={form.priority || NONE}
                onValueChange={(v) => set("priority", v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>—</SelectItem>
                  {EDITORIAL_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-planned">Publication prévue</Label>
              <Input
                id="ed-planned"
                type="datetime-local"
                value={form.planned_at}
                onChange={(e) => set("planned_at", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-deadline">Deadline</Label>
              <Input
                id="ed-deadline"
                type="date"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ed-collection">Collection</Label>
              <Input
                id="ed-collection"
                list="ed-collections"
                value={form.collection}
                onChange={(e) => set("collection", e.target.value)}
              />
              <datalist id="ed-collections">
                {collections.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ed-channel">Canal</Label>
              <Input
                id="ed-channel"
                list="ed-channels"
                value={form.channel}
                onChange={(e) => set("channel", e.target.value)}
                placeholder="Blog, Instagram, newsletter…"
              />
              <datalist id="ed-channels">
                {["Blog", "Instagram", "Newsletter", "WhatsApp", ...channels]
                  .filter((c, i, a) => a.indexOf(c) === i)
                  .map((c) => (
                    <option key={c} value={c} />
                  ))}
              </datalist>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="ed-url">URL publiée</Label>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setPicking((p) => !p)}
              >
                <Link2 className="mr-1 h-3.5 w-3.5" />
                {picking ? "Fermer" : "Lier à un article publié"}
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                id="ed-url"
                type="url"
                value={form.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://blog.jeitinho.fr/blog/…"
              />
              {form.url && (
                <a href={form.url} target="_blank" rel="noreferrer" aria-label="Ouvrir l'article">
                  <Button type="button" variant="outline" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
            {picking && (
              <ArticlePicker
                currentUrl={form.url}
                onPick={(a) => {
                  setForm((f) => ({ ...f, url: a.link, status: "publie" }));
                  setPicking(false);
                  toast.message(
                    "Article lié : statut passé à « Publié ». Enregistrez pour valider.",
                  );
                }}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ed-notes">Notes</Label>
            <Textarea
              id="ed-notes"
              rows={4}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ed-ref">Référence externe</Label>
            <Input
              id="ed-ref"
              value={form.external_ref}
              onChange={(e) => set("external_ref", e.target.value)}
              placeholder="ex. PRJ_20261005_01"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
            {item ? (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="destructive" onClick={remove}>
                    Confirmer la suppression
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Annuler
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Supprimer
                </Button>
              )
            ) : (
              <span />
            )}
            <Button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Enregistrement…" : "Enregistrer"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export type ExperienceValues = {
  title: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  price_from: number | null;
  currency: string;
  duration: string | null;
  location: string | null;
  cover_image_url: string | null;
  tags: string[];
  seo_title: string | null;
  seo_description: string | null;
  is_published: boolean;
};

export function ExperienceForm({
  initial,
  onSubmit,
}: {
  initial?: Partial<ExperienceValues>;
  onSubmit: (v: ExperienceValues) => Promise<void>;
}) {
  const [v, setV] = useState<ExperienceValues>({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    short_description: initial?.short_description ?? "",
    description: initial?.description ?? "",
    price_from: initial?.price_from ?? null,
    currency: initial?.currency ?? "EUR",
    duration: initial?.duration ?? "",
    location: initial?.location ?? "",
    cover_image_url: initial?.cover_image_url ?? "",
    tags: initial?.tags ?? [],
    seo_title: initial?.seo_title ?? "",
    seo_description: initial?.seo_description ?? "",
    is_published: initial?.is_published ?? false,
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ExperienceValues>(k: K, val: ExperienceValues[K]) =>
    setV((p) => ({ ...p, [k]: val }));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        await onSubmit({ ...v, slug: v.slug || slugify(v.title) });
        setSaving(false);
      }}
      className="grid gap-6 lg:grid-cols-3"
    >
      <Card className="border-border/60 space-y-4 p-6 lg:col-span-2">
        <div className="space-y-2">
          <Label>Titre</Label>
          <Input required value={v.title} onChange={(e) => set("title", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Slug</Label>
          <Input value={v.slug} onChange={(e) => set("slug", e.target.value)} placeholder={slugify(v.title)} />
        </div>
        <div className="space-y-2">
          <Label>Description courte</Label>
          <Textarea rows={2} value={v.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Description complète</Label>
          <Textarea rows={8} value={v.description ?? ""} onChange={(e) => set("description", e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2 sm:col-span-1">
            <Label>Prix à partir de</Label>
            <Input
              type="number"
              step="0.01"
              value={v.price_from ?? ""}
              onChange={(e) => set("price_from", e.target.value ? Number(e.target.value) : null)}
            />
          </div>
          <div className="space-y-2">
            <Label>Devise</Label>
            <Input value={v.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} />
          </div>
          <div className="space-y-2">
            <Label>Durée</Label>
            <Input placeholder="ex: 3 heures" value={v.duration ?? ""} onChange={(e) => set("duration", e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Lieu</Label>
          <Input placeholder="ex: Rio de Janeiro" value={v.location ?? ""} onChange={(e) => set("location", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>URL image de couverture</Label>
          <Input value={v.cover_image_url ?? ""} onChange={(e) => set("cover_image_url", e.target.value)} placeholder="https://…" />
        </div>
        <div className="space-y-2">
          <Label>Tags (séparés par virgule)</Label>
          <Input
            value={v.tags.join(", ")}
            onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
          />
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/60 p-6">
          <p className="tracked mb-4 text-[10px] text-muted-foreground">Publication</p>
          <div className="flex items-center justify-between">
            <div>
              <Label>Publiée</Label>
              <p className="text-xs text-muted-foreground">Visible sur jeitinho.fr</p>
            </div>
            <Switch checked={v.is_published} onCheckedChange={(c) => set("is_published", c)} />
          </div>
          <Button type="submit" disabled={saving} className="btn-primary mt-6 w-full">
            {saving ? "…" : "Enregistrer"}
          </Button>
        </Card>
        <Card className="border-border/60 space-y-4 p-6">
          <p className="tracked text-[10px] text-muted-foreground">SEO</p>
          <div className="space-y-2">
            <Label>Titre SEO</Label>
            <Input value={v.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Description SEO</Label>
            <Textarea rows={3} value={v.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} />
          </div>
        </Card>
      </div>
    </form>
  );
}
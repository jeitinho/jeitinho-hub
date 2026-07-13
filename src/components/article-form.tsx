import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export type ArticleValues = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  cover_image_url: string | null;
  seo_title: string | null;
  seo_description: string | null;
  status:
    | "draft"
    | "writing"
    | "to_review"
    | "changes_requested"
    | "approved"
    | "ready_to_publish"
    | "scheduled"
    | "published"
    | "archived";
  tags: string[];
  scheduled_at: string | null;
  published_at: string | null;
};

export function ArticleForm({
  initial,
  onSubmit,
}: {
  initial?: Partial<ArticleValues>;
  onSubmit: (v: ArticleValues) => Promise<unknown>;
}) {
  const [v, setV] = useState<ArticleValues>({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    excerpt: initial?.excerpt ?? "",
    content: initial?.content ?? "",
    cover_image_url: initial?.cover_image_url ?? "",
    seo_title: initial?.seo_title ?? "",
    seo_description: initial?.seo_description ?? "",
    status: (initial?.status as ArticleValues["status"]) ?? "draft",
    tags: initial?.tags ?? [],
    scheduled_at: initial?.scheduled_at ?? null,
    published_at: initial?.published_at ?? null,
  });
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ArticleValues>(k: K, val: ArticleValues[K]) => setV((p) => ({ ...p, [k]: val }));

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setSaving(true);
        const finalV = { ...v, slug: v.slug || slugify(v.title) };
        if (finalV.status === "published" && !finalV.published_at) finalV.published_at = new Date().toISOString();
        await onSubmit(finalV);
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
          <Label>Résumé</Label>
          <Textarea rows={2} value={v.excerpt ?? ""} onChange={(e) => set("excerpt", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Contenu (Markdown supporté)</Label>
          <Textarea rows={18} value={v.content ?? ""} onChange={(e) => set("content", e.target.value)} className="font-mono text-sm" />
        </div>
        <div className="space-y-2">
          <Label>Image de couverture (URL)</Label>
          <Input value={v.cover_image_url ?? ""} onChange={(e) => set("cover_image_url", e.target.value)} />
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/60 space-y-4 p-6">
          <p className="tracked text-[10px] text-muted-foreground">Publication</p>
          <div className="space-y-2">
            <Label>Statut</Label>
            <Select value={v.status} onValueChange={(x) => set("status", x as ArticleValues["status"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="writing">En rédaction</SelectItem>
                <SelectItem value="to_review">À relire</SelectItem>
                <SelectItem value="changes_requested">Corrections demandées</SelectItem>
                <SelectItem value="approved">Validé</SelectItem>
                <SelectItem value="ready_to_publish">Prêt à publier</SelectItem>
                <SelectItem value="scheduled">Programmé</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {v.status === "scheduled" && (
            <div className="space-y-2">
              <Label>Date de programmation</Label>
              <Input
                type="datetime-local"
                value={v.scheduled_at ? v.scheduled_at.slice(0, 16) : ""}
                onChange={(e) => set("scheduled_at", e.target.value ? new Date(e.target.value).toISOString() : null)}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label>Tags (séparés par virgule)</Label>
            <Input value={v.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </div>
          <Button type="submit" disabled={saving} className="btn-primary w-full">
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
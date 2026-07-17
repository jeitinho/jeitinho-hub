import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function extractText(node: unknown): string {
  if (!node || typeof node !== "object") return "";
  const n = node as { text?: string; content?: unknown[] };
  let out = "";
  if (typeof n.text === "string") out += n.text + " ";
  if (Array.isArray(n.content)) for (const c of n.content) out += extractText(c);
  return out;
}
export function computeReadingTime(body: unknown): number {
  const words = extractText(body).trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

export type ArticleValues = {
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  body_json: unknown;
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
    | "archived"
    | "deleted";
  tags: string[];
  scheduled_at: string | null;
  published_at: string | null;
  category_id: string | null;
  author_id: string | null;
  reading_time_min: number | null;
};

export function ArticleForm({
  initial,
  onSubmit,
}: {
  initial?: Partial<ArticleValues>;
  onSubmit: (v: ArticleValues) => Promise<unknown>;
}) {
  const { user, isAdmin } = useAuth();
  const [v, setV] = useState<ArticleValues>({
    title: initial?.title ?? "",
    slug: initial?.slug ?? "",
    excerpt: initial?.excerpt ?? "",
    content: initial?.content ?? "",
    body_json: initial?.body_json ?? { type: "doc", content: [{ type: "paragraph" }] },
    cover_image_url: initial?.cover_image_url ?? "",
    seo_title: initial?.seo_title ?? "",
    seo_description: initial?.seo_description ?? "",
    status: (initial?.status as ArticleValues["status"]) ?? "draft",
    tags: initial?.tags ?? [],
    scheduled_at: initial?.scheduled_at ?? null,
    published_at: initial?.published_at ?? null,
    category_id: initial?.category_id ?? null,
    author_id: initial?.author_id ?? null,
    reading_time_min: initial?.reading_time_min ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [authors, setAuthors] = useState<{ id: string; name: string; user_id: string | null }[]>([]);

  const set = <K extends keyof ArticleValues>(k: K, val: ArticleValues[K]) => setV((p) => ({ ...p, [k]: val }));

  useEffect(() => {
    supabase.from("content_categories").select("id,name").order("sort_order").then(({ data }) => {
      setCategories((data ?? []) as { id: string; name: string }[]);
    });
    supabase.from("authors").select("id,name,user_id").eq("is_active", true).order("name").then(({ data }) => {
      setAuthors((data ?? []) as { id: string; name: string; user_id: string | null }[]);
    });
  }, []);

  // Auto-assign current user's author if not set
  useEffect(() => {
    if (v.author_id || !user || authors.length === 0) return;
    const mine = authors.find((a) => a.user_id === user.id);
    if (mine) setV((p) => ({ ...p, author_id: mine.id }));
  }, [user, authors, v.author_id]);

  const readingTime = useMemo(() => computeReadingTime(v.body_json), [v.body_json]);
  const currentAuthor = authors.find((a) => a.id === v.author_id);

  const canPublish = v.category_id && v.author_id;
  const publishBlocked =
    (v.status === "ready_to_publish" || v.status === "published" || v.status === "scheduled") && !canPublish;

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (publishBlocked) return;
        setSaving(true);
        const finalV = {
          ...v,
          slug: v.slug || slugify(v.title),
          reading_time_min: readingTime,
        };
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
          <Label>Contenu</Label>
          <TiptapEditor value={v.body_json} onChange={(json) => set("body_json", json)} />
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
          <div className="space-y-2">
            <Label>Catégorie{!v.category_id && <span className="text-destructive"> *</span>}</Label>
            <Select value={v.category_id ?? ""} onValueChange={(x) => set("category_id", x || null)}>
              <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Auteur</Label>
            {isAdmin ? (
              <Select value={v.author_id ?? ""} onValueChange={(x) => set("author_id", x || null)}>
                <SelectTrigger><SelectValue placeholder="Sélectionner…" /></SelectTrigger>
                <SelectContent>
                  {authors.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input readOnly value={currentAuthor?.name ?? "—"} />
            )}
            {!v.author_id && (
              <p className="text-xs text-destructive">Aucun profil auteur lié à votre compte.</p>
            )}
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">
              Temps de lecture estimé : {readingTime} min
            </p>
          </div>
          {publishBlocked && (
            <p className="text-xs text-destructive">
              Catégorie et auteur requis avant publication.
            </p>
          )}
          <Button type="submit" disabled={saving || publishBlocked} className="btn-primary w-full">
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
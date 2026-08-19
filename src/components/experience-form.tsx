import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
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
  city: string | null;
  neighborhood: string | null;
  experience_type: string | null;
  level: string | null;
  category: string | null;
  price_model: string | null;
  supplier_net: number | null;
  supplier_cost: number | null;
  fixed_cost: number | null;
  commission_pct: number | null;
  commission_basis: string;
  requires_driver: boolean;
  is_excursion: boolean;
  max_group_size: number | null;
  min_age: number | null;
  inclusions: string[];
  exclusions: string[];
  conditions: string[];
};

const splitLines = (value: unknown) => Array.isArray(value) ? value.map(String) : [];

export function ExperienceForm({ initial, onSubmit }: { initial?: Partial<ExperienceValues>; onSubmit: (v: ExperienceValues) => Promise<unknown> }) {
  const [v, setV] = useState<ExperienceValues>({
    title: initial?.title ?? "", slug: initial?.slug ?? "", short_description: initial?.short_description ?? "", description: initial?.description ?? "",
    price_from: initial?.price_from ?? null, currency: initial?.currency ?? "EUR", duration: initial?.duration ?? "", location: initial?.location ?? "",
    cover_image_url: initial?.cover_image_url ?? "", tags: initial?.tags ?? [], seo_title: initial?.seo_title ?? "", seo_description: initial?.seo_description ?? "",
    is_published: initial?.is_published ?? false, city: initial?.city ?? "Rio de Janeiro", neighborhood: initial?.neighborhood ?? "", experience_type: initial?.experience_type ?? "",
    level: initial?.level ?? "", category: initial?.category ?? "", price_model: initial?.price_model ?? "per_person", supplier_net: initial?.supplier_net ?? null,
    supplier_cost: initial?.supplier_cost ?? null, fixed_cost: initial?.fixed_cost ?? null, commission_pct: initial?.commission_pct ?? 0,
    commission_basis: initial?.commission_basis ?? "sale_price", requires_driver: initial?.requires_driver ?? false, is_excursion: initial?.is_excursion ?? false,
    max_group_size: initial?.max_group_size ?? null, min_age: initial?.min_age ?? null, inclusions: splitLines(initial?.inclusions), exclusions: splitLines(initial?.exclusions), conditions: splitLines(initial?.conditions),
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof ExperienceValues>(k: K, val: ExperienceValues[K]) => setV((p) => ({ ...p, [k]: val }));
  const effectiveCost = Number(v.supplier_cost ?? v.supplier_net ?? 0) + Number(v.fixed_cost ?? 0);
  const commission = Number(v.price_from ?? 0) * Number(v.commission_pct ?? 0) / 100;
  const estimatedMargin = Number(v.price_from ?? 0) - effectiveCost - commission;
  const marginPct = Number(v.price_from ?? 0) > 0 ? (estimatedMargin / Number(v.price_from)) * 100 : 0;
  const listLines = (key: "inclusions" | "exclusions" | "conditions") => v[key].join("\n");
  const setLines = (key: "inclusions" | "exclusions" | "conditions", value: string) => set(key, value.split("\n").map((s) => s.trim()).filter(Boolean));
  const marginLabel = useMemo(() => Number.isFinite(estimatedMargin) ? `${estimatedMargin.toFixed(2)} ${v.currency} (${marginPct.toFixed(1)}%)` : "—", [estimatedMargin, marginPct, v.currency]);

  return <form onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { await onSubmit({ ...v, slug: v.slug || slugify(v.title) }); } finally { setSaving(false); } }} className="grid gap-6 lg:grid-cols-3">
    <div className="space-y-6 lg:col-span-2">
      <Card className="border-border/60 space-y-5 p-6">
        <div><p className="tracked mb-4 text-[10px] text-muted-foreground">Identité</p><div className="space-y-2"><Label>Titre</Label><Input required value={v.title} onChange={(e) => set("title", e.target.value)} /></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Type</Label><Input placeholder="tour, trek, transfert…" value={v.experience_type ?? ""} onChange={(e) => set("experience_type", e.target.value)} /></div><div className="space-y-2"><Label>Catégorie</Label><Input placeholder="Nature, Culture, Aventure…" value={v.category ?? ""} onChange={(e) => set("category", e.target.value)} /></div></div>
        <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>Ville</Label><Input value={v.city ?? ""} onChange={(e) => set("city", e.target.value)} /></div><div className="space-y-2"><Label>Quartier</Label><Input value={v.neighborhood ?? ""} onChange={(e) => set("neighborhood", e.target.value)} /></div><div className="space-y-2"><Label>Niveau</Label><Input placeholder="Facile, moyen…" value={v.level ?? ""} onChange={(e) => set("level", e.target.value)} /></div></div>
        <div className="space-y-2"><Label>Lieu / rendez-vous</Label><Input placeholder="ex: Praça Afonso Viseu" value={v.location ?? ""} onChange={(e) => set("location", e.target.value)} /></div>
        <div className="space-y-2"><Label>Slug</Label><Input value={v.slug} onChange={(e) => set("slug", e.target.value)} placeholder={slugify(v.title)} /></div>
        <div className="space-y-2"><Label>Description courte</Label><Textarea rows={2} value={v.short_description ?? ""} onChange={(e) => set("short_description", e.target.value)} /></div>
        <div className="space-y-2"><Label>Description complète</Label><Textarea rows={8} value={v.description ?? ""} onChange={(e) => set("description", e.target.value)} /></div>
        <div className="space-y-2"><Label>URL image de couverture</Label><Input value={v.cover_image_url ?? ""} onChange={(e) => set("cover_image_url", e.target.value)} placeholder="https://…" /></div>
        <div className="space-y-2"><Label>Tags (séparés par virgule)</Label><Input value={v.tags.join(", ")} onChange={(e) => set("tags", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} /></div>
      </Card>

      <Card className="border-border/60 space-y-5 p-6">
        <p className="tracked text-[10px] text-muted-foreground">Économie de l'expérience</p>
        <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>Prix public à partir de</Label><Input type="number" step="0.01" min="0" value={v.price_from ?? ""} onChange={(e) => set("price_from", e.target.value ? Number(e.target.value) : null)} /></div><div className="space-y-2"><Label>Devise</Label><Input value={v.currency} onChange={(e) => set("currency", e.target.value.toUpperCase())} /></div><div className="space-y-2"><Label>Modèle de prix</Label><Input placeholder="per_person / fixed…" value={v.price_model ?? ""} onChange={(e) => set("price_model", e.target.value)} /></div></div>
        <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>Net fournisseur</Label><Input type="number" step="0.01" min="0" value={v.supplier_net ?? ""} onChange={(e) => set("supplier_net", e.target.value ? Number(e.target.value) : null)} /></div><div className="space-y-2"><Label>Coût fournisseur</Label><Input type="number" step="0.01" min="0" value={v.supplier_cost ?? ""} onChange={(e) => set("supplier_cost", e.target.value ? Number(e.target.value) : null)} /></div><div className="space-y-2"><Label>Coût fixe</Label><Input type="number" step="0.01" min="0" value={v.fixed_cost ?? ""} onChange={(e) => set("fixed_cost", e.target.value ? Number(e.target.value) : null)} /></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Commission (%)</Label><Input type="number" step="0.01" min="0" value={v.commission_pct ?? 0} onChange={(e) => set("commission_pct", e.target.value ? Number(e.target.value) : 0)} /></div><div className="space-y-2"><Label>Base de commission</Label><Input placeholder="sale_price / supplier_net…" value={v.commission_basis} onChange={(e) => set("commission_basis", e.target.value)} /></div></div>
        <Separator />
        <div className="grid gap-3 sm:grid-cols-3"><div><p className="text-xs text-muted-foreground">Coût retenu</p><p className="font-semibold">{effectiveCost.toFixed(2)} {v.currency}</p></div><div><p className="text-xs text-muted-foreground">Commission simulée</p><p className="font-semibold">{commission.toFixed(2)} {v.currency}</p></div><div><p className="text-xs text-muted-foreground">Marge estimée</p><p className={estimatedMargin < 0 ? "font-semibold text-destructive" : "font-semibold"}>{marginLabel}</p></div></div>
        <p className="text-xs text-muted-foreground">Simulation indicative : le calcul final devra respecter le modèle de commission du fournisseur.</p>
      </Card>

      <Card className="border-border/60 space-y-5 p-6">
        <p className="tracked text-[10px] text-muted-foreground">Opérationnel</p>
        <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>Durée</Label><Input placeholder="ex: 4 heures" value={v.duration ?? ""} onChange={(e) => set("duration", e.target.value)} /></div><div className="space-y-2"><Label>Groupe maximum</Label><Input type="number" min="1" value={v.max_group_size ?? ""} onChange={(e) => set("max_group_size", e.target.value ? Number(e.target.value) : null)} /></div><div className="space-y-2"><Label>Âge minimum</Label><Input type="number" min="0" value={v.min_age ?? ""} onChange={(e) => set("min_age", e.target.value ? Number(e.target.value) : null)} /></div></div>
        <div className="grid gap-4 sm:grid-cols-2"><div className="flex items-center justify-between rounded-lg border p-4"><div><Label>Excursion</Label><p className="text-xs text-muted-foreground">Circuit / sortie hors Rio immédiat</p></div><Switch checked={v.is_excursion} onCheckedChange={(c) => set("is_excursion", c)} /></div><div className="flex items-center justify-between rounded-lg border p-4"><div><Label>Chauffeur requis</Label><p className="text-xs text-muted-foreground">À prévoir dans le devis / voyage</p></div><Switch checked={v.requires_driver} onCheckedChange={(c) => set("requires_driver", c)} /></div></div>
        <div className="grid gap-4 sm:grid-cols-3"><div className="space-y-2"><Label>Inclus — 1 par ligne</Label><Textarea rows={6} value={listLines("inclusions")} onChange={(e) => setLines("inclusions", e.target.value)} /></div><div className="space-y-2"><Label>Non inclus — 1 par ligne</Label><Textarea rows={6} value={listLines("exclusions")} onChange={(e) => setLines("exclusions", e.target.value)} /></div><div className="space-y-2"><Label>Conditions — 1 par ligne</Label><Textarea rows={6} value={listLines("conditions")} onChange={(e) => setLines("conditions", e.target.value)} /></div></div>
      </Card>
    </div>

    <div className="space-y-6">
      <Card className="border-border/60 p-6"><p className="tracked mb-4 text-[10px] text-muted-foreground">Publication</p><div className="flex items-center justify-between"><div><Label>Publiée</Label><p className="text-xs text-muted-foreground">Visible sur jeitinho.fr</p></div><Switch checked={v.is_published} onCheckedChange={(c) => set("is_published", c)} /></div><Button type="submit" disabled={saving} className="btn-primary mt-6 w-full">{saving ? "Enregistrement…" : "Enregistrer l'expérience"}</Button></Card>
      <Card className="border-border/60 p-6"><p className="tracked mb-4 text-[10px] text-muted-foreground">SEO</p><div className="space-y-4"><div className="space-y-2"><Label>Titre SEO</Label><Input value={v.seo_title ?? ""} onChange={(e) => set("seo_title", e.target.value)} /></div><div className="space-y-2"><Label>Description SEO</Label><Textarea rows={4} value={v.seo_description ?? ""} onChange={(e) => set("seo_description", e.target.value)} /></div></div></Card>
      <Card className="border-border/60 bg-muted/30 p-6"><p className="tracked mb-2 text-[10px] text-muted-foreground">Factory</p><p className="text-sm font-medium">Une expérience = une source de vérité.</p><p className="mt-1 text-xs text-muted-foreground">Ces données alimentent ensuite devis, voyages, contenu et marge.</p></Card>
    </div>
  </form>;
}
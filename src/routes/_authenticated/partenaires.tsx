import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ExternalLink, Handshake, Mail, Phone, Plus, Search } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PARTNER_STATUSES,
  fetchPartners,
  partnerStatus,
  savePartner,
  withPartnerStatus,
  type Partner,
} from "@/lib/ops/ops";

export const Route = createFileRoute("/_authenticated/partenaires")({
  component: PartnersPage,
  head: () => ({ meta: [{ title: "Partenaires — JEITINHO" }] }),
});

const CATEGORY_LABEL: Record<string, string> = { afrolove_relais: "Relais AFRO LOVE" };
const NEW_FIELDS = [
  ["name", "Nom"],
  ["category", "Catégorie"],
  ["location", "Quartier"],
  ["phone", "Téléphone"],
  ["email", "Email"],
  ["website", "Site"],
] as const;
type NewPartner = Record<(typeof NEW_FIELDS)[number][0], string>;
const EMPTY: NewPartner = {
  name: "",
  category: "",
  location: "",
  phone: "",
  email: "",
  website: "",
};

function PartnersPage() {
  const qc = useQueryClient();
  const {
    data = [],
    isLoading,
    error,
  } = useQuery({ queryKey: ["ops", "partners"], queryFn: fetchPartners });
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [creating, setCreating] = useState(false);
  const [nf, setNf] = useState<NewPartner>(EMPTY);

  const categories = useMemo(
    () => Array.from(new Set(data.map((p) => p.category).filter((c): c is string => Boolean(c)))),
    [data],
  );
  const visible = data.filter((p) => {
    if (category !== "all" && p.category !== category) return false;
    if (status !== "all" && partnerStatus(p.notes) !== status) return false;
    const hay = [p.name, p.contact_name, p.location, p.notes, p.email]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return !q || hay.includes(q.toLowerCase());
  });

  const save = async (row: Partial<Partner> & { name: string }, msg = "Partenaire mis à jour") => {
    try {
      await savePartner(row);
      toast.success(msg);
      qc.invalidateQueries({ queryKey: ["ops", "partners"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <PageShell
      eyebrow="Réseau"
      title="Partenaires"
      description="Prestataires, relais (guides, hostels, agences) et revendeurs. Les relais trouvés par les agents arrivent en « à contacter »."
      actions={
        <Button className="btn-primary" onClick={() => setCreating((v) => !v)}>
          <Plus className="mr-2 h-4 w-4" />
          Nouveau partenaire
        </Button>
      }
    >
      {creating && (
        <Card className="mb-5 grid gap-2 p-4 sm:grid-cols-3">
          {NEW_FIELDS.map(([k, label]) => (
            <Input
              key={k}
              placeholder={label}
              value={nf[k]}
              onChange={(e) => setNf({ ...nf, [k]: e.target.value })}
            />
          ))}
          <div className="flex gap-2 sm:col-span-3">
            <Button
              onClick={() => {
                if (!nf.name) return toast.error("Nom obligatoire");
                void save(
                  {
                    name: nf.name,
                    category: nf.category || null,
                    location: nf.location || null,
                    phone: nf.phone || null,
                    email: nf.email || null,
                    website: nf.website || null,
                    is_active: true,
                    notes: "Statut : partenaire",
                  },
                  "Partenaire ajouté",
                );
                setNf(EMPTY);
                setCreating(false);
              }}
            >
              Enregistrer
            </Button>
            <Button variant="ghost" onClick={() => setCreating(false)}>
              Annuler
            </Button>
          </div>
        </Card>
      )}

      <div className="mb-5 flex flex-col gap-2 lg:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="lg:w-56">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes catégories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c}>
                {CATEGORY_LABEL[c] ?? c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="lg:w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            {PARTNER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {error && (
        <Card className="border-destructive/40 p-6 text-sm">{(error as Error).message}</Card>
      )}
      {!isLoading && !error && visible.length === 0 && (
        <Card className="border-dashed p-16 text-center">
          <Handshake className="mx-auto mb-4 h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Aucun partenaire.</p>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((p) => {
          const st = partnerStatus(p.notes);
          return (
            <Card key={p.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {[p.location, p.contact_name].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {p.category && (
                  <Badge variant="secondary">{CATEGORY_LABEL[p.category] ?? p.category}</Badge>
                )}
              </div>
              {p.notes && <p className="line-clamp-3 text-xs text-muted-foreground">{p.notes}</p>}
              <div className="flex flex-wrap gap-3 text-xs">
                {p.phone && (
                  <a
                    className="text-primary"
                    href={`https://wa.me/${p.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Phone className="mr-1 inline h-3 w-3" />
                    {p.phone}
                  </a>
                )}
                {p.email && (
                  <a className="text-primary" href={`mailto:${p.email}`}>
                    <Mail className="mr-1 inline h-3 w-3" />
                    {p.email}
                  </a>
                )}
                {p.website && (
                  <a className="text-primary" href={p.website} target="_blank" rel="noreferrer">
                    <ExternalLink className="mr-1 inline h-3 w-3" />
                    site
                  </a>
                )}
              </div>
              <div className="mt-auto flex items-center justify-between gap-2 pt-2">
                <Select
                  value={st || "none"}
                  onValueChange={(v) => {
                    if (v === "none") return;
                    void save({
                      ...p,
                      notes: withPartnerStatus(p.notes, v),
                      is_active: v === "partenaire" ? true : p.is_active,
                    });
                  }}
                >
                  <SelectTrigger className="h-8 w-40 text-xs">
                    <SelectValue placeholder="Statut" />
                  </SelectTrigger>
                  <SelectContent>
                    {!st && <SelectItem value="none">—</SelectItem>}
                    {PARTNER_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Actif{" "}
                  <Switch
                    checked={p.is_active}
                    onCheckedChange={(v) => void save({ ...p, is_active: v })}
                  />
                </label>
              </div>
            </Card>
          );
        })}
      </div>
    </PageShell>
  );
}

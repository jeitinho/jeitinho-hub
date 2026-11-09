import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createCatalogItem, createTicketOfferVariant, deleteCatalogItem } from "@/lib/catalog-gateway";
import { ONLINE_PRICING_MODEL, ON_REQUEST_PRICING_MODEL } from "@/lib/tickets/online-sale";
import {
  SAMBODROMO_SECTORS,
  STADIUMS,
  cleanSectors,
  emptySectors,
  matchDescription,
  matchTitle,
  sambodromoDescription,
  sambodromoTitle,
  slugify,
  type QuickKind,
  type SectorDraft,
} from "@/lib/tickets/quick-offer";

type Previous = { title: string; sectors: SectorDraft[] } | null;

/** Sectors of the latest offer at this venue, so a new match starts from them. */
async function fetchPreviousSectors(venue: string): Promise<Previous> {
  const db = supabase as any;
  const { data: offers, error } = await db
    .from("ticket_offers")
    .select("id,title,event_date")
    .ilike("venue", venue)
    .order("event_date", { ascending: false, nullsFirst: false })
    .limit(5);
  if (error) throw error;
  for (const o of offers ?? []) {
    const { data: variants, error: vErr } = await db
      .from("ticket_offer_variants")
      .select("label,capacity,sort_order")
      .eq("ticket_offer_id", o.id)
      .order("sort_order");
    if (vErr) throw vErr;
    if (variants?.length) {
      return {
        title: o.title,
        sectors: variants.map((v: any) => ({ label: v.label, price: null, capacity: null })),
      };
    }
  }
  return null;
}

const num = (raw: string) => (raw.trim() === "" ? null : Number(raw.replace(",", ".")));

export function QuickTicketForm({ kind }: { kind: QuickKind }) {
  const navigate = useNavigate();
  const [stadium, setStadium] = useState<string>(STADIUMS[0]);
  const [otherStadium, setOtherStadium] = useState("");
  const [home, setHome] = useState("");
  const [away, setAway] = useState("");
  const [competition, setCompetition] = useState("");
  const [night, setNight] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState(kind === "sambodromo" ? "20:00" : "");
  const [sectors, setSectors] = useState<SectorDraft[]>(
    kind === "sambodromo" ? emptySectors(SAMBODROMO_SECTORS) : [],
  );
  const [published, setPublished] = useState(true);
  const [online, setOnline] = useState(true);
  const [saving, setSaving] = useState(false);
  const [touchedSectors, setTouchedSectors] = useState(false);

  const venue = kind === "sambodromo" ? "Sambódromo da Marquês de Sapucaí" : stadium === "autre" ? otherStadium.trim() : stadium;

  const { data: previous } = useQuery({
    queryKey: ["ticket-previous-sectors", kind === "foot" ? venue.toLowerCase() : "sambodromo"],
    queryFn: () => fetchPreviousSectors(kind === "foot" ? venue : "Sambódromo%"),
    enabled: kind === "sambodromo" || venue.length > 2,
    staleTime: 60_000,
  });

  // Football: start from the sectors of the last match at this stadium, as
  // long as the sector list hasn't been edited by hand.
  useEffect(() => {
    if (kind !== "foot" || touchedSectors) return;
    setSectors(previous?.sectors ?? [{ label: "", price: null, capacity: null }]);
  }, [kind, previous, touchedSectors]);

  const title = kind === "foot" ? matchTitle(home, away) : sambodromoTitle(night, date);
  const ready =
    title.trim().length > 0 &&
    !!date &&
    (kind === "sambodromo" || (!!home.trim() && !!away.trim() && !!venue));
  const priced = useMemo(() => sectors.filter((s) => (s.price ?? 0) > 0).length, [sectors]);

  const patch = (i: number, p: Partial<SectorDraft>) => {
    setTouchedSectors(true);
    setSectors((prev) => prev.map((s, j) => (j === i ? { ...s, ...p } : s)));
  };

  const create = async () => {
    if (!ready || saving) return;
    const rows = cleanSectors(sectors);
    setSaving(true);
    let offerId: string | null = null;
    try {
      const offer = await createCatalogItem<{ id: string }>("ticket_offers", {
        title,
        venue,
        category: kind === "foot" ? "Foot" : "Carnaval",
        event_date: date,
        event_time: time || null,
        description:
          kind === "foot"
            ? matchDescription(home, away, venue, competition)
            : sambodromoDescription(night),
        notes: kind === "foot" && competition.trim() ? competition.trim() : null,
        currency: "EUR",
        public_price: null,
        commission_pct: 0,
        commission_basis: "sale_price",
        is_published: published,
        is_active: true,
        pricing_model: online ? ONLINE_PRICING_MODEL : ON_REQUEST_PRICING_MODEL,
        photo_ratio: "16/9",
        slug: slugify(title),
      });
      offerId = offer.id;
      for (const [i, s] of rows.entries()) {
        await createTicketOfferVariant({
          ticket_offer_id: offer.id,
          label: s.label,
          public_price: s.price,
          supplier_cost: s.supplier_cost ?? null,
          capacity: s.capacity,
          currency: "EUR",
          is_active: true,
          sort_order: i,
        });
      }
      toast.success(published && online && priced ? "Billet en vente sur jeitinho.fr" : "Billet créé");
      navigate({ to: "/billetterie/$id", params: { id: offer.id } });
    } catch (e) {
      // Don't leave a half-created offer without its sectors.
      if (offerId) await deleteCatalogItem("ticket_offers", offerId).catch(() => undefined);
      toast.error(e instanceof Error ? e.message : "Création impossible.");
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <Card className="space-y-4 border-border/60 p-6">
          {kind === "foot" ? (
            <>
              <div className="space-y-2">
                <Label>Stade</Label>
                <div className="flex flex-wrap gap-2">
                  {[...STADIUMS, "autre"].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setStadium(s);
                        setTouchedSectors(false);
                      }}
                      className={`rounded-md border px-3 py-1.5 text-sm transition ${
                        stadium === s ? "border-primary bg-primary/5 font-medium" : "border-border hover:border-primary/40"
                      }`}
                    >
                      {s === "autre" ? "Autre stade" : s}
                    </button>
                  ))}
                </div>
                {stadium === "autre" && (
                  <Input
                    value={otherStadium}
                    onChange={(e) => setOtherStadium(e.target.value)}
                    placeholder="Nilton Santos, Allianz Parque…"
                  />
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Équipe à domicile</Label>
                  <Input value={home} onChange={(e) => setHome(e.target.value)} placeholder="Flamengo" />
                </div>
                <div className="space-y-2">
                  <Label>Équipe visiteuse</Label>
                  <Input value={away} onChange={(e) => setAway(e.target.value)} placeholder="Vasco" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Compétition (optionnel)</Label>
                <Input
                  value={competition}
                  onChange={(e) => setCompetition(e.target.value)}
                  placeholder="Brasileirão, Libertadores, Carioca…"
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Nuit (optionnel)</Label>
              <Input
                value={night}
                onChange={(e) => setNight(e.target.value)}
                placeholder="Grupo Especial, 1re nuit · Champions…"
              />
              <p className="text-xs text-muted-foreground">
                Un billet par soirée : chaque jour a ses propres prix. Vide : le titre reprend la date.
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Heure</Label>
              <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="space-y-4 border-border/60 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">Prix par secteur (€)</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {kind === "foot" && previous
                  ? `Secteurs repris de « ${previous.title} ». Sans prix : affiché sur demande.`
                  : "Sans prix : le secteur s'affiche sur demande et ne se vend pas en ligne."}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setTouchedSectors(true);
                setSectors((p) => [...p, { label: "", price: null, capacity: null }]);
              }}
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Secteur
            </Button>
          </div>
          <div className="space-y-2">
            <div className="hidden grid-cols-[1fr_96px_96px_80px_32px] gap-2 text-[11px] text-muted-foreground sm:grid">
              <span>Secteur</span>
              <span>Prix</span>
              <span>Coût</span>
              <span>Places</span>
              <span />
            </div>
            {sectors.map((s, i) => (
              <div key={i} className="grid grid-cols-[1fr_96px_96px_80px_32px] items-center gap-2">
                <Input value={s.label} onChange={(e) => patch(i, { label: e.target.value })} placeholder="Norte, Setor 9…" />
                <Input
                  inputMode="decimal"
                  value={s.price ?? ""}
                  onChange={(e) => patch(i, { price: num(e.target.value) })}
                  placeholder="—"
                  aria-label={`Prix ${s.label}`}
                />
                <Input
                  inputMode="decimal"
                  value={s.supplier_cost ?? ""}
                  onChange={(e) => patch(i, { supplier_cost: num(e.target.value) })}
                  placeholder="—"
                  aria-label={`Coût ${s.label}`}
                />
                <Input
                  inputMode="numeric"
                  value={s.capacity ?? ""}
                  onChange={(e) => patch(i, { capacity: num(e.target.value) })}
                  placeholder="∞"
                  aria-label={`Places ${s.label}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Retirer le secteur"
                  onClick={() => {
                    setTouchedSectors(true);
                    setSectors((p) => p.filter((_, j) => j !== i));
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="h-fit space-y-5 border-border/60 p-6 lg:sticky lg:top-6">
        <div>
          <p className="text-xs text-muted-foreground">Aperçu</p>
          <p className="mt-1 font-medium">{title || "—"}</p>
          <p className="text-xs text-muted-foreground">{[venue, date, time].filter(Boolean).join(" · ")}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {priced} secteur{priced > 1 ? "s" : ""} avec prix sur {sectors.length}
          </p>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label>Publié sur jeitinho.fr</Label>
            <p className="text-xs text-muted-foreground">Visible dans la billetterie</p>
          </div>
          <Switch checked={published} onCheckedChange={setPublished} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <Label>Achat en ligne</Label>
            <p className="text-xs text-muted-foreground">Paiement Stripe direct. Sinon : WhatsApp</p>
          </div>
          <Switch checked={online} onCheckedChange={setOnline} />
        </div>
        <Button type="button" className="btn-primary w-full" disabled={!ready || saving} onClick={create}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {saving ? "Création…" : "Créer le billet"}
        </Button>
        {!ready && (
          <p className="text-xs text-muted-foreground">
            {kind === "foot" ? "Stade, équipes et date requis." : "Date requise."}
          </p>
        )}
      </Card>
    </div>
  );
}

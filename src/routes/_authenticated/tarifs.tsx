import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LoadingRows } from "@/components/loading-rows";
import { updateCatalogItem, updateTicketOfferVariant, type CatalogTable } from "@/lib/catalog-gateway";
import {
  matchesSearch,
  pricingSummary,
  unitEconomics,
  type CatalogKind,
  type PricingRow,
} from "@/lib/catalog/pricing";
import { t } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/tarifs")({
  head: () => ({ meta: [{ title: "Tarifs & coûts — JEITINHO" }] }),
  component: TarifsPage,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const TABLE: Record<CatalogKind, CatalogTable> = {
  experience: "experiences",
  service: "services",
  ticket: "ticket_offers",
};
const KIND_LABEL: Record<CatalogKind, string> = {
  experience: "Expérience",
  service: "Service",
  ticket: "Billet",
};
const MODEL_LABEL: Record<string, string> = {
  per_person: "par pers.",
  fixed: "forfait",
  per_group: "par groupe",
  per_unit: "par unité",
};
const EDIT_LINK: Record<CatalogKind, string> = {
  experience: "/experiences/$id",
  service: "/services/$id",
  ticket: "/billetterie/$id",
};

type Field = "price" | "supplierCost" | "fixedCost" | "commissionPct";
const COLUMN: Record<CatalogKind, Record<Field, string>> = {
  experience: { price: "price_from", supplierCost: "supplier_cost", fixedCost: "fixed_cost", commissionPct: "commission_pct" },
  service: { price: "price_from", supplierCost: "supplier_cost", fixedCost: "fixed_cost", commissionPct: "commission_pct" },
  ticket: { price: "public_price", supplierCost: "supplier_cost", fixedCost: "fixed_cost", commissionPct: "commission_pct" },
};

const n = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));

async function loadRows(): Promise<PricingRow[]> {
  const [ex, sv, tk, vr] = await Promise.all([
    db
      .from("experiences")
      .select("id,title,category,city,currency,price_model,price_from,supplier_cost,supplier_net,fixed_cost,commission_pct,is_published")
      .order("title"),
    db
      .from("services")
      .select("id,title,group_slug,category,currency,price_model,price_from,supplier_cost,supplier_net,fixed_cost,commission_pct,is_active")
      .order("title"),
    db
      .from("ticket_offers")
      .select("id,title,venue,event_date,currency,pricing_model,public_price,supplier_cost,supplier_net,fixed_cost,commission_pct,is_published,is_active")
      .order("event_date", { ascending: true, nullsFirst: false }),
    db.from("ticket_offer_variants").select("id,ticket_offer_id,label,public_price,supplier_cost,sort_order,is_active").order("sort_order"),
  ]);
  for (const r of [ex, sv, tk, vr]) if (r.error) throw new Error(r.error.message);
  const variants = new Map<string, { id: string; label: string; price: number | null; cost: number | null }[]>();
  for (const v of vr.data ?? []) {
    if (v.is_active === false) continue;
    variants.set(v.ticket_offer_id, [...(variants.get(v.ticket_offer_id) ?? []), { id: v.id, label: v.label, price: n(v.public_price), cost: n(v.supplier_cost) }]);
  }
  return [
    ...(ex.data ?? []).map((e: Record<string, unknown>) => ({
      key: `experience:${e.id}`,
      kind: "experience" as const,
      id: String(e.id),
      title: String(e.title),
      group: (e.category as string) ?? (e.city as string) ?? null,
      currency: (e.currency as string) ?? "EUR",
      priceModel: (e.price_model as string) ?? null,
      price: n(e.price_from),
      supplierCost: n(e.supplier_cost),
      supplierNet: n(e.supplier_net),
      fixedCost: n(e.fixed_cost),
      commissionPct: n(e.commission_pct),
      published: Boolean(e.is_published),
    })),
    ...(sv.data ?? []).map((s: Record<string, unknown>) => ({
      key: `service:${s.id}`,
      kind: "service" as const,
      id: String(s.id),
      title: String(s.title),
      group: (s.group_slug as string) ?? (s.category as string) ?? null,
      currency: (s.currency as string) ?? "EUR",
      priceModel: (s.price_model as string) ?? null,
      price: n(s.price_from),
      supplierCost: n(s.supplier_cost),
      supplierNet: n(s.supplier_net),
      fixedCost: n(s.fixed_cost),
      commissionPct: n(s.commission_pct),
      published: s.is_active !== false,
    })),
    ...(tk.data ?? [])
      .filter((o: Record<string, unknown>) => o.is_active !== false)
      .map((o: Record<string, unknown>) => ({
        key: `ticket:${o.id}`,
        kind: "ticket" as const,
        id: String(o.id),
        title: String(o.title),
        group: [o.venue, o.event_date ? new Date(`${o.event_date}T12:00:00Z`).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "UTC" }) : null]
          .filter(Boolean)
          .join(" · ") || null,
        currency: (o.currency as string) ?? "EUR",
        priceModel: (o.pricing_model as string) ?? "per_unit",
        price: n(o.public_price),
        supplierCost: n(o.supplier_cost),
        supplierNet: n(o.supplier_net),
        fixedCost: n(o.fixed_cost),
        commissionPct: n(o.commission_pct),
        published: Boolean(o.is_published),
        variants: variants.get(String(o.id)) ?? [],
      })),
  ];
}

function money(v: number | null, cur: string) {
  if (v === null) return "—";
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: cur, maximumFractionDigits: 2 }).format(v);
}

function TarifsPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ["tarifs"], queryFn: loadRows });
  const [kind, setKind] = useState<CatalogKind | "all">("all");
  const [q, setQ] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(false);
  const [saving, setSaving] = useState<Record<string, "saving" | "saved" | "error">>({});

  const rows = useMemo(
    () =>
      (data ?? []).filter(
        (r) =>
          (kind === "all" || r.kind === kind) &&
          matchesSearch(r, q) &&
          (!onlyMissing || !unitEconomics(r).costKnown || r.price === null),
      ),
    [data, kind, q, onlyMissing],
  );
  const summary = pricingSummary(data ?? []);

  const patchLocal = (key: string, patch: Partial<PricingRow>) =>
    qc.setQueryData<PricingRow[]>(["tarifs"], (old) => (old ?? []).map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const save = async (r: PricingRow, field: Field, raw: string) => {
    const value = raw.trim() === "" ? null : Number(raw.replace(",", "."));
    if (value !== null && (Number.isNaN(value) || value < 0)) return toast.error(t("Montant invalide."));
    if (value === r[field]) return;
    const cell = `${r.key}:${field}`;
    patchLocal(r.key, { [field]: value } as Partial<PricingRow>);
    setSaving((s) => ({ ...s, [cell]: "saving" }));
    try {
      await updateCatalogItem(TABLE[r.kind], r.id, { [COLUMN[r.kind][field]]: value });
      setSaving((s) => ({ ...s, [cell]: "saved" }));
      setTimeout(() => setSaving((s) => ({ ...s, [cell]: undefined as never })), 1500);
    } catch (e) {
      patchLocal(r.key, { [field]: r[field] } as Partial<PricingRow>);
      setSaving((s) => ({ ...s, [cell]: "error" }));
      toast.error((e as Error).message);
    }
  };

  const saveVariant = async (r: PricingRow, variantId: string, raw: string, field: "price" | "cost" = "price") => {
    const value = raw.trim() === "" ? null : Number(raw.replace(",", "."));
    if (value !== null && (Number.isNaN(value) || value < 0)) return toast.error(t("Montant invalide."));
    const cell = `${r.key}:v${field === "cost" ? "c" : ""}:${variantId}`;
    setSaving((s) => ({ ...s, [cell]: "saving" }));
    try {
      await updateTicketOfferVariant(variantId, field === "cost" ? { supplier_cost: value } : { public_price: value });
      patchLocal(r.key, { variants: (r.variants ?? []).map((v) => (v.id === variantId ? { ...v, [field]: value } : v)) });
      setSaving((s) => ({ ...s, [cell]: "saved" }));
    } catch (e) {
      setSaving((s) => ({ ...s, [cell]: "error" }));
      toast.error((e as Error).message);
    }
  };

  return (
    <PageShell
      eyebrow={t("Offre")}
      title={t("Tarifs & coûts")}
      description={t(
        "Prix public, coût fournisseur, frais fixes et commission de toute l'offre au même endroit. La marge se recalcule à chaque saisie ; chaque case s'enregistre dès que tu la quittes.",
      )}
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <Kpi label={t("produits")} value={String(summary.total)} />
        <Kpi
          label={t("sans coût fournisseur")}
          value={String(summary.withoutCost)}
          alert={summary.withoutCost > 0}
          onClick={() => setOnlyMissing((v) => !v)}
          active={onlyMissing}
        />
        <Kpi label={t("marge négative")} value={String(summary.negative)} alert={summary.negative > 0} />
        <Kpi
          label={t("taux de marge moyen")}
          value={summary.avgRate === null ? "—" : `${Math.round(summary.avgRate * 100)} %`}
        />
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {(["all", "experience", "service", "ticket"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            aria-pressed={kind === k}
            className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${
              kind === k ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/30"
            }`}
          >
            {k === "all" ? t("Tout") : t(`${KIND_LABEL[k]}s`)}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOnlyMissing((v) => !v)}
          aria-pressed={onlyMissing}
          className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${
            onlyMissing ? "border-amber-600 bg-amber-50 text-amber-900" : "border-border bg-card hover:border-foreground/30"
          }`}
        >
          {t("À compléter")}
        </button>
        <div className="relative ml-auto w-full sm:w-64">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input className="h-9 pl-8" placeholder={t("Chercher un produit…")} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {isLoading && <LoadingRows rows={6} />}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {data && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-[13px]">
              <thead className="sticky top-0 z-[1] bg-muted/70 text-left text-[12px] text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-3 py-2 font-semibold">{t("Produit")}</th>
                  <th className="w-28 px-2 py-2 font-semibold">{t("Prix public")}</th>
                  <th className="w-28 px-2 py-2 font-semibold">{t("Coût fournisseur")}</th>
                  <th className="w-24 px-2 py-2 font-semibold">{t("Frais fixes")}</th>
                  <th className="w-20 px-2 py-2 font-semibold">{t("Comm. %")}</th>
                  <th className="w-32 px-3 py-2 text-right font-semibold">{t("Marge / unité")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => {
                  const eco = unitEconomics(r);
                  return (
                    <tr key={r.key} className="align-top hover:bg-muted/30">
                      <td className="px-3 py-2">
                        <Link
                          to={EDIT_LINK[r.kind]}
                          params={{ id: r.id }}
                          className="font-semibold hover:underline"
                        >
                          {r.title}
                        </Link>
                        <p className="mt-0.5 flex flex-wrap gap-x-2 text-[12px] text-muted-foreground">
                          <span>{t(KIND_LABEL[r.kind])}</span>
                          {r.priceModel && MODEL_LABEL[r.priceModel] && <span>{t(MODEL_LABEL[r.priceModel])}</span>}
                          {r.group && <span>{r.group}</span>}
                          {!r.published && <span className="text-amber-700">{t("non publié")}</span>}
                        </p>
                        {r.kind === "ticket" && (r.variants ?? []).length > 0 && (
                          <div className="mt-2 space-y-1">
                            {(r.variants ?? []).map((v) => (
                              <label key={v.id} className="flex items-center gap-2 text-[12.5px]">
                                <span className="w-32 truncate text-muted-foreground">{v.label}</span>
                                <span className="w-28">
                                  <MoneyInput
                                    value={v.price}
                                    state={saving[`${r.key}:v:${v.id}`]}
                                    onCommit={(raw) => void saveVariant(r, v.id, raw)}
                                    label={`${r.title} — ${v.label}`}
                                  />
                                </span>
                                <span className="w-24">
                                  <MoneyInput
                                    value={v.cost ?? null}
                                    state={saving[`${r.key}:vc:${v.id}`]}
                                    onCommit={(raw) => void saveVariant(r, v.id, raw, "cost")}
                                    label={`${r.title} — ${v.label} — ${t("coût")}`}
                                    placeholder={t("coût")}
                                  />
                                </span>
                                {(() => {
                                  const ve = unitEconomics({ ...r, price: v.price, supplierCost: v.cost ?? r.supplierCost });
                                  return ve.margin === null ? null : (
                                    <span className={`tabular-nums ${ve.margin < 0 ? "text-destructive" : "text-emerald-700"}`}>
                                      {money(ve.margin, r.currency)}
                                    </span>
                                  );
                                })()}
                              </label>
                            ))}
                          </div>
                        )}
                      </td>
                      {(["price", "supplierCost", "fixedCost", "commissionPct"] as Field[]).map((f) => (
                        <td key={f} className="px-2 py-2">
                          <MoneyInput
                            value={r[f]}
                            state={saving[`${r.key}:${f}`]}
                            onCommit={(raw) => void save(r, f, raw)}
                            label={`${r.title} — ${f}`}
                            placeholder={f === "supplierCost" && r.supplierNet !== null ? `net ${r.supplierNet}` : undefined}
                            warn={f === "supplierCost" && !eco.costKnown}
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-right tabular-nums">
                        {eco.margin === null ? (
                          <span className="text-[12px] text-amber-700">
                            {eco.costKnown ? t("Prix manquant") : t("Coût manquant")}
                          </span>
                        ) : (
                          <>
                            <p className={`font-semibold ${eco.margin < 0 ? "text-destructive" : "text-emerald-700"}`}>
                              {money(eco.margin, r.currency)}
                            </p>
                            {eco.rate !== null && (
                              <p className="text-[12px] text-muted-foreground">{Math.round(eco.rate * 100)} %</p>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">
                      {t("Rien ne correspond.")}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageShell>
  );
}

function Kpi({
  label,
  value,
  alert,
  onClick,
  active,
}: {
  label: string;
  value: string;
  alert?: boolean;
  onClick?: () => void;
  active?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-xl border border-border bg-card px-4 py-3 text-left ${onClick ? "transition-colors hover:border-foreground/25" : ""} ${active ? "ring-2 ring-amber-500/40" : ""}`}
    >
      <p className={`font-display text-[26px] leading-none ${alert ? "text-amber-700" : ""}`}>{value}</p>
      <p className="mt-1.5 text-[12.5px] font-medium text-muted-foreground">{label}</p>
    </Comp>
  );
}

/** Case de montant : s'enregistre en quittant la case ou avec Entrée ; Échap annule. */
function MoneyInput({
  value,
  onCommit,
  state,
  label,
  placeholder,
  warn,
}: {
  value: number | null;
  onCommit: (raw: string) => void;
  state?: "saving" | "saved" | "error";
  label: string;
  placeholder?: string;
  warn?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const cancelled = useRef(false);
  const shown = draft ?? (value === null ? "" : String(value));
  return (
    <div className="relative">
      <Input
        inputMode="decimal"
        aria-label={label}
        value={shown}
        placeholder={placeholder ?? "—"}
        onFocus={(e) => {
          setDraft(value === null ? "" : String(value));
          e.currentTarget.select();
        }}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && !cancelled.current) onCommit(draft);
          cancelled.current = false;
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
          if (e.key === "Escape") {
            cancelled.current = true;
            (e.currentTarget as HTMLInputElement).blur();
          }
        }}
        className={`h-8 pr-6 text-right tabular-nums ${warn ? "border-amber-400 bg-amber-50/60" : ""}`}
      />
      <span className="pointer-events-none absolute right-1.5 top-2">
        {state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {state === "saved" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
        {state === "error" && <AlertTriangle className="h-3.5 w-3.5 text-destructive" />}
      </span>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { t } from "@/lib/i18n";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

type Offer = {
  id: string;
  title: string;
  public_price: number | null;
  currency: string | null;
  event_date: string | null;
};
type Variant = {
  id: string;
  label: string;
  public_price: number | null;
  currency: string | null;
  capacity: number | null;
};
type ClientLite = { id: string; full_name: string; email: string | null; phone: string | null };

/**
 * Vendre un billet (modèle Bókun « Quick booking ») : secteur, quantité, client →
 * devis brouillon prêt à envoyer (acompte 100 %). Le paiement suit le circuit habituel.
 */
export function SellTicketDialog({
  offer,
  open,
  onOpenChange,
}: {
  offer: Offer;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const navigate = useNavigate();
  const [variantId, setVariantId] = useState<string | null>(null);
  const [qty, setQty] = useState(2);
  const [clientQ, setClientQ] = useState("");
  const [client, setClient] = useState<ClientLite | null>(null);
  const [lang, setLang] = useState("fr");
  const [busy, setBusy] = useState(false);

  const variants = useQuery({
    queryKey: ["sell-variants", offer.id],
    enabled: open,
    queryFn: async () => {
      const { data } = await db
        .from("ticket_offer_variants")
        .select("id,label,public_price,currency,capacity")
        .eq("ticket_offer_id", offer.id)
        .eq("is_active", true)
        .order("sort_order");
      return (data ?? []) as Variant[];
    },
  });
  const term = clientQ.trim().replace(/[,()]/g, " ");
  const clients = useQuery({
    queryKey: ["sell-clients", term],
    enabled: open && term.length >= 2 && !client,
    queryFn: async () => {
      const like = `%${term}%`;
      const { data } = await db
        .from("clients")
        .select("id,full_name,email,phone")
        .or(`full_name.ilike.${like},email.ilike.${like},phone.ilike.${like}`)
        .limit(6);
      return (data ?? []) as ClientLite[];
    },
  });

  const vs = variants.data ?? [];
  const chosen = vs.find((v) => v.id === variantId) ?? (vs.length === 1 ? vs[0] : null);
  const unit = chosen?.public_price ?? offer.public_price;
  const cur = chosen?.currency ?? offer.currency ?? "EUR";
  const needsVariant = vs.length > 1 && !chosen;
  const total = unit != null ? Number(unit) * qty : null;
  const fmt = (v: number, c = cur) =>
    new Intl.NumberFormat("fr-FR", { style: "currency", currency: c }).format(v);

  const submit = async () => {
    if (needsVariant) return toast.error(t("Choisis un secteur."));
    if (unit == null) return toast.error(t("Ce billet n'a pas encore de prix public."));
    setBusy(true);
    const { data, error } = await db.rpc("sell_ticket_quote", {
      p_offer: offer.id,
      p_variant: chosen?.id ?? null,
      p_qty: qty,
      p_client: client?.id ?? null,
      p_language: lang,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(t("Devis créé : vérifie-le puis envoie-le au client."));
    onOpenChange(false);
    void navigate({ to: "/devis/$id", params: { id: data as string } });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-sans text-[16px] font-semibold">
            {t("Vendre")} · {offer.title}
          </DialogTitle>
          <DialogDescription>{t("Crée un devis prêt à envoyer, payable en une fois.")}</DialogDescription>
        </DialogHeader>

        {vs.length > 0 && (
          <div className="space-y-1.5">
            <Label>{t("Secteur")}</Label>
            <div className="grid gap-1.5">
              {vs.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVariantId(v.id)}
                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-left text-[13.5px] transition-colors ${
                    chosen?.id === v.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-foreground/30"
                  }`}
                >
                  <span className="font-medium">{v.label}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {v.public_price != null
                      ? fmt(Number(v.public_price), v.currency ?? cur)
                      : t("prix à définir")}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <Label>{t("Quantité")}</Label>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              aria-label={t("Moins")}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-8 text-center text-[15px] font-semibold tabular-nums">{qty}</span>
            <Button
              size="icon"
              variant="outline"
              className="h-8 w-8"
              onClick={() => setQty((q) => Math.min(50, q + 1))}
              aria-label={t("Plus")}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>{t("Client")}</Label>
          {client ? (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-[13.5px]">
              <span>
                <span className="font-medium">{client.full_name}</span>
                <span className="ml-2 text-muted-foreground">{client.email ?? client.phone ?? ""}</span>
              </span>
              <button
                type="button"
                className="text-[12.5px] text-muted-foreground hover:text-foreground"
                onClick={() => setClient(null)}
              >
                {t("Changer")}
              </button>
            </div>
          ) : (
            <>
              <Input
                placeholder={t("Nom, e-mail ou téléphone (facultatif)")}
                value={clientQ}
                onChange={(e) => setClientQ(e.target.value)}
              />
              {(clients.data ?? []).length > 0 && (
                <div className="divide-y divide-border rounded-lg border border-border">
                  {(clients.data ?? []).map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setClient(c)}
                      className="block w-full px-3 py-1.5 text-left text-[13px] hover:bg-muted"
                    >
                      {c.full_name}{" "}
                      <span className="text-muted-foreground">{c.email ?? c.phone ?? ""}</span>
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[12px] text-muted-foreground">
                {t("Sans client choisi, le devis est créé sans nom : tu le compléteras avant l'envoi.")}
              </p>
            </>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Label>{t("Langue du devis")}</Label>
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            {["fr", "en", "pt", "es"].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLang(l)}
                className={`rounded-md px-2 py-0.5 text-[12px] font-semibold uppercase ${
                  lang === l ? "bg-foreground text-background" : "text-muted-foreground"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3">
          <div>
            <p className="text-[12px] text-muted-foreground">{t("Total")}</p>
            <p className="font-display text-[22px] leading-none tabular-nums">
              {total != null ? fmt(total) : "—"}
            </p>
          </div>
          <Button onClick={() => void submit()} disabled={busy || needsVariant || unit == null}>
            <ShoppingBag className="mr-1.5 h-4 w-4" />
            {busy ? t("Création…") : t("Créer le devis")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

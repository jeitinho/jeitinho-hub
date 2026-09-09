import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, ArrowUp, ArrowDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  fetchTicketOfferVariants,
  createTicketOfferVariant,
  updateTicketOfferVariant,
  deleteTicketOfferVariant,
} from "@/lib/catalog-gateway";

type VariantRow = {
  id: string | null;
  label: string;
  public_price: number | null;
  currency: string;
  capacity: number | null;
  is_active: boolean;
  sort_order: number;
};

type VariantDb = {
  id: string;
  label: string;
  public_price: number | null;
  currency: string;
  capacity: number | null;
  is_active: boolean;
  sort_order: number;
};

function toRow(v: VariantDb): VariantRow {
  return { id: v.id, label: v.label, public_price: v.public_price, currency: v.currency, capacity: v.capacity, is_active: v.is_active, sort_order: v.sort_order };
}

// label stays free text on purpose — Maracanã ("Norte", "Maracanã Mais") and
// Carnaval ("Setor 9 — Arquibancada") don't share a taxonomy shape, so a
// fixed enum would force one event type's vocabulary onto the other.
function emptyRow(sortOrder: number): VariantRow {
  return { id: null, label: "", public_price: null, currency: "EUR", capacity: null, is_active: true, sort_order: sortOrder };
}

// CRUD for a ticket's sector/price variants, scoped to one ticket_offer_id.
// Only rendered once the parent ticket exists (billetterie.$id.tsx) — a
// not-yet-created ticket has no id to attach variants to.
export function TicketOfferVariantsEditor({ ticketOfferId }: { ticketOfferId: string }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<VariantRow[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["ticket-offer-variants", ticketOfferId],
    queryFn: () => fetchTicketOfferVariants<VariantDb>(ticketOfferId),
  });

  useEffect(() => {
    if (data) { setRows(data.map(toRow)); setDeletedIds([]); }
  }, [data]);

  const update = (index: number, patch: Partial<VariantRow>) => setRows(prev => prev.map((r, i) => i === index ? { ...r, ...patch } : r));
  const addRow = () => setRows(prev => [...prev, emptyRow(prev.length)]);
  const removeRow = (index: number) => setRows(prev => {
    const row = prev[index];
    if (row.id) setDeletedIds(ids => [...ids, row.id!]);
    return prev.filter((_, i) => i !== index);
  });
  const move = (index: number, dir: -1 | 1) => setRows(prev => {
    const next = [...prev];
    const target = index + dir;
    if (target < 0 || target >= next.length) return prev;
    [next[index], next[target]] = [next[target], next[index]];
    return next.map((r, i) => ({ ...r, sort_order: i }));
  });

  const save = async () => {
    const withEmptyLabel = rows.some(r => !r.label.trim());
    if (withEmptyLabel) return toast.error("Chaque secteur doit avoir un libellé.");
    setSaving(true);
    try {
      await Promise.all(deletedIds.map(id => deleteTicketOfferVariant(id)));
      await Promise.all(rows.map((r, i) => {
        const values = { label: r.label.trim(), public_price: r.public_price, currency: r.currency || "EUR", capacity: r.capacity, is_active: r.is_active, sort_order: i, ticket_offer_id: ticketOfferId };
        return r.id ? updateTicketOfferVariant(r.id, values) : createTicketOfferVariant(values);
      }));
      toast.success("Secteurs enregistrés.");
      await qc.invalidateQueries({ queryKey: ["ticket-offer-variants", ticketOfferId] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement des secteurs impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="space-y-5 border-border/60 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="tracked text-[10px] text-muted-foreground">Secteurs / variantes de prix</p>
          <p className="mt-1 text-xs text-muted-foreground">Un billet peut se vendre à plusieurs prix selon le secteur. Laissez le prix vide tant qu'il n'est pas confirmé.</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addRow}><Plus className="mr-2 h-3.5 w-3.5" />Ajouter un secteur</Button>
      </div>

      {isLoading ? (
        <div className="h-16 animate-pulse rounded-md bg-muted/50" />
      ) : error ? (
        <p className="text-sm text-destructive">Impossible de charger les secteurs : {error instanceof Error ? error.message : "erreur inconnue"}.</p>
      ) : !rows.length ? (
        <p className="text-sm text-muted-foreground">Aucun secteur — ce billet se vend au prix unique ci-dessus.</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.id ?? `new-${i}`} className="grid gap-2 sm:grid-cols-[1fr_110px_90px_90px_auto_auto_auto] sm:items-end">
              <div>{i === 0 && <Label className="mb-1.5 block text-xs">Libellé</Label>}<Input value={r.label} onChange={e => update(i, { label: e.target.value })} placeholder="Norte, Frisa 12 A…" maxLength={120} /></div>
              <div>{i === 0 && <Label className="mb-1.5 block text-xs">Prix public</Label>}<Input type="number" min="0" step="0.01" value={r.public_price ?? ""} onChange={e => update(i, { public_price: e.target.value ? Number(e.target.value) : null })} placeholder="—" /></div>
              <div>{i === 0 && <Label className="mb-1.5 block text-xs">Devise</Label>}<Input value={r.currency} onChange={e => update(i, { currency: e.target.value.toUpperCase() })} maxLength={3} /></div>
              <div>{i === 0 && <Label className="mb-1.5 block text-xs">Places</Label>}<Input type="number" min="0" step="1" value={r.capacity ?? ""} onChange={e => update(i, { capacity: e.target.value ? Number(e.target.value) : null })} placeholder="—" /></div>
              <div className="flex items-center gap-2">{i === 0 && <Label className="mb-1.5 block text-xs sm:hidden">Actif</Label>}<Switch checked={r.is_active} onCheckedChange={x => update(i, { is_active: x })} /></div>
              <div className="flex gap-1"><Button type="button" variant="ghost" size="icon" aria-label="Monter" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="h-3.5 w-3.5" /></Button><Button type="button" variant="ghost" size="icon" aria-label="Descendre" disabled={i === rows.length - 1} onClick={() => move(i, 1)}><ArrowDown className="h-3.5 w-3.5" /></Button></div>
              <Button type="button" variant="ghost" size="icon" aria-label="Supprimer le secteur" onClick={() => removeRow(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>
      )}

      <Button type="button" className="btn-primary" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
        {saving ? "Enregistrement…" : "Enregistrer les secteurs"}
      </Button>
    </Card>
  );
}

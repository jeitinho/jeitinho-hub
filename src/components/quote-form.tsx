import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
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
import { Plus, Trash2, FileDown, Save } from "lucide-react";
import { QUOTE_STATUSES, formatMoney, type QuoteStatus } from "@/lib/quotes/status";
import { downloadQuotePdf } from "@/lib/quotes/download-quote-pdf";

type LineDraft = { id?: string; label: string; unit: string; quantity: number; unit_price: number };

const NEW_CLIENT = "__new__";

function emptyLine(): LineDraft {
  return { label: "", unit: "Forfait", quantity: 1, unit_price: 0 };
}

export function QuoteForm({ quoteId }: { quoteId?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [clientId, setClientId] = useState<string>(NEW_CLIENT);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("Proposition de séjour");
  const [projectLabel, setProjectLabel] = useState("");
  const [location, setLocation] = useState("Rio de Janeiro");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [partySize, setPartySize] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [depositPct, setDepositPct] = useState("30");
  const [validityDays, setValidityDays] = useState("30");
  const [status, setStatus] = useState<QuoteStatus>("draft");
  const [notes, setNotes] = useState("");
  const [number, setNumber] = useState<string | null>(null);
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);

  const { data: clients } = useQuery({
    queryKey: ["clients", "options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,full_name,email,phone")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const { data: existing } = useQuery({
    queryKey: ["quote", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const [{ data: quote, error }, { data: lineRows, error: lineErr }] = await Promise.all([
        supabase.from("quotes").select("*").eq("id", quoteId!).maybeSingle(),
        supabase.from("quote_lines").select("*").eq("quote_id", quoteId!).order("position"),
      ]);
      if (error) throw error;
      if (lineErr) throw lineErr;
      return { quote, lineRows: lineRows ?? [] };
    },
  });

  useEffect(() => {
    const q = existing?.quote;
    if (!q) return;
    setNumber(q.number ?? q.reference);
    setTitle(q.title ?? "");
    setEyebrow(q.eyebrow ?? "");
    setProjectLabel(q.project_label ?? "");
    setLocation(q.location ?? "");
    setPeriodStart(q.period_start ?? "");
    setPeriodEnd(q.period_end ?? "");
    setPartySize(q.party_size ? String(q.party_size) : "");
    setCurrency(q.currency ?? "EUR");
    setDepositPct(String(q.deposit_pct ?? 30));
    setValidityDays(String(q.validity_days ?? 30));
    setStatus(q.status);
    setNotes(q.notes ?? "");
    if (q.client_id) setClientId(q.client_id);
    setLines(
      existing.lineRows.length
        ? existing.lineRows.map((l) => ({
            id: l.id,
            label: l.label,
            unit: l.unit,
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price),
          }))
        : [emptyLine()],
    );
  }, [existing]);

  const selectedClient = clients?.find((c) => c.id === clientId);
  const total = useMemo(
    () => lines.reduce((acc, l) => acc + (Number(l.quantity) || 0) * (Number(l.unit_price) || 0), 0),
    [lines],
  );

  const updateLine = (i: number, patch: Partial<LineDraft>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const pdfData = () => ({
    number: number ?? "—",
    eyebrow,
    title: title || "Devis JEITINHO",
    project_label: projectLabel,
    location,
    currency,
    period_start: periodStart || null,
    period_end: periodEnd || null,
    party_size: partySize ? Number(partySize) : null,
    validity_days: Number(validityDays) || 30,
    deposit_pct: Number(depositPct) || 0,
    notes,
    client: {
      name: selectedClient?.full_name ?? clientName ?? "Client",
      email: selectedClient?.email ?? clientEmail,
      phone: selectedClient?.phone ?? clientPhone,
    },
    lines: lines
      .filter((l) => l.label.trim())
      .map((l) => ({
        label: l.label,
        unit: l.unit,
        quantity: Number(l.quantity) || 0,
        unit_price: Number(l.unit_price) || 0,
      })),
  });

  const save = async () => {
    if (!title.trim()) return toast.error("Le titre du devis est obligatoire.");
    if (clientId === NEW_CLIENT && !clientName.trim())
      return toast.error("Renseignez le nom du client.");
    const validLines = lines.filter((l) => l.label.trim());
    if (!validLines.length) return toast.error("Ajoutez au moins une ligne de prestation.");

    setSaving(true);
    try {
      let resolvedClientId = clientId === NEW_CLIENT ? null : clientId;
      if (!resolvedClientId) {
        const { data: created, error } = await supabase
          .from("clients")
          .insert({
            full_name: clientName.trim(),
            email: clientEmail.trim() || null,
            phone: clientPhone.trim() || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        resolvedClientId = created.id;
      }

      const payload = {
        title: title.trim(),
        eyebrow: eyebrow.trim() || null,
        project_label: projectLabel.trim() || null,
        location: location.trim() || null,
        client_id: resolvedClientId,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        party_size: partySize ? Number(partySize) : null,
        currency,
        deposit_pct: Number(depositPct) || 0,
        validity_days: Number(validityDays) || 30,
        status,
        notes: notes.trim() || null,
        total_amount: total,
        ...(status === "sent" ? { sent_at: new Date().toISOString() } : {}),
        ...(status === "accepted" ? { accepted_at: new Date().toISOString() } : {}),
      };

      let id = quoteId;
      if (id) {
        const { error } = await supabase.from("quotes").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { data: ref, error: refErr } = await supabase.rpc("next_quote_number");
        if (refErr) throw refErr;
        const { data: userData } = await supabase.auth.getUser();
        const { data: created, error } = await supabase
          .from("quotes")
          .insert({
            ...payload,
            reference: ref as string,
            number: ref as string,
            created_by: userData.user?.id ?? null,
          })
          .select("id,number")
          .single();
        if (error) throw error;
        id = created.id;
        setNumber(created.number ?? (ref as string));
      }

      await supabase.from("quote_lines").delete().eq("quote_id", id!);
      const { error: lineErr } = await supabase.from("quote_lines").insert(
        validLines.map((l, i) => ({
          quote_id: id!,
          position: i,
          label: l.label.trim(),
          unit: l.unit.trim() || "Forfait",
          quantity: Number(l.quantity) || 0,
          unit_price: Number(l.unit_price) || 0,
          currency,
        })),
      );
      if (lineErr) throw lineErr;

      await qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success(quoteId ? "Devis enregistré." : "Devis créé.");
      if (!quoteId) navigate({ to: "/devis/$id", params: { id: id! } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 text-lg" style={{ fontFamily: "Fraunces, serif" }}>Client</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Client existant</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW_CLIENT}>Nouveau client…</SelectItem>
                  {clients?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {clientId === NEW_CLIENT ? (
              <>
                <div>
                  <Label>Nom complet</Label>
                  <Input className="mt-1.5" value={clientName} onChange={(e) => setClientName(e.target.value)} maxLength={120} />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input className="mt-1.5" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} maxLength={200} />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input className="mt-1.5" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} maxLength={40} />
                </div>
              </>
            ) : (
              <div className="sm:col-span-2 text-sm text-muted-foreground">
                {selectedClient?.email ?? "—"} · {selectedClient?.phone ?? "—"}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-5">
          <h2 className="mb-4 text-lg" style={{ fontFamily: "Fraunces, serif" }}>Séjour</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Titre du devis</Label>
              <Input className="mt-1.5" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Séjour sur mesure à Rio" maxLength={160} />
            </div>
            <div>
              <Label>Sur-titre</Label>
              <Input className="mt-1.5" value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} maxLength={80} />
            </div>
            <div>
              <Label>Projet / référence interne</Label>
              <Input className="mt-1.5" value={projectLabel} onChange={(e) => setProjectLabel(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>Lieu</Label>
              <Input className="mt-1.5" value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} />
            </div>
            <div>
              <Label>Nombre de personnes</Label>
              <Input className="mt-1.5" type="number" min={1} value={partySize} onChange={(e) => setPartySize(e.target.value)} />
            </div>
            <div>
              <Label>Début du voyage</Label>
              <Input className="mt-1.5" type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
            </div>
            <div>
              <Label>Fin du voyage</Label>
              <Input className="mt-1.5" type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>Prestations</h2>
            <Button variant="outline" size="sm" onClick={() => setLines((p) => [...p, emptyLine()])}>
              <Plus className="mr-2 h-3.5 w-3.5" />Ligne
            </Button>
          </div>
          <div className="space-y-3">
            {lines.map((l, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_110px_90px_110px_36px] sm:items-end">
                <div>
                  {i === 0 && <Label className="mb-1.5 block text-xs">Description</Label>}
                  <Input value={l.label} onChange={(e) => updateLine(i, { label: e.target.value })} placeholder="Transfert privé aéroport" maxLength={200} />
                </div>
                <div>
                  {i === 0 && <Label className="mb-1.5 block text-xs">Unité</Label>}
                  <Input value={l.unit} onChange={(e) => updateLine(i, { unit: e.target.value })} maxLength={40} />
                </div>
                <div>
                  {i === 0 && <Label className="mb-1.5 block text-xs">Qté</Label>}
                  <Input type="number" min={0} step="0.5" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) })} />
                </div>
                <div>
                  {i === 0 && <Label className="mb-1.5 block text-xs">Prix unitaire</Label>}
                  <Input type="number" min={0} step="0.01" value={l.unit_price} onChange={(e) => updateLine(i, { unit_price: Number(e.target.value) })} />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer la ligne"
                  onClick={() => setLines((p) => (p.length > 1 ? p.filter((_, idx) => idx !== i) : p))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-border/60 pt-4">
            <span className="tracked text-[10px] text-muted-foreground">TOTAL</span>
            <span className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>{formatMoney(total, currency)}</span>
          </div>
        </Card>

        <Card className="p-5">
          <Label>Notes</Label>
          <Textarea className="mt-1.5 min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />
        </Card>
      </div>

      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card className="p-5">
          <p className="tracked mb-2 text-[10px] text-muted-foreground">NUMÉRO</p>
          <p className="mb-5 text-lg" style={{ fontFamily: "Fraunces, serif" }}>{number ?? "attribué à l'enregistrement"}</p>

          <Label>Statut</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as QuoteStatus)}>
            <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
            <SelectContent>
              {QUOTE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label>Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Acompte %</Label>
              <Input className="mt-1.5" type="number" min={0} max={100} value={depositPct} onChange={(e) => setDepositPct(e.target.value)} />
            </div>
            <div>
              <Label>Validité (jours)</Label>
              <Input className="mt-1.5" type="number" min={1} value={validityDays} onChange={(e) => setValidityDays(e.target.value)} />
            </div>
          </div>

          <Button className="btn-primary mt-5 w-full" onClick={save} disabled={saving}>
            <Save className="mr-2 h-3.5 w-3.5" />{saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button
            variant="outline"
            className="mt-2 w-full"
            onClick={() => downloadQuotePdf(pdfData()).catch(() => toast.error("Génération du PDF impossible."))}
          >
            <FileDown className="mr-2 h-3.5 w-3.5" />Générer le PDF
          </Button>
        </Card>
      </div>
    </div>
  );
}
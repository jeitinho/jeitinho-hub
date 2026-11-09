import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { ArrowLeft, FileText, Save, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageShell } from "@/components/page-shell";
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
import { fmtMoney } from "@/lib/ops/ops";
import {
  fetchQuoteCandidates,
  importQuoteIntoTrip,
  quoteLabel,
  tripDefaultsFromQuote,
  type QuoteCandidate,
} from "@/lib/ops/trip-from-quote";

export const Route = createFileRoute("/_authenticated/voyages/new")({
  validateSearch: z.object({ quote: z.string().optional() }),
  component: NewTrip,
  head: () => ({ meta: [{ title: "Nouveau voyage — JEITINHO" }] }),
});

const STATUS_LABEL: Record<string, string> = {
  draft: "brouillon",
  sent: "envoyé",
  accepted: "accepté",
  paid: "payé",
  ready: "prêt",
};

function NewTrip() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("none");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [status, setStatus] = useState("draft");
  const [currency, setCurrency] = useState("EUR");
  const [partySize, setPartySize] = useState("");
  const [notes, setNotes] = useState("");
  const [quoteId, setQuoteId] = useState<string | null>(search.quote ?? null);
  const [saving, setSaving] = useState(false);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients", "trip-new"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,full_name")
        .order("full_name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: quotes = [], isLoading: quotesLoading } = useQuery({
    queryKey: ["quotes", "trip-candidates"],
    queryFn: fetchQuoteCandidates,
  });

  const selected = useMemo(() => quotes.find((q) => q.id === quoteId) ?? null, [quotes, quoteId]);
  // Le client choisi a des devis pas encore transformés en voyage : on le propose.
  const clientQuotes = useMemo(
    () => (clientId !== "none" && !quoteId ? quotes.filter((q) => q.client_id === clientId) : []),
    [quotes, clientId, quoteId],
  );

  // Préremplissage quand un devis arrive par l'URL (?quote=…) une fois la liste chargée.
  const [appliedFromUrl, setAppliedFromUrl] = useState(false);
  if (!appliedFromUrl && search.quote && selected) {
    setAppliedFromUrl(true);
    applyQuote(selected);
  }

  function applyQuote(q: QuoteCandidate) {
    const next = tripDefaultsFromQuote(q, { title, clientId, start, end, partySize, currency });
    setQuoteId(q.id);
    setTitle(next.title);
    setClientId(next.clientId);
    setStart(next.start);
    setEnd(next.end);
    setPartySize(next.partySize);
    setCurrency(next.currency);
    if (q.status === "accepted" || q.status === "paid" || q.status === "ready")
      setStatus("confirmed");
  }

  const save = async () => {
    if (!title.trim()) return toast.error("Le titre du voyage est obligatoire.");
    if (start && end && end < start) return toast.error("La date de fin doit être après le début.");
    setSaving(true);
    try {
      const me = await fetch("/api/auth/me", { credentials: "include" })
        .then((r) => r.json())
        .catch(() => null);
      const { data: reference, error: refError } = await supabase.rpc("next_trip_reference");
      if (refError) throw new Error(refError.message);
      const { data, error } = await supabase
        .from("trips")
        .insert({
          reference: reference as string,
          title: title.trim(),
          client_id: clientId === "none" ? null : clientId,
          status,
          start_date: start || null,
          end_date: end || null,
          currency: currency.toUpperCase(),
          party_size: partySize ? Number(partySize) : null,
          source: selected ? "quote" : "manual",
          notes: notes.trim() || null,
          created_by: me?.user?.id ?? null,
        } as never)
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      const tripId = (data as { id: string }).id;
      if (selected) {
        try {
          const n = await importQuoteIntoTrip(tripId, selected.id);
          toast.success(
            `Voyage créé avec ${n} prestation${n > 1 ? "s" : ""} du devis, à placer dans le planning.`,
          );
        } catch (e) {
          toast.warning(
            `Voyage créé, mais les lignes du devis n'ont pas pu être reprises : ${e instanceof Error ? e.message : e}`,
          );
        }
      } else {
        toast.success("Voyage créé.");
      }
      navigate({ to: "/voyages/$id", params: { id: tripId } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impossible de créer le voyage.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      eyebrow="Conciergerie"
      title="Nouveau voyage"
      description="Partez d'un devis existant pour tout reprendre d'un coup, ou créez le voyage à la main."
      actions={
        <Link to="/voyages">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour aux voyages
          </Button>
        </Link>
      }
    >
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="p-5">
          <div className="flex items-start gap-3">
            <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="font-medium">Partir d'un devis</p>
              <p className="text-sm text-muted-foreground">
                Client, dates, voyageurs et prestations sont repris du devis. Les prestations
                arrivent dans « À placer » du planning.
              </p>
              {selected ? (
                <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{quoteLabel(selected)}</p>
                      <p className="text-xs text-muted-foreground">
                        Devis {STATUS_LABEL[selected.status] ?? selected.status}
                        {selected.total_amount != null &&
                          ` · ${fmtMoney(selected.total_amount, (selected.currency || "EUR").toUpperCase())}`}
                        {` · ${selected.line_count} prestation${selected.line_count > 1 ? "s" : ""}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuoteId(null)}
                      aria-label="Ne pas utiliser ce devis"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {selected.line_labels.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {selected.line_labels.slice(0, 12).map((l, i) => (
                        <li key={i} className="rounded-full bg-background px-2 py-0.5 text-xs">
                          {l}
                        </li>
                      ))}
                      {selected.line_labels.length > 12 && (
                        <li className="text-xs text-muted-foreground">
                          +{selected.line_labels.length - 12}
                        </li>
                      )}
                    </ul>
                  )}
                </div>
              ) : (
                <Select
                  value=""
                  onValueChange={(id) => {
                    const q = quotes.find((x) => x.id === id);
                    if (q) applyQuote(q);
                  }}
                >
                  <SelectTrigger className="mt-3">
                    <SelectValue
                      placeholder={
                        quotesLoading
                          ? "Chargement des devis…"
                          : quotes.length
                            ? `Choisir un devis (${quotes.length} sans voyage)`
                            : "Aucun devis en attente de voyage"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {quotes.map((q) => (
                      <SelectItem key={q.id} value={q.id}>
                        {quoteLabel(q)} — {STATUS_LABEL[q.status] ?? q.status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </Card>

        {clientQuotes.length > 0 && (
          <Card className="flex flex-wrap items-center gap-3 border-primary/40 bg-primary/5 p-4">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="flex-1 text-sm">
              Ce client a {clientQuotes.length === 1 ? "un devis" : `${clientQuotes.length} devis`}{" "}
              sans voyage. Remplir le voyage avec ?
            </p>
            {clientQuotes.slice(0, 3).map((q) => (
              <Button key={q.id} size="sm" variant="outline" onClick={() => applyQuote(q)}>
                {q.number || q.reference || "Devis"}
              </Button>
            ))}
          </Card>
        )}

        <Card className="space-y-6 p-6">
          <div>
            <Label>Titre du voyage</Label>
            <Input
              className="mt-1.5"
              placeholder="Anna - Du 15/11 au 28/11"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <Label>Client</Label>
            <Select value={clientId} onValueChange={setClientId}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Choisir un client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun client pour le moment</SelectItem>
                {(clients as { id: string; full_name: string }[]).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <Label>Début</Label>
              <Input
                className="mt-1.5"
                type="date"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <Label>Fin</Label>
              <Input
                className="mt-1.5"
                type="date"
                min={start || undefined}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
            <div>
              <Label>Devise</Label>
              <Input
                className="mt-1.5"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              />
            </div>
            <div>
              <Label>Voyageurs</Label>
              <Input
                className="mt-1.5"
                type="number"
                min="1"
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label>Statut</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="confirmed">Confirmé</SelectItem>
                <SelectItem value="in_progress">En cours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Notes internes</Label>
            <Textarea
              className="mt-1.5 min-h-32"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contexte, demandes client, éléments à organiser…"
            />
          </div>
          <div className="flex justify-end">
            <Button className="btn-primary" onClick={save} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving
                ? "Création…"
                : selected
                  ? "Créer le voyage depuis le devis"
                  : "Créer le voyage"}
            </Button>
          </div>
        </Card>
      </div>
    </PageShell>
  );
}

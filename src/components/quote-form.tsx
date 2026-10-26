/* eslint-disable @typescript-eslint/no-explicit-any -- typage historique du formulaire (lignes et devis lus en any) */
import { useEffect, useMemo, useRef, useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { TextListEditor } from "@/components/quotes/text-list-editor";
import { QUOTE_STATUSES, formatMoney, type QuoteStatus } from "@/lib/quotes/status";
import { downloadQuotePdf } from "@/lib/quotes/download-quote-pdf";
import { fetchQuoteMeta, quoteMetaKey } from "@/lib/quotes/quote-actions";
import type { QuotePdfData } from "@/components/quotes/quote-pdf";
import {
  CatalogLinePicker,
  useCatalogLineOptions,
  type CatalogLineSelection,
  type CatalogOption,
} from "@/components/catalog-line-picker";
import { matchCatalogActivities } from "@/lib/ops/demandes-rules";
import { UnitSelect } from "@/components/line-unit-select";

type LineDraft = {
  id?: string;
  label: string;
  unit: string;
  quantity: number;
  unit_price: number;
  catalogValue: string;
  experience_id?: string | null;
  service_id?: string | null;
  ticket_offer_id?: string | null;
  /** Activité du planning à l'origine de cette ligne (devis généré depuis un voyage). */
  trip_activity_id?: string | null;
  /** « Offert » : affiché 0 € sur le PDF, exclu du total. */
  is_offered: boolean;
  /** « En option » : hors total principal, inclus dans le total « avec options ». */
  is_optional: boolean;
};
const NEW_CLIENT = "__new__";
const NO_PROSPECT = "__none__";
function emptyLine(): LineDraft {
  return {
    label: "",
    unit: "Forfait",
    quantity: 1,
    unit_price: 0,
    catalogValue: "",
    is_offered: false,
    is_optional: false,
  };
}
function catalogLinePatch(selection: CatalogLineSelection, partySize?: number): Partial<LineDraft> {
  return {
    label: selection.label,
    unit: selection.unit,
    // Prix par personne : la quantité suit le nombre de voyageurs (sinon 50 €/pers × 4 pax sortait à 50 €).
    ...(selection.perPerson && partySize && partySize > 0 ? { quantity: partySize } : {}),
    unit_price: selection.unitPrice,
    catalogValue: `${selection.sourceType}:${selection.sourceId}`,
    experience_id: selection.sourceType === "experience" ? selection.sourceId : null,
    service_id: selection.sourceType === "service" ? selection.sourceId : null,
    ticket_offer_id: selection.sourceType === "ticket" ? selection.sourceId : null,
  };
}

export function QuoteForm({
  quoteId,
  initialProspectId,
  initialClientId,
}: {
  quoteId?: string;
  initialProspectId?: string;
  initialClientId?: string;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [clientId, setClientId] = useState(initialClientId ?? NEW_CLIENT);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [prospectId, setProspectId] = useState(initialProspectId ?? NO_PROSPECT);
  const [title, setTitle] = useState("");
  const [eyebrow, setEyebrow] = useState("Proposition de séjour");
  const [description, setDescription] = useState("");
  const [equipmentGroups, setEquipmentGroups] = useState<{ label: string; items: string[] }[]>([]);
  const [includedItems, setIncludedItems] = useState<string[]>([]);
  const [excludedItems, setExcludedItems] = useState<string[]>([]);
  // L'itinéraire du devis n'est plus saisi (le planning du voyage est un document séparé) :
  // on préserve la valeur d'un devis existant sans l'exposer dans le formulaire.
  const [preservedItinerary, setPreservedItinerary] = useState<unknown>([]);
  const [projectLabel, setProjectLabel] = useState("");
  const [location, setLocation] = useState("Rio de Janeiro");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [partySize, setPartySize] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [language, setLanguage] = useState("fr");
  const [depositPct, setDepositPct] = useState("50");
  const [validityDays, setValidityDays] = useState("30");
  const [status, setStatus] = useState<QuoteStatus>("draft");
  // Statut tel qu'en base : les dates (envoi, acceptation, paiement) ne sont posées qu'au changement.
  const [loadedStatus, setLoadedStatus] = useState<QuoteStatus | null>(null);
  const [notes, setNotes] = useState("");
  const [number, setNumber] = useState("");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const { data: clients = [], isFetched: clientsFetched } = useQuery({
    queryKey: ["clients", "options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("id,full_name,email,phone")
        .order("full_name");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  const { data: prospects = [], isFetched: prospectsFetched } = useQuery({
    queryKey: ["prospects", "options"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospects")
        .select("id,name,email,phone,party_size,travel_start,travel_end,activities,client_id")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
  // Préremplissage depuis une demande (/devis/new?prospectId=…) : activités des leads fusionnés.
  const prefillFromProspect = !quoteId && !!initialProspectId;
  const { data: leadActivities = [], isFetched: leadActivitiesFetched } = useQuery({
    queryKey: ["quote-form", "lead-activities", initialProspectId],
    enabled: prefillFromProspect,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("activities")
        .eq("prospect_id", initialProspectId!);
      if (error) throw new Error(error.message);
      return (data ?? []).flatMap((l) => l.activities ?? []);
    },
  });
  const { data: catalogOptions = [], isFetched: catalogFetched } = useCatalogLineOptions(currency);
  const prefilled = useRef({ prospect: false, lines: false });
  const { data: existing } = useQuery({
    queryKey: ["quote", quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const [{ data: quote, error }, { data: lineRows, error: lineErr }] = await Promise.all([
        supabase.from("quotes").select("*").eq("id", quoteId!).maybeSingle(),
        supabase.from("quote_lines").select("*").eq("quote_id", quoteId!).order("position"),
      ]);
      if (error) throw new Error(error.message);
      if (lineErr) throw new Error(lineErr.message);
      return { quote: quote as any, lineRows: (lineRows ?? []) as any[] };
    },
  });

  useEffect(() => {
    const q = (existing as any)?.quote;
    if (!q) return;
    setNumber(q.number ?? q.reference ?? "");
    setTitle(q.title ?? "");
    setEyebrow(q.eyebrow ?? "");
    setDescription(q.description ?? "");
    setProjectLabel(q.project_label ?? "");
    setLocation(q.location ?? "");
    setPeriodStart(q.period_start ?? "");
    setPeriodEnd(q.period_end ?? "");
    setPartySize(q.party_size ? String(q.party_size) : "");
    setCurrency(q.currency ?? "EUR");
    setLanguage(q.language ?? "fr");
    setDepositPct(String(q.deposit_pct ?? 50));
    setValidityDays(String(q.validity_days ?? 30));
    setStatus(q.status);
    setLoadedStatus(q.status);
    setNotes(q.notes ?? "");
    setEquipmentGroups(
      Array.isArray(q.equipment)
        ? q.equipment.filter(
            (g: unknown): g is { label: string; items: string[] } =>
              !!g && typeof g === "object" && Array.isArray((g as { items?: unknown }).items),
          )
        : [],
    );
    setIncludedItems(Array.isArray(q.highlights?.included) ? q.highlights.included : []);
    setExcludedItems(Array.isArray(q.highlights?.excluded) ? q.highlights.excluded : []);
    setPreservedItinerary(Array.isArray(q.itinerary) ? q.itinerary : []);
    if (q.client_id) setClientId(q.client_id);
    if (q.prospect_id) setProspectId(q.prospect_id);
    setLines(
      (existing as any).lineRows.length
        ? (existing as any).lineRows.map((l: any) => ({
            id: l.id,
            label: l.label,
            unit: l.unit,
            quantity: Number(l.quantity),
            unit_price: Number(l.unit_price),
            catalogValue: l.experience_id
              ? `experience:${l.experience_id}`
              : l.service_id
                ? `service:${l.service_id}`
                : l.ticket_offer_id
                  ? `ticket:${l.ticket_offer_id}`
                  : "",
            experience_id: l.experience_id ?? null,
            service_id: l.service_id ?? null,
            ticket_offer_id: l.ticket_offer_id ?? null,
            trip_activity_id: l.trip_activity_id ?? null,
            is_offered: !!l.is_offered,
            is_optional: !!l.is_optional,
          }))
        : [emptyLine()],
    );
  }, [existing]);
  // Le statut peut changer hors du formulaire (paiement enregistré → « Payé » par la base) :
  // on le reprend sans toucher aux autres champs en cours de saisie.
  const { data: meta } = useQuery({
    queryKey: quoteMetaKey(quoteId ?? ""),
    enabled: !!quoteId,
    queryFn: () => fetchQuoteMeta(quoteId!),
  });
  useEffect(() => {
    const dbStatus = meta?.status as QuoteStatus | undefined;
    if (!dbStatus || loadedStatus === null || dbStatus === loadedStatus) return;
    setStatus((current) => (current === loadedStatus ? dbStatus : current));
    setLoadedStatus(dbStatus);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seulement quand la base change
  }, [meta?.status]);
  const selectedClient = (clients as any[]).find((c: any) => c.id === clientId);
  const applyProspect = (id: string) => {
    setProspectId(id);
    if (id === NO_PROSPECT) return;
    const p = (prospects as any[]).find((x: any) => x.id === id);
    if (!p) return;
    if (clientId === NEW_CLIENT) {
      setClientName((v) => v || p.name);
      setClientEmail((v) => v || p.email || "");
      setClientPhone((v) => v || p.phone || "");
      // Client déjà connu (prospect converti, ou même e-mail) : on le reprend plutôt que d'en créer un doublon.
      const email = p.email?.trim().toLowerCase();
      const known = (clients as any[]).find(
        (c: any) => c.id === p.client_id || (!!email && c.email?.trim().toLowerCase() === email),
      );
      if (known) setClientId(known.id);
    }
    setPartySize((v) => v || (p.party_size ? String(p.party_size) : ""));
    setPeriodStart((v) => v || p.travel_start || "");
    setPeriodEnd((v) => v || p.travel_end || "");
  };
  useEffect(() => {
    if (!prefillFromProspect || prefilled.current.prospect) return;
    if (!prospectsFetched || !clientsFetched) return;
    prefilled.current.prospect = true;
    applyProspect(initialProspectId!);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- une seule fois, une fois prospects et clients chargés
  }, [prefillFromProspect, prospectsFetched, clientsFetched, prospects, clients]);
  // Activités demandées → lignes du catalogue (titre identique ou contenu, sans accents).
  useEffect(() => {
    if (!prefillFromProspect || prefilled.current.lines) return;
    if (!prospectsFetched || !catalogFetched || !leadActivitiesFetched) return;
    prefilled.current.lines = true;
    const p = (prospects as any[]).find((x: any) => x.id === initialProspectId);
    const matches = matchCatalogActivities(
      [...(p?.activities ?? []), ...leadActivities],
      catalogOptions as CatalogOption[],
    );
    if (!matches.length) return;
    setLines((current) =>
      current.some((l) => l.label.trim())
        ? current
        : matches.map((o) => ({
            ...emptyLine(),
            ...catalogLinePatch(o, Number(p?.party_size) || undefined),
          })),
    );
    toast.info(
      `${matches.length} prestation${matches.length > 1 ? "s" : ""} reprise${matches.length > 1 ? "s" : ""} de la demande — vérifiez quantités et prix.`,
    );
  }, [
    prefillFromProspect,
    prospectsFetched,
    catalogFetched,
    leadActivitiesFetched,
    prospects,
    leadActivities,
    catalogOptions,
    initialProspectId,
  ]);
  const lineAmount = (line: LineDraft) =>
    line.is_offered ? 0 : (Number(line.quantity) || 0) * (Number(line.unit_price) || 0);
  // Les lignes « Offert » sortent à 0 € ; les lignes « En option » restent hors total principal
  // (affichées « En option », avec un total « avec options » séparé en pied de devis).
  const total = useMemo(
    () => lines.filter((l) => !l.is_optional).reduce((acc, line) => acc + lineAmount(line), 0),
    [lines],
  );
  const totalWithOptions = useMemo(
    () => lines.reduce((acc, line) => acc + lineAmount(line), 0),
    [lines],
  );
  const hasOptionalLines = lines.some((l) => l.is_optional && l.label.trim());
  const updateLine = (index: number, patch: Partial<LineDraft>) =>
    setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)));
  const applyCatalogSelection = (index: number, selection: CatalogLineSelection) =>
    updateLine(index, catalogLinePatch(selection, Number(partySize) || undefined));
  const resolveClientForPdf = async (): Promise<QuotePdfData["client"]> => {
    if (clientId !== NEW_CLIENT) {
      const { data, error } = await supabase
        .from("clients")
        .select("full_name,email,phone")
        .eq("id", clientId)
        .single();
      if (error) throw new Error(error.message);
      return {
        name: (data as any).full_name,
        email: (data as any).email,
        phone: (data as any).phone,
      };
    }
    if (prospectId !== NO_PROSPECT) {
      const { data, error } = await supabase
        .from("prospects")
        .select("name,email,phone")
        .eq("id", prospectId)
        .single();
      if (error) throw new Error(error.message);
      return { name: (data as any).name, email: (data as any).email, phone: (data as any).phone };
    }
    return {
      name: clientName.trim() || "Client",
      email: clientEmail || null,
      phone: clientPhone || null,
    };
  };
  const buildPdfData = async (): Promise<QuotePdfData> => ({
    number: number || "—",
    eyebrow,
    title: title || "Devis JEITINHO",
    description: description.trim() || null,
    project_label: projectLabel,
    location,
    currency,
    language,
    period_start: periodStart || null,
    period_end: periodEnd || null,
    party_size: partySize ? Number(partySize) : null,
    validity_days: Number(validityDays) || 30,
    deposit_pct: Number(depositPct) || 0,
    notes,
    client: await resolveClientForPdf(),
    lines: lines
      .filter((l) => l.label.trim())
      .map((l) => ({
        label: l.label,
        unit: l.unit,
        quantity: Number(l.quantity) || 0,
        unit_price: Number(l.unit_price) || 0,
        is_offered: l.is_offered,
        is_optional: l.is_optional,
      })),
    equipment: equipmentGroups.filter((g) => g.label.trim() || g.items.some((it) => it.trim())),
    highlights: {
      included: includedItems.filter((it) => it.trim()),
      excluded: excludedItems.filter((it) => it.trim()),
    },
    itinerary: preservedItinerary as QuotePdfData["itinerary"],
  });

  const save = async () => {
    if (!title.trim()) return toast.error("Le titre du devis est obligatoire.");
    if (clientId === NEW_CLIENT && !clientName.trim())
      return toast.error("Renseignez le nom du client.");
    const validLines = lines.filter((line) => line.label.trim());
    if (!validLines.length) return toast.error("Ajoutez au moins une ligne de prestation.");
    if (quoteId && !number.trim()) return toast.error("Renseignez le numéro du devis.");
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
            status: "client",
            stage: "nouveau",
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        resolvedClientId = (created as any).id;
        setClientId(resolvedClientId as string);
      }
      const now = new Date().toISOString();
      const statusChanged = !quoteId || status !== loadedStatus;
      const payload: any = {
        title: title.trim(),
        number: number.trim() || undefined,
        eyebrow: eyebrow.trim() || null,
        description: description.trim() || null,
        project_label: projectLabel.trim() || null,
        location: location.trim() || null,
        client_id: resolvedClientId,
        prospect_id: prospectId === NO_PROSPECT ? null : prospectId,
        equipment: equipmentGroups.filter((g) => g.label.trim() || g.items.some((it) => it.trim())),
        highlights: {
          included: includedItems.filter((it) => it.trim()),
          excluded: excludedItems.filter((it) => it.trim()),
        },
        itinerary: preservedItinerary,
        period_start: periodStart || null,
        period_end: periodEnd || null,
        party_size: partySize ? Number(partySize) : null,
        currency,
        language,
        deposit_pct: Number(depositPct) || 0,
        validity_days: Number(validityDays) || 30,
        // Statut envoyé seulement s'il a changé : ne pas écraser un « Payé » posé par la base.
        ...(statusChanged ? { status } : {}),
        notes: notes.trim() || null,
        total_amount: total,
        ...(statusChanged && status === "sent" ? { sent_at: now, followup_anchor_at: now } : {}),
        ...(statusChanged && status === "accepted" ? { accepted_at: now } : {}),
        ...(statusChanged && status === "paid" ? { paid_at: now } : {}),
      };
      let id = quoteId;
      if (!id) {
        const { data: ref, error: refErr } = await supabase.rpc("next_quote_number");
        if (refErr) throw new Error(refErr.message);
        const generatedReference = ref as string;
        const desiredNumber = number.trim() || generatedReference;
        const me = await fetch("/api/auth/me", { credentials: "include" })
          .then((r) => r.json())
          .catch(() => null);
        const { data: created, error } = await supabase
          .from("quotes")
          .insert({
            ...payload,
            reference: generatedReference,
            number: desiredNumber,
            created_by: me?.user?.id ?? null,
          })
          .select("id,number")
          .single();
        if (error) {
          if (error.message.toLowerCase().includes("quotes_number_key"))
            throw new Error("Ce numéro de devis existe déjà.");
          throw new Error(error.message);
        }
        id = (created as any).id;
        setNumber((created as any).number ?? desiredNumber);
      }
      if (id) {
        const { error } = await supabase.from("quotes").update(payload).eq("id", id);
        if (error) {
          if (error.message.toLowerCase().includes("quotes_number_key"))
            throw new Error("Ce numéro de devis existe déjà.");
          throw new Error(error.message);
        }
      }
      const { error: deleteError } = await supabase
        .from("quote_lines")
        .delete()
        .eq("quote_id", id!);
      if (deleteError) throw new Error(deleteError.message);
      const { error: lineError } = await supabase.from("quote_lines").insert(
        validLines.map((line, position) => ({
          quote_id: id!,
          position,
          label: line.label.trim(),
          unit: line.unit.trim() || "Forfait",
          quantity: Number(line.quantity) || 0,
          unit_price: Number(line.unit_price) || 0,
          currency,
          experience_id: line.experience_id ?? null,
          service_id: line.service_id ?? null,
          ticket_offer_id: line.ticket_offer_id ?? null,
          trip_activity_id: line.trip_activity_id ?? null,
          is_offered: line.is_offered,
          is_optional: line.is_optional,
        })) as any,
      );
      if (lineError) throw new Error(lineError.message);
      setLoadedStatus(status);
      await Promise.all(
        [
          ["quotes"],
          ["quote", id],
          ["quote-meta", id],
          ["quote-trip-link", id],
          ["quote-invoice-link", id],
          ["demandes"],
          ["finances"],
        ].map((queryKey) => qc.invalidateQueries({ queryKey })),
      );
      toast.success(quoteId ? "Devis enregistré." : "Devis créé.");
      if (!quoteId) navigate({ to: "/devis/$id", params: { id: id! } });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Card className="p-5">
          <h2 className="mb-4 text-lg" style={{ fontFamily: "Fraunces, serif" }}>
            Client
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Prospect existant (optionnel)</Label>
              <Select value={prospectId} onValueChange={applyProspect}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PROSPECT}>Aucun</SelectItem>
                  {(prospects as any[]).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Client existant</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NEW_CLIENT}>Nouveau client…</SelectItem>
                  {(clients as any[]).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {clientId === NEW_CLIENT ? (
              <>
                <div>
                  <Label>Nom complet</Label>
                  <Input
                    className="mt-1.5"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    maxLength={120}
                  />
                </div>
                <div>
                  <Label>E-mail</Label>
                  <Input
                    className="mt-1.5"
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    maxLength={200}
                  />
                </div>
                <div>
                  <Label>Téléphone</Label>
                  <Input
                    className="mt-1.5"
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    maxLength={40}
                  />
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
          <h2 className="mb-4 text-lg" style={{ fontFamily: "Fraunces, serif" }}>
            Séjour
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Titre du devis</Label>
              <Input
                className="mt-1.5"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Séjour sur mesure à Rio"
                maxLength={160}
              />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                className="mt-1.5 min-h-20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={800}
              />
            </div>
            <div>
              <Label>Sur-titre</Label>
              <Input
                className="mt-1.5"
                value={eyebrow}
                onChange={(e) => setEyebrow(e.target.value)}
                maxLength={80}
              />
            </div>
            <div>
              <Label>Projet / référence interne</Label>
              <Input
                className="mt-1.5"
                value={projectLabel}
                onChange={(e) => setProjectLabel(e.target.value)}
                maxLength={120}
              />
            </div>
            <div>
              <Label>Lieu</Label>
              <Input
                className="mt-1.5"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={120}
              />
            </div>
            <div>
              <Label>Nombre de personnes</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={1}
                value={partySize}
                onChange={(e) => setPartySize(e.target.value)}
              />
            </div>
            <div>
              <Label>Début du voyage</Label>
              <Input
                className="mt-1.5"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
            </div>
            <div>
              <Label>Fin du voyage</Label>
              <Input
                className="mt-1.5"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>
          </div>
        </Card>
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg" style={{ fontFamily: "Fraunces, serif" }}>
              Prestations
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLines((current) => [...current, emptyLine()])}
            >
              <Plus className="mr-2 h-3.5 w-3.5" />
              Ligne
            </Button>
          </div>
          <div className="space-y-4">
            {lines.map((line, index) => (
              <div key={line.id ?? index} className="rounded-lg border border-border/60 p-3">
                <Label className="mb-1.5 block text-xs">Description</Label>
                <CatalogLinePicker
                  value={line.catalogValue}
                  descriptionValue={line.label}
                  onDescriptionChange={(text) =>
                    updateLine(index, {
                      label: text,
                      catalogValue: "",
                      experience_id: null,
                      service_id: null,
                      ticket_offer_id: null,
                    })
                  }
                  currency={currency}
                  onSelect={(selection) => applyCatalogSelection(index, selection)}
                />
                <div className="mt-3 grid gap-2 sm:grid-cols-[110px_90px_110px_36px] sm:items-end">
                  <div>
                    <Label className="mb-1.5 block text-xs">Unité</Label>
                    <UnitSelect
                      value={line.unit}
                      onChange={(unit) => updateLine(index, { unit })}
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">Qté</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label className="mb-1.5 block text-xs">Prix unitaire</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unit_price}
                      onChange={(e) => updateLine(index, { unit_price: Number(e.target.value) })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Supprimer la ligne"
                    onClick={() =>
                      setLines((current) =>
                        current.length > 1 ? current.filter((_, i) => i !== index) : current,
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <div className="mt-2 flex gap-4">
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox
                      checked={line.is_offered}
                      onCheckedChange={(v) => updateLine(index, { is_offered: !!v })}
                    />
                    Offert (0 €, hors total)
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Checkbox
                      checked={line.is_optional}
                      onCheckedChange={(v) => updateLine(index, { is_optional: !!v })}
                    />
                    En option (hors total, ex. version privée, hélico, drone)
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 space-y-1.5 border-t border-border/60 pt-4">
            <div className="flex items-center justify-between">
              <span className="tracked text-[10px] text-muted-foreground">TOTAL</span>
              <span className="text-xl" style={{ fontFamily: "Fraunces, serif" }}>
                {formatMoney(total, currency)}
              </span>
            </div>
            {hasOptionalLines && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Total avec options</span>
                <span>{formatMoney(totalWithOptions, currency)}</span>
              </div>
            )}
          </div>
        </Card>
        <Card className="p-5">
          <Label>Notes</Label>
          <Textarea
            className="mt-1.5 min-h-24"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={2000}
          />
        </Card>
        <Card className="p-5">
          <h2 className="mb-1 text-lg" style={{ fontFamily: "Fraunces, serif" }}>
            Contenu avancé du PDF
          </h2>
          <p className="mb-4 text-xs text-muted-foreground">
            Optionnel — chaque bloc n'apparaît sur le PDF que s'il contient des lignes.
          </p>
          <div className="space-y-5">
            <div>
              <Label>Matériel & prestations techniques</Label>
              <div className="mt-2 space-y-3">
                {equipmentGroups.map((group, gi) => (
                  <div key={gi} className="rounded-md border border-border/60 p-3">
                    <div className="mb-2 flex gap-2">
                      <Input
                        className="h-8 text-xs"
                        placeholder="Nom du groupe (ex. Matériel photo)"
                        value={group.label}
                        onChange={(e) =>
                          setEquipmentGroups((gs) =>
                            gs.map((g, i) => (i === gi ? { ...g, label: e.target.value } : g)),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        aria-label="Supprimer ce groupe"
                        onClick={() => setEquipmentGroups((gs) => gs.filter((_, i) => i !== gi))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <TextListEditor
                      items={group.items}
                      placeholder="Élément"
                      addLabel="Ajouter un élément"
                      onChange={(items) =>
                        setEquipmentGroups((gs) =>
                          gs.map((g, i) => (i === gi ? { ...g, items } : g)),
                        )
                      }
                    />
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEquipmentGroups((gs) => [...gs, { label: "", items: [""] }])}
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Ajouter un groupe
                </Button>
              </div>
            </div>
            <div>
              <Label>Ce qui est inclus</Label>
              <div className="mt-2">
                <TextListEditor
                  items={includedItems}
                  onChange={setIncludedItems}
                  placeholder="Inclus"
                />
              </div>
            </div>
            <div>
              <Label>Ce qui n'est pas inclus</Label>
              <div className="mt-2">
                <TextListEditor
                  items={excludedItems}
                  onChange={setExcludedItems}
                  placeholder="Exclu"
                />
              </div>
            </div>
          </div>
        </Card>
      </div>
      <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">
        <Card className="p-5">
          <p className="tracked mb-2 text-[10px] text-muted-foreground">NUMÉRO DU DEVIS</p>
          <Input
            className="mb-5 mt-1.5"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="2026-005"
            maxLength={50}
          />
          <Label>Statut</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as QuoteStatus)}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUOTE_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <Label>Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="BRL">BRL</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Langue du PDF</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">Français</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="pt">Português</SelectItem>
                  <SelectItem value="es">Español</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Acompte %</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={0}
                max={100}
                value={depositPct}
                onChange={(e) => setDepositPct(e.target.value)}
              />
            </div>
            <div>
              <Label>Validité (jours)</Label>
              <Input
                className="mt-1.5"
                type="number"
                min={1}
                value={validityDays}
                onChange={(e) => setValidityDays(e.target.value)}
              />
            </div>
          </div>
          <Button className="btn-primary mt-5 w-full" onClick={save} disabled={saving}>
            <Save className="mr-2 h-3.5 w-3.5" />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </Button>
          <Button
            variant="outline"
            className="mt-2 w-full"
            disabled={downloadingPdf}
            onClick={async () => {
              setDownloadingPdf(true);
              try {
                await downloadQuotePdf(await buildPdfData());
              } catch {
                toast.error("Génération du PDF impossible.");
              } finally {
                setDownloadingPdf(false);
              }
            }}
          >
            <FileDown className="mr-2 h-3.5 w-3.5" />
            {downloadingPdf ? "Génération…" : "Générer le PDF"}
          </Button>
        </Card>
      </div>
    </div>
  );
}

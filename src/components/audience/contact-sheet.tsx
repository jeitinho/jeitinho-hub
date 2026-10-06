import { useEffect, useState, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, MessageCircle, X } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fmtDateTime, fmtMoney } from "@/lib/ops/ops";
import {
  ENGAGEMENT_LABELS,
  GENDER_LABELS,
  ORIGIN_LABELS,
  contactName,
  updateAudienceTags,
  waLink,
  type AudienceContact,
} from "@/lib/ops/audience";

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { timeZone: "America/Sao_Paulo" });
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-1.5 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value ?? "—"}</span>
    </div>
  );
}

export function ContactSheet({
  contact,
  onOpenChange,
  onSaved,
}: {
  contact: AudienceContact | null;
  onOpenChange: (open: boolean) => void;
  onSaved: (contact: AudienceContact) => void;
}) {
  const qc = useQueryClient();
  const [tags, setTags] = useState<string[]>([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setTags(contact?.tags ?? []);
    setDraft("");
  }, [contact]);

  const save = useMutation({
    mutationFn: (next: string[]) => updateAudienceTags(contact!.id, next),
    onSuccess: (_data, next) => {
      toast.success("Tags enregistrés");
      if (contact) onSaved({ ...contact, tags: next });
      qc.invalidateQueries({ queryKey: ["audience", "page"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!contact) return <Sheet open={false} onOpenChange={onOpenChange} />;

  const wa = waLink(contact.phone);
  const dirty = tags.join("|") !== (contact.tags ?? []).join("|");
  const addTag = () => {
    const t = draft.trim().toLowerCase().replace(/\s+/g, "_");
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setDraft("");
  };

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{contactName(contact)}</SheetTitle>
          <SheetDescription>
            {contact.external_ref ?? "—"} · ajouté le {fmtDate(contact.added_at)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 flex flex-wrap gap-2">
          {wa ? (
            <Button asChild size="sm" className="btn-primary">
              <a href={wa} target="_blank" rel="noreferrer">
                <MessageCircle className="mr-1.5 h-4 w-4" />
                WhatsApp
              </a>
            </Button>
          ) : (
            <Button size="sm" variant="outline" disabled>
              <MessageCircle className="mr-1.5 h-4 w-4" />
              Pas de téléphone
            </Button>
          )}
          {contact.email && (
            <Button asChild size="sm" variant="outline">
              <a href={`mailto:${contact.email}`}>
                <Mail className="mr-1.5 h-4 w-4" />
                E-mail
              </a>
            </Button>
          )}
        </div>

        <div
          className={`mt-4 rounded-md px-3 py-2 text-xs ${
            contact.newsletter_optin
              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "bg-amber-500/10 text-amber-800 dark:text-amber-300"
          }`}
        >
          {contact.newsletter_optin
            ? "Opt-in newsletter : e-mails marketing autorisés."
            : "Pas d'opt-in newsletter : aucun e-mail marketing. Échanges individuels uniquement."}
        </div>

        <section className="mt-5">
          <h3 className="tracked mb-1 text-[10px] text-muted-foreground">Coordonnées</h3>
          <Row label="E-mail" value={contact.email} />
          <Row label="Téléphone" value={contact.phone} />
          <Row
            label="Localisation"
            value={[contact.city, contact.country].filter(Boolean).join(", ") || null}
          />
          <Row label="Zone" value={contact.zone} />
          <Row label="Âge" value={contact.age} />
          <Row
            label="Genre"
            value={contact.gender ? (GENDER_LABELS[contact.gender] ?? contact.gender) : null}
          />
        </section>

        <section className="mt-5">
          <h3 className="tracked mb-1 text-[10px] text-muted-foreground">Historique</h3>
          <Row label="Dernier achat" value={fmtDate(contact.last_purchase_at)} />
          <Row label="Récence" value={contact.recency} />
          <Row label="Billets" value={contact.tickets_count ?? 0} />
          <Row label="Événements" value={contact.events_count ?? 0} />
          <Row label="Total dépensé" value={fmtMoney(contact.total_spent, "EUR")} />
        </section>

        <section className="mt-5">
          <h3 className="tracked mb-1 text-[10px] text-muted-foreground">Segmentation</h3>
          <Row
            label="Engagement"
            value={
              contact.engagement
                ? (ENGAGEMENT_LABELS[contact.engagement] ?? contact.engagement)
                : null
            }
          />
          <Row label="Score" value={contact.score} />
          <Row
            label="Origine"
            value={contact.origin ? (ORIGIN_LABELS[contact.origin] ?? contact.origin) : null}
          />
          <Row label="Segment" value={contact.segment} />
          <Row label="Notifications" value={contact.notifications_optin ? "Oui" : "Non"} />
        </section>

        <section className="mt-5">
          <h3 className="tracked mb-2 text-[10px] text-muted-foreground">Tags</h3>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {tags.length === 0 && <span className="text-xs text-muted-foreground">Aucun tag.</span>}
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1 pr-1">
                {t}
                <button
                  type="button"
                  aria-label={`Retirer ${t}`}
                  className="rounded-sm p-0.5 hover:bg-background/60"
                  onClick={() => setTags(tags.filter((x) => x !== t))}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              addTag();
            }}
          >
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ajouter un tag (Entrée)"
              className="h-8"
            />
            <Button type="submit" size="sm" variant="outline" disabled={!draft.trim()}>
              Ajouter
            </Button>
          </form>
          <div className="mt-3 flex justify-end gap-2">
            {dirty && (
              <Button size="sm" variant="ghost" onClick={() => setTags(contact.tags ?? [])}>
                Annuler
              </Button>
            )}
            <Button
              size="sm"
              className="btn-primary"
              disabled={!dirty || save.isPending}
              onClick={() => save.mutate(tags)}
            >
              {save.isPending ? "Enregistrement…" : "Enregistrer les tags"}
            </Button>
          </div>
        </section>

        <p className="mt-6 text-xs text-muted-foreground">
          Fiche importée le {fmtDateTime(contact.created_at)}
        </p>
      </SheetContent>
    </Sheet>
  );
}

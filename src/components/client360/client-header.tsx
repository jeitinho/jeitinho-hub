import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { FilePlus2, Languages, Mail, MessageCircle, NotebookPen, Phone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ClientRecord } from "@/lib/clients-gateway";
import {
  CLIENT_INBOX_ACCOUNT,
  firstName,
  gmailComposeLink,
  whatsappLink,
  type Client360,
} from "@/lib/ops/client360";
import { SourceBadge } from "./bits";

/** En-tête de la fiche : source, langue, coordonnées et actions rapides. */
export function ClientHeader({
  client,
  view,
  onAddNote,
}: {
  client: ClientRecord;
  view: Client360 | null;
  onAddNote: (text: string) => Promise<boolean>;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const hello = `Bonjour ${firstName(client.full_name)},\n\n`;
  const wa = whatsappLink(client.phone, hello.trim());
  const mail = client.email
    ? gmailComposeLink({ to: client.email, subject: "JEITINHO", body: hello })
    : null;

  const saveNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    const ok = await onAddNote(note);
    setSaving(false);
    if (ok) {
      setNote("");
      setNoteOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <SourceBadge source={client.source} />
        {view?.language && (
          <span
            className="inline-flex items-center gap-1 text-muted-foreground"
            title={`D'après : ${view.language.from}`}
          >
            <Languages className="h-3.5 w-3.5" />
            {view.language.label}
          </span>
        )}
        {client.status && client.status !== "client" && (
          <span className="pill !px-2 !py-0.5 !text-[10px]">{client.status}</span>
        )}
        {client.legal_type === "company" && client.company_name && (
          <span className="text-muted-foreground">{client.company_name}</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
        {client.email ? (
          <a
            href={mail ?? undefined}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-w-0 items-center gap-1.5 break-all text-primary hover:underline"
            title={`Écrire depuis ${CLIENT_INBOX_ACCOUNT} (contact@jeitinho.fr)`}
          >
            <Mail className="h-3.5 w-3.5 shrink-0" />
            {client.email}
          </a>
        ) : (
          <span className="text-muted-foreground">Pas d'e-mail</span>
        )}
        {client.phone ? (
          <a
            href={`tel:${client.phone.replace(/[^\d+]/g, "")}`}
            className="inline-flex items-center gap-1.5 text-primary hover:underline"
          >
            <Phone className="h-3.5 w-3.5" />
            {client.phone}
          </a>
        ) : (
          <span className="text-muted-foreground">Pas de téléphone</span>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {wa ? (
          <Button asChild size="sm" variant="outline">
            <a href={wa} target="_blank" rel="noreferrer">
              <MessageCircle className="mr-1.5 h-4 w-4" />
              WhatsApp
            </a>
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled title="Aucun téléphone sur la fiche">
            <MessageCircle className="mr-1.5 h-4 w-4" />
            WhatsApp
          </Button>
        )}
        {mail ? (
          <Button asChild size="sm" variant="outline">
            <a href={mail} target="_blank" rel="noreferrer" title="Boîte contact@jeitinho.fr">
              <Mail className="mr-1.5 h-4 w-4" />
              E-mail
            </a>
          </Button>
        ) : (
          <Button size="sm" variant="outline" disabled title="Aucun e-mail sur la fiche">
            <Mail className="mr-1.5 h-4 w-4" />
            E-mail
          </Button>
        )}
        <Button asChild size="sm">
          <Link to="/devis/new" search={{ clientId: client.id }}>
            <FilePlus2 className="mr-1.5 h-4 w-4" />
            Créer un devis
          </Link>
        </Button>
        <Button
          size="sm"
          variant={noteOpen ? "secondary" : "outline"}
          onClick={() => setNoteOpen((o) => !o)}
        >
          <NotebookPen className="mr-1.5 h-4 w-4" />
          Ajouter une note
        </Button>
      </div>

      {noteOpen && (
        <div className="space-y-2 rounded-lg border border-border/70 p-3">
          <Textarea
            autoFocus
            rows={3}
            value={note}
            placeholder="Ex. Appel : souhaite décaler au 28/12, attend le devis vol."
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void saveNote();
              if (e.key === "Escape") setNoteOpen(false);
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-muted-foreground">
              Ajoutée en tête des notes, horodatée (heure de Rio). Ctrl/⌘ + Entrée pour enregistrer.
            </p>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setNoteOpen(false)}>
                Annuler
              </Button>
              <Button
                size="sm"
                disabled={saving || !note.trim()}
                onClick={() => {
                  if (!note.trim()) toast.error("La note est vide.");
                  else void saveNote();
                }}
              >
                {saving ? "Enregistrement…" : "Enregistrer la note"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

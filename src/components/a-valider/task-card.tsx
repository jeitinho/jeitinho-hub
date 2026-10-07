import { useState } from "react";
import { Check, CheckCircle2, Clock, Copy, Instagram, Pencil, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { TASK_KIND_LABELS, fmtDateTime } from "@/lib/ops/ops";
import { CHANNEL_LABELS, CHANNEL_TARGETS, missingReason, type SendOption } from "@/lib/ops/send";
import { copyBeforeOpen, type ValidationActions } from "./use-validation-actions";
import {
  AltChannels,
  ChannelHint,
  ContactFicheLink,
  LangChips,
  MessagePreview,
  NotesBox,
  RecipientLine,
  SendLink,
  SourceLink,
  type QueueItem,
} from "./shared";

export function TaskCard({
  item,
  actions,
  onLang,
}: {
  item: QueueItem;
  actions: ValidationActions;
  onLang: (key: string) => void;
}) {
  const { task, plan } = item;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const overdue = new Date(task.due_at).getTime() < Date.now();
  const name = plan.contact.name;

  const sent = (o: SendOption) =>
    actions.send(task, name, {
      description: o.copyFirst ? "Texte copié, à coller dans la conversation." : undefined,
    });

  const startEdit = () => {
    setDraft(task.message_draft ?? "");
    setEditing(true);
  };
  const save = async () => {
    setSaving(true);
    const ok = await actions.saveDraft(task, draft);
    setSaving(false);
    if (ok) setEditing(false);
  };

  return (
    <Card className="grid gap-4 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-x-6">
      {/* Contexte + destinataire */}
      <div className="min-w-0 space-y-3 lg:col-start-1 lg:row-start-1">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{TASK_KIND_LABELS[task.kind] ?? task.kind}</Badge>
            <span className="pill">{CHANNEL_LABELS[task.channel] ?? task.channel}</span>
            <span className={`text-xs ${overdue ? "text-destructive" : "text-muted-foreground"}`}>
              échéance {fmtDateTime(task.due_at)}
            </span>
          </div>
          <h3 className="break-words text-sm text-muted-foreground">{task.title}</h3>
          <SourceLink task={task} />
        </div>
        <RecipientLine plan={plan} />
        <NotesBox notes={plan.parsed.notes} />
      </div>

      {/* Texte final */}
      <div className="min-w-0 space-y-2 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        {editing ? (
          <div className="space-y-2">
            <Textarea
              rows={12}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void save();
                if (e.key === "Escape") setEditing(false);
              }}
            />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                <CheckCircle2 />
                Enregistrer
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <>
            <LangChips plan={plan} onChange={onLang} />
            <MessagePreview plan={plan} />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="min-w-0 space-y-2 lg:col-start-1 lg:row-start-2 lg:self-end">
        {plan.primary && plan.hasDraft ? (
          <>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <SendLink
                primary
                option={plan.primary}
                text={plan.text}
                onSent={sent}
                className="w-full sm:w-auto"
              />
              <AltChannels plan={plan} onSent={sent} />
            </div>
            <ChannelHint plan={plan} />
          </>
        ) : (
          <div className="space-y-2">
            {plan.hasDraft && (
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <Button className="h-11 w-full sm:w-auto" onClick={() => actions.copy(plan.text)}>
                  <Copy />
                  Copier le message
                </Button>
                {plan.planned === "instagram" && !plan.contact.instagram && (
                  <Button asChild variant="outline" className="h-10">
                    <a
                      href="https://www.instagram.com/"
                      target={CHANNEL_TARGETS.instagram}
                      onClick={() => copyBeforeOpen(plan.text)}
                    >
                      <Instagram />
                      Copier et ouvrir Instagram
                    </a>
                  </Button>
                )}
                {plan.alternatives.map((o) => (
                  <SendLink key={o.channel} option={o} text={plan.text} onSent={sent} />
                ))}
              </div>
            )}
            {plan.missing && (
              <>
                <p className="text-xs text-amber-700 dark:text-amber-300">{missingReason(plan)}</p>
                <ContactFicheLink item={item} />
              </>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-1">
          {plan.primary && plan.hasDraft && (
            <Button variant="ghost" size="sm" onClick={() => actions.copy(plan.text)}>
              <Copy />
              Copier
            </Button>
          )}
          {!plan.primary && plan.hasDraft && (
            <Button variant="ghost" size="sm" onClick={() => actions.send(task, name)}>
              <Check />
              Marquer envoyé
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={editing ? () => setEditing(false) : startEdit}>
            <Pencil />
            {editing ? "Fermer" : plan.hasDraft ? "Modifier" : "Rédiger"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => actions.snooze(task)}>
            <Clock />
            +2 j
          </Button>
          <Button variant="ghost" size="sm" onClick={() => actions.discard(task)}>
            <X />
            Écarter
          </Button>
        </div>
      </div>
    </Card>
  );
}

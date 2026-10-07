import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Copy, Pencil, Repeat, SkipForward, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { TASK_KIND_LABELS } from "@/lib/ops/ops";
import { CHANNEL_LABELS, missingReason, type SendOption } from "@/lib/ops/send";
import type { ValidationActions } from "./use-validation-actions";
import {
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

type Outcome = "sent" | "skipped" | "discarded";

const SECONDARY = "h-12 gap-1.5 px-2 text-[13px] sm:px-3 sm:text-sm";

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="ml-1 hidden rounded border border-current/30 px-1 font-sans text-[10px] opacity-70 sm:inline">
      {children}
    </kbd>
  );
}

/**
 * Mode rafale : une tâche à la fois, envoi au clavier (Entrée, →, M, E, Échap, L),
 * passage automatique à la suivante, récap en fin de série.
 */
export function BurstMode({
  ids,
  getItem,
  isFetching,
  actions,
  onLang,
  onClose,
  scopeLabel,
}: {
  ids: string[];
  getItem: (id: string) => QueueItem | undefined;
  isFetching: boolean;
  actions: ValidationActions;
  onLang: (taskId: string, key: string) => void;
  onClose: () => void;
  scopeLabel: string;
}) {
  const [queue, setQueue] = useState<string[]>(ids);
  const [index, setIndex] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<string, Outcome>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const sendRef = useRef<HTMLAnchorElement>(null);

  const done = index >= queue.length;
  const currentId = done ? undefined : queue[index];
  const item = currentId ? getItem(currentId) : undefined;

  const next = useCallback(() => {
    setEditing(false);
    setIndex((i) => i + 1);
  }, []);
  const record = (id: string, o: Outcome) => setOutcomes((prev) => ({ ...prev, [id]: o }));
  const requeue = useCallback((id: string) => {
    setOutcomes((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
    setQueue((q) => [...q, id]);
  }, []);

  // Tâche disparue entre-temps (traitée ailleurs) : on passe sans la compter.
  useEffect(() => {
    if (!done && currentId && !item && !isFetching) setIndex((i) => i + 1);
  }, [done, currentId, item, isFetching]);

  // Verrou du défilement de la page derrière la vue focalisée.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Focus sur la vue (et pas sur le dernier bouton cliqué) pour que Entrée envoie.
  useEffect(() => {
    rootRef.current?.focus({ preventScroll: true });
    mainRef.current?.scrollTo({ top: 0 });
  }, [index]);

  const onSent = (o: SendOption) => {
    if (!item) return;
    const { task, plan } = item;
    record(task.id, "sent");
    void actions.send(task, plan.contact.name, {
      description: o.copyFirst ? "Texte copié, à coller dans la conversation." : undefined,
      onUndo: () => requeue(task.id),
    });
    next();
  };
  const sendCurrent = () => {
    if (!item) return;
    const { plan } = item;
    if (!plan.hasDraft) return startEdit();
    if (plan.primary) sendRef.current?.click();
    else void actions.copy(plan.text);
  };
  const skip = () => {
    if (!item) return;
    record(item.task.id, "skipped");
    next();
  };
  const discard = () => {
    if (!item) return;
    const id = item.task.id;
    record(id, "discarded");
    void actions.discard(item.task, { onUndo: () => requeue(id) });
    next();
  };
  const markSentManually = () => {
    if (!item) return;
    const { task, plan } = item;
    record(task.id, "sent");
    void actions.send(task, plan.contact.name, { onUndo: () => requeue(task.id) });
    next();
  };
  const startEdit = () => {
    if (!item) return;
    setDraft(item.task.message_draft ?? "");
    setEditing(true);
  };
  const saveEdit = async () => {
    if (!item) return;
    setSaving(true);
    const ok = await actions.saveDraft(item.task, draft);
    setSaving(false);
    if (ok) {
      setEditing(false);
      rootRef.current?.focus({ preventScroll: true });
    }
  };
  const cycleLang = () => {
    if (!item) return;
    const keys = [...item.plan.parsed.sections.map((s) => s.key), "all"];
    if (keys.length < 3) return;
    const i = keys.indexOf(item.plan.langKey);
    onLang(item.task.id, keys[(i + 1) % keys.length]);
  };
  const restartSkipped = () => {
    const skipped = [...new Set(queue.filter((id) => outcomes[id] === "skipped"))];
    setOutcomes((prev) => {
      const copy = { ...prev };
      for (const id of skipped) delete copy[id];
      return copy;
    });
    setQueue(skipped);
    setIndex(0);
  };

  // Raccourcis clavier (référence mise à jour à chaque rendu).
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => undefined);
  useEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      // Touche maintenue : jamais d'envois en série involontaires.
      if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (editing) setEditing(false);
        else onClose();
        return;
      }
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable='true']")) return;
      if (done || !item || editing) return;
      // Entrée sur un bouton / lien ciblé : on laisse le comportement natif.
      if (e.key === "Enter" && el?.closest("button, a")) return;
      const k = e.key.toLowerCase();
      if (e.key === "Enter") sendCurrent();
      else if (e.key === "ArrowRight") skip();
      else if (k === "m") startEdit();
      else if (k === "e") discard();
      else if (k === "l") cycleLang();
      else return;
      e.preventDefault();
    };
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  const total = queue.length;
  const counts = { sent: 0, skipped: 0, discarded: 0 };
  for (const o of Object.values(outcomes)) counts[o]++;
  const position = Math.min(index + 1, total);

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label="Envoi en rafale"
      className="fixed inset-0 z-50 flex flex-col bg-background outline-none"
    >
      <header className="border-b border-border/60 px-4 py-3">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-muted-foreground">Enchaîner · {scopeLabel}</p>
            <p className="text-sm font-medium tabular-nums">
              {done ? "Série terminée" : `${position} / ${total}`}
            </p>
            <Progress
              className="mt-1.5 h-1.5"
              value={total ? (Math.min(index, total) / total) * 100 : 100}
            />
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X />
            Quitter
            <Kbd>Échap</Kbd>
          </Button>
        </div>
      </header>

      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-4 px-4 py-5">
          {done ? (
            <div className="space-y-6 py-6 text-center">
              <h2 className="text-2xl" style={{ fontFamily: "Fraunces, serif" }}>
                Série terminée
              </h2>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ["sent", "envoyés"],
                    ["skipped", "passés"],
                    ["discarded", "écartés"],
                  ] as const
                ).map(([k, label]) => (
                  <div key={k} className="rounded-lg border border-border/60 p-3">
                    <p className="text-2xl font-medium tabular-nums">{counts[k]}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                {counts.skipped > 0 && (
                  <Button variant="outline" className="h-11" onClick={restartSkipped}>
                    <Repeat />
                    Reprendre les passés ({counts.skipped})
                  </Button>
                )}
                <Button className="h-11" onClick={onClose}>
                  Fermer
                </Button>
              </div>
            </div>
          ) : !item ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">
                  {TASK_KIND_LABELS[item.task.kind] ?? item.task.kind}
                </Badge>
                <span className="pill">
                  {CHANNEL_LABELS[item.plan.primary?.channel ?? item.task.channel] ??
                    item.task.channel}
                </span>
              </div>
              <RecipientLine plan={item.plan} large />
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="min-w-0 break-words text-xs text-muted-foreground">
                  {item.task.title}
                </p>
                <SourceLink task={item.task} />
              </div>
              <NotesBox notes={item.plan.parsed.notes} />

              {item.plan.missing && (
                <div className="space-y-2 rounded-md border border-dashed p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    {missingReason(item.plan)}
                  </p>
                  <ContactFicheLink item={item} />
                </div>
              )}
              {item.plan.hasDraft && item.plan.alternatives.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {item.plan.alternatives.map((o) => (
                    <SendLink
                      key={o.channel}
                      option={o}
                      text={item.plan.text}
                      onSent={onSent}
                      className="h-9 max-w-full text-xs"
                    />
                  ))}
                </div>
              )}

              {editing ? (
                <Textarea
                  rows={14}
                  value={draft}
                  autoFocus
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      void saveEdit();
                    }
                  }}
                />
              ) : (
                <>
                  <LangChips
                    plan={item.plan}
                    onChange={(k) => {
                      onLang(item.task.id, k);
                      rootRef.current?.focus({ preventScroll: true });
                    }}
                    hint={
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        touche L
                      </span>
                    }
                  />
                  <MessagePreview plan={item.plan} full />
                  <ChannelHint plan={item.plan} />
                </>
              )}
            </>
          )}
        </div>
      </main>

      {!done && item && (
        <footer className="border-t border-border/60 bg-background px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3">
          <div className="mx-auto flex max-w-2xl flex-col gap-2 sm:flex-row">
            {editing ? (
              <>
                <Button className="h-12 w-full sm:flex-1" onClick={saveEdit} disabled={saving}>
                  <CheckCircle2 />
                  Enregistrer
                  <Kbd>⌘⏎</Kbd>
                </Button>
                <Button variant="outline" className="h-12" onClick={() => setEditing(false)}>
                  Annuler
                  <Kbd>Échap</Kbd>
                </Button>
              </>
            ) : (
              <>
                {item.plan.primary && item.plan.hasDraft ? (
                  <SendLink
                    primary
                    option={item.plan.primary}
                    text={item.plan.text}
                    onSent={onSent}
                    linkRef={sendRef}
                    className="h-12 w-full sm:flex-1"
                    suffix={<Kbd>⏎</Kbd>}
                  />
                ) : item.plan.hasDraft ? (
                  <div className="flex gap-2 sm:flex-1">
                    <Button
                      className="h-12 flex-1"
                      onClick={() => void actions.copy(item.plan.text)}
                    >
                      <Copy />
                      Copier
                      <Kbd>⏎</Kbd>
                    </Button>
                    <Button variant="outline" className="h-12 flex-1" onClick={markSentManually}>
                      Marquer envoyé
                    </Button>
                  </div>
                ) : (
                  <Button className="h-12 w-full sm:flex-1" onClick={startEdit}>
                    <Pencil />
                    Rédiger
                    <Kbd>M</Kbd>
                  </Button>
                )}
                <div className="grid grid-cols-3 gap-2 sm:flex">
                  <Button variant="outline" className={SECONDARY} onClick={skip}>
                    <SkipForward />
                    Passer
                    <Kbd>→</Kbd>
                  </Button>
                  <Button variant="outline" className={SECONDARY} onClick={startEdit}>
                    <Pencil />
                    Modifier
                    <Kbd>M</Kbd>
                  </Button>
                  <Button variant="outline" className={SECONDARY} onClick={discard}>
                    <X />
                    Écarter
                    <Kbd>E</Kbd>
                  </Button>
                </div>
              </>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}

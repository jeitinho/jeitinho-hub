import { Link } from "@tanstack/react-router";
import { useState, type ReactNode, type Ref } from "react";
import {
  ChevronDown,
  ExternalLink,
  Instagram,
  Mail,
  MessageCircle,
  Phone,
  TriangleAlert,
  UserX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { copyBeforeOpen } from "./use-validation-actions";
import type { ValidationTask } from "@/lib/ops/ops";
import {
  CHANNEL_LABELS,
  CHANNEL_TARGETS,
  GMAIL_ACCOUNTS,
  GMAIL_BOX_LABELS,
  instagramDmUrl,
  whatsappUrl,
  type ChannelBucket,
  type SendOption,
  type SendPlan,
} from "@/lib/ops/send";

export type QueueItem = { task: ValidationTask; plan: SendPlan };

export function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
  const cls = cn("h-4 w-4 shrink-0", className);
  if (channel === "whatsapp") return <MessageCircle className={cls} />;
  if (channel === "email") return <Mail className={cls} />;
  if (channel === "instagram") return <Instagram className={cls} />;
  return <UserX className={cls} />;
}

const PRIMARY_LABELS: Record<string, string> = {
  whatsapp: "Envoyer sur WhatsApp",
  email: "Ouvrir dans Gmail",
  instagram: "Copier et ouvrir Instagram",
};

/**
 * Lien d'envoi : ouvre WhatsApp / Gmail / Instagram (copie d'abord pour Instagram)
 * puis signale l'envoi au parent, qui passe la tâche en « envoyé ».
 * Le signal est différé d'un tour : la carte peut disparaître sans annuler la navigation.
 */
export function SendLink({
  option,
  text,
  onSent,
  primary = false,
  className,
  linkRef,
  suffix,
}: {
  option: SendOption;
  text: string;
  onSent: (option: SendOption) => void;
  primary?: boolean;
  className?: string;
  linkRef?: Ref<HTMLAnchorElement>;
  suffix?: ReactNode;
}) {
  return (
    <Button
      asChild
      variant={primary ? "default" : "outline"}
      className={cn(primary ? "h-11 text-sm" : "h-10", "min-w-0", className)}
    >
      <a
        ref={linkRef}
        href={option.href}
        target={CHANNEL_TARGETS[option.channel]}
        onClick={() => {
          if (option.copyFirst) copyBeforeOpen(text);
          window.setTimeout(() => onSent(option), 0);
        }}
      >
        <ChannelIcon channel={option.channel} />
        <span className="truncate">
          {primary
            ? PRIMARY_LABELS[option.channel]
            : `${CHANNEL_LABELS[option.channel]} · ${option.target}`}
        </span>
        {suffix}
      </a>
    </Button>
  );
}

/** Autres canaux possibles avec les contacts connus (dépliés au clic). */
export function AltChannels({
  plan,
  onSent,
}: {
  plan: SendPlan;
  onSent: (option: SendOption) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!plan.alternatives.length || !plan.hasDraft) return null;
  if (!open)
    return (
      <Button variant="outline" className="h-11" onClick={() => setOpen(true)}>
        Autre canal
        <ChevronDown />
      </Button>
    );
  return (
    <>
      {plan.alternatives.map((o) => (
        <SendLink key={o.channel} option={o} text={plan.text} onSent={onSent} />
      ))}
    </>
  );
}

/** Lien vers l'objet d'origine de la tâche (client, devis, partenaire, demande). */
export function SourceLink({ task, label }: { task: ValidationTask; label?: string }) {
  const cls = "inline-flex items-center gap-1 text-xs text-primary hover:underline";
  const icon = <ExternalLink className="h-3 w-3" />;
  if (task.quote_id)
    return (
      <Link to="/devis/$id" params={{ id: task.quote_id }} className={cls}>
        {icon}
        {label ?? "Ouvrir le devis"}
      </Link>
    );
  if (task.client_id)
    return (
      <Link to="/clients/$id" params={{ id: task.client_id }} className={cls}>
        {icon}
        {label ?? "Ouvrir la fiche client"}
      </Link>
    );
  if (task.partner_id)
    return (
      <Link to="/partenaires" search={{ id: task.partner_id }} className={cls}>
        {icon}
        {label ?? "Ouvrir la fiche partenaire"}
      </Link>
    );
  if (task.lead_id || task.prospect_id)
    return (
      <Link to="/crm" className={cls}>
        {icon}
        {label ?? "Ouvrir la demande"}
      </Link>
    );
  return null;
}

/** Lien vers la fiche qui porte les coordonnées du destinataire. */
export function ContactFicheLink({ item }: { item: QueueItem }) {
  const { task, plan } = item;
  const cls = "inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline";
  const body = (
    <>
      <ExternalLink className="h-3 w-3" />
      Compléter le contact sur la fiche
    </>
  );
  if (task.partner_id)
    return (
      <Link to="/partenaires" search={{ id: task.partner_id }} className={cls}>
        {body}
      </Link>
    );
  if (plan.contact.clientId)
    return (
      <Link to="/clients/$id" params={{ id: plan.contact.clientId }} className={cls}>
        {body}
      </Link>
    );
  if (task.lead_id || task.prospect_id)
    return (
      <Link to="/crm" className={cls}>
        {body}
      </Link>
    );
  return <SourceLink task={task} label="Compléter le contact sur la fiche" />;
}

/** Destinataire : nom + coordonnées cliquables. */
export function RecipientLine({ plan, large = false }: { plan: SendPlan; large?: boolean }) {
  const c = plan.contact;
  const item = "inline-flex min-w-0 items-center gap-1.5 hover:text-foreground";
  const none = !c.phone && !c.rawPhone && !c.email && !c.instagram;
  return (
    <div className="min-w-0">
      <p
        className={cn("break-words font-medium", large ? "text-2xl leading-tight" : "text-sm")}
        style={large ? { fontFamily: "Fraunces, serif" } : undefined}
      >
        {c.name}
      </p>
      <div
        className={cn(
          "mt-1 flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground",
          large ? "text-base" : "text-xs",
        )}
      >
        {c.phone && (
          <a
            href={whatsappUrl(c.phone.digits)}
            target={CHANNEL_TARGETS.whatsapp}
            className={cn(item, large && "font-medium text-foreground")}
          >
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {c.phone.display}
          </a>
        )}
        {c.rawPhone && (
          <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
            <Phone className="h-3.5 w-3.5 shrink-0" />
            {c.rawPhone} (à vérifier)
          </span>
        )}
        {c.email && (
          <a href={`mailto:${c.email}`} className={item}>
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="break-all">{c.email}</span>
          </a>
        )}
        {c.instagram && (
          <a href={instagramDmUrl(c.instagram)} target={CHANNEL_TARGETS.instagram} className={item}>
            <Instagram className="h-3.5 w-3.5 shrink-0" />
            <span className="break-all">@{c.instagram}</span>
          </a>
        )}
        {none && (
          <span className="inline-flex items-center gap-1.5">
            <UserX className="h-3.5 w-3.5" />
            Aucun contact sur la fiche
          </span>
        )}
      </div>
    </div>
  );
}

/** Canal effectif + boîte Gmail utilisée. */
export function ChannelHint({ plan }: { plan: SendPlan }) {
  const p = plan.primary;
  if (!p) return null;
  return (
    <p className="text-xs text-muted-foreground">
      Via {CHANNEL_LABELS[p.channel]}
      {p.gmailBox && (
        <>
          {" "}
          · depuis {GMAIL_BOX_LABELS[p.gmailBox]} ({GMAIL_ACCOUNTS[p.gmailBox]})
        </>
      )}
      {p.copyFirst && " · le texte est copié avant l'ouverture"}
    </p>
  );
}

/** Encadré « À vérifier » : notes internes des agents, jamais envoyées. */
export function NotesBox({ notes }: { notes: string[] }) {
  if (!notes.length) return null;
  return (
    <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-900 dark:text-amber-100">
      <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide">
        <TriangleAlert className="h-3.5 w-3.5" />À vérifier
      </p>
      <ul className="space-y-1">
        {notes.map((n, i) => (
          <li key={i} className="whitespace-pre-wrap break-words">
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Puces de langue (PT / EN / FR… / Tout), seulement si le brouillon a plusieurs versions. */
export function LangChips({
  plan,
  onChange,
  hint,
}: {
  plan: SendPlan;
  onChange: (key: string) => void;
  hint?: ReactNode;
}) {
  const sections = plan.parsed.sections;
  if (sections.length < 2) return null;
  const chips = [
    ...sections.map((s) => ({ key: s.key, label: s.label })),
    { key: "all", label: "Tout" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => (
        <Button
          key={c.key}
          type="button"
          size="sm"
          variant={plan.langKey === c.key ? "default" : "outline"}
          className="h-8 min-w-11 px-3"
          aria-pressed={plan.langKey === c.key}
          onClick={() => onChange(c.key)}
        >
          {c.label}
        </Button>
      ))}
      {hint}
    </div>
  );
}

/** Texte final tel qu'il partira (objet inclus pour l'e-mail). */
export function MessagePreview({ plan, full = false }: { plan: SendPlan; full?: boolean }) {
  const showSubject = plan.primary?.channel === "email" || plan.planned === "email";
  if (!plan.hasDraft)
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Aucun brouillon préparé pour cette tâche.
      </p>
    );
  return (
    <div className="space-y-1.5">
      <div className="rounded-md bg-muted/40 p-3">
        {showSubject && (
          <p className="mb-2 break-words border-b border-border/60 pb-2 text-xs">
            <span className="text-muted-foreground">Objet : </span>
            {plan.subject}
          </p>
        )}
        <pre
          className={cn(
            "whitespace-pre-wrap break-words font-sans text-sm leading-relaxed",
            !full && "max-h-72 overflow-auto",
          )}
        >
          {plan.text}
        </pre>
      </div>
      {plan.placeholders.length > 0 && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
          <TriangleAlert className="h-3.5 w-3.5 shrink-0" />À compléter avant envoi :{" "}
          {plan.placeholders.join(", ")}
        </p>
      )}
    </div>
  );
}

const BUCKETS: { key: ChannelBucket; label: string }[] = [
  { key: "whatsapp", label: "WhatsApp" },
  { key: "email", label: "E-mail" },
  { key: "instagram", label: "Instagram" },
  { key: "sans_contact", label: "Sans contact" },
  { key: "autre", label: "Autre canal" },
];

/** Compteurs par canal effectif ; un clic filtre la liste. */
export function ChannelCounters({
  counts,
  active,
  onToggle,
}: {
  counts: Record<ChannelBucket, number>;
  active: ChannelBucket | "all";
  onToggle: (key: ChannelBucket | "all") => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {BUCKETS.filter((b) => b.key !== "autre" || counts.autre > 0).map((b) => {
        const on = active === b.key;
        const warn = b.key === "sans_contact" && counts[b.key] > 0;
        return (
          <button
            key={b.key}
            type="button"
            onClick={() => onToggle(on ? "all" : b.key)}
            aria-pressed={on}
            className={cn(
              "flex min-w-0 items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
              on ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-muted/50",
            )}
          >
            <ChannelIcon
              channel={b.key}
              className={cn(
                "h-5 w-5",
                warn ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground",
              )}
            />
            <span className="min-w-0">
              <span className="block text-lg font-medium leading-none tabular-nums">
                {counts[b.key]}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{b.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

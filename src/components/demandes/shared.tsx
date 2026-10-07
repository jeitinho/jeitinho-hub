import { Link } from "@tanstack/react-router";
import {
  ArrowRightLeft,
  FilePlus2,
  Flame,
  Mail,
  MessageCircle,
  Snowflake,
  Thermometer,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useDemandeActions } from "./use-demande-actions";
import {
  STAGE_LABEL,
  TEMPERATURE_LABEL,
  contactDrafts,
  gmailComposeUrl,
  stageOptions,
  whatsappUrl,
  type Demande,
  type DemandeStage,
  type StageTarget,
  type Temperature,
} from "@/lib/ops/demandes";

const stop = (e: { stopPropagation: () => void }) => e.stopPropagation();

const TEMPERATURE_TONE: Record<Temperature, string> = {
  chaud: "border-destructive/40 bg-destructive/10 text-destructive",
  tiede: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  froid: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
};
const TEMPERATURE_ICON = { chaud: Flame, tiede: Thermometer, froid: Snowflake } as const;

export function TemperatureBadge({ demande, className }: { demande: Demande; className?: string }) {
  const Icon = TEMPERATURE_ICON[demande.temperature];
  return (
    <span
      title={demande.temperatureReasons.join(" · ")}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium",
        TEMPERATURE_TONE[demande.temperature],
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {TEMPERATURE_LABEL[demande.temperature]}
    </span>
  );
}

const STAGE_TONE: Record<DemandeStage, string> = {
  nouvelle: "border-primary/50 bg-primary/10 text-primary",
  contactee: "border-border bg-muted/50 text-foreground",
  devis: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  negociation: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  gagnee: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  perdue: "border-border/60 bg-muted/40 text-muted-foreground",
};

export function StagePill({ stage }: { stage: DemandeStage }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        STAGE_TONE[stage],
      )}
    >
      {STAGE_LABEL[stage]}
    </span>
  );
}

/** Menu « Passer à… » : met à jour le statut du prospect (ou du lead orphelin). */
export function StageMenu({
  demande,
  onMove,
  size = "sm",
  disabled,
}: {
  demande: Demande;
  onMove: (target: StageTarget) => void;
  size?: "sm" | "icon";
  disabled?: boolean;
}) {
  const options = stageOptions(demande);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={size === "icon" ? "h-7 w-7 shrink-0 p-0" : "h-8 px-2.5 text-xs"}
          onClick={stop}
          onKeyDown={stop}
          title="Passer à…"
          aria-label="Passer à une autre étape"
        >
          <ArrowRightLeft className={cn("h-3.5 w-3.5", size === "sm" && "mr-1.5")} />
          {size === "sm" && "Passer à…"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60" onClick={stop} onKeyDown={stop}>
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
          Passer à…
        </DropdownMenuLabel>
        {options.map((o) => (
          <div key={o.target}>
            {o.target === "perdue" && <DropdownMenuSeparator />}
            <DropdownMenuItem disabled={o.disabled} onSelect={() => onMove(o.target)}>
              <div className="flex min-w-0 flex-col">
                <span>
                  {o.label}
                  {o.current && <span className="ml-1.5 text-muted-foreground">· actuelle</span>}
                </span>
                {o.hint && !o.current && (
                  <span className="text-[10px] text-muted-foreground">{o.hint}</span>
                )}
              </div>
            </DropdownMenuItem>
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** WhatsApp (wa.me) et e-mail (rédaction Gmail sur contact@jeitinho.fr), brouillon prérempli. */
export function ContactButtons({
  demande,
  compact = false,
}: {
  demande: Demande;
  compact?: boolean;
}) {
  const { moveTo } = useDemandeActions();
  const drafts = contactDrafts(demande);
  // Après l'ouverture de WhatsApp / Gmail sur une demande nouvelle : passage à « Contactée » en 1 clic.
  const onOpened = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    if (demande.stage !== "nouvelle") return;
    toast(`Message préparé pour ${demande.name}`, {
      action: { label: "Marquer contactée", onClick: () => void moveTo(demande, "contactee") },
    });
  };
  const links = [
    { href: whatsappUrl(demande.phone, drafts.whatsapp), label: "WhatsApp", icon: MessageCircle },
    {
      href: demande.email
        ? gmailComposeUrl({ to: demande.email, subject: drafts.subject, body: drafts.email })
        : null,
      label: "E-mail",
      icon: Mail,
    },
  ];
  return (
    <>
      {links.map(({ href, label, icon: Icon }) =>
        href ? (
          <Button
            key={label}
            asChild
            variant="outline"
            size="sm"
            className={compact ? "h-7 w-7 shrink-0 p-0" : "h-8 px-2.5 text-xs"}
          >
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              title={label === "E-mail" ? "E-mail depuis contact@jeitinho.fr" : "WhatsApp"}
              onClick={onOpened}
            >
              <Icon className={cn("h-3.5 w-3.5", !compact && "mr-1.5")} />
              {!compact && label}
            </a>
          </Button>
        ) : (
          <Button
            key={label}
            variant="outline"
            size="sm"
            disabled
            className={compact ? "h-7 w-7 shrink-0 p-0" : "h-8 px-2.5 text-xs"}
            title={label === "E-mail" ? "Pas d'e-mail" : "Pas de numéro exploitable"}
          >
            <Icon className={cn("h-3.5 w-3.5", !compact && "mr-1.5")} />
            {!compact && label}
          </Button>
        ),
      )}
    </>
  );
}

export function CreateQuoteButton({
  prospectId,
  className,
}: {
  prospectId: string;
  className?: string;
}) {
  return (
    <Button asChild size="sm" className={cn("h-8 gap-1 px-2.5 text-[11px]", className)}>
      <Link to="/devis/new" search={{ prospectId }} onClick={stop} title="Créer le devis">
        <FilePlus2 />
        Créer le devis
      </Link>
    </Button>
  );
}

import { ArrowRightLeft, Globe, Instagram, Mail, MapPin, MessageCircle } from "lucide-react";
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
import {
  KIND_LABEL,
  PIPELINE_COLUMNS,
  STATUS_LABEL,
  instagramUrl,
  mapsUrl,
  statusPatch,
  whatsappUrl,
  type Partner,
  type PartnerStatus,
} from "@/lib/ops/partenaires";
import { usePartnerUpdate } from "./use-partner-update";

const STATUS_TONE: Record<PartnerStatus, string> = {
  nouveau: "border-primary/50 bg-primary/10 text-primary",
  a_contacter: "border-border bg-muted/50 text-foreground",
  contacte: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  premier_rdv: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  visite: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  validation: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  partenaire: "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  premium: "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  club_jeitinho: "border-emerald-500/40 bg-emerald-500/20 text-emerald-800 dark:text-emerald-200",
  refuse: "border-destructive/40 bg-destructive/10 text-destructive",
};

export function StatusPill({ status, className }: { status: PartnerStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
        STATUS_TONE[status] ?? STATUS_TONE.a_contacter,
        className,
      )}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function KindPill({ kind }: { kind: Partner["kind"] }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border/70 px-2 py-0.5 text-[10px] text-muted-foreground">
      {KIND_LABEL[kind] ?? kind}
    </span>
  );
}

export function NewBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
      Nouveau
    </span>
  );
}

/** Menu « Passer à… » : tous les statuts, groupés comme les colonnes du pipeline. */
export function StatusMenu({
  partner,
  size = "sm",
  label = "Passer à…",
}: {
  partner: Partner;
  size?: "sm" | "icon";
  label?: string;
}) {
  const update = usePartnerUpdate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={size === "icon" ? "h-7 w-7 p-0" : "h-7 px-2 text-xs"}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          title="Changer le statut"
        >
          <ArrowRightLeft className={cn("h-3.5 w-3.5", size === "sm" && "mr-1")} />
          {size === "sm" && label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-52"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {PIPELINE_COLUMNS.map((col, i) => (
          <div key={col.key}>
            {i > 0 && <DropdownMenuSeparator />}
            {col.statuses.length > 1 && (
              <DropdownMenuLabel className="text-[10px] uppercase tracking-wide text-muted-foreground">
                {col.label}
              </DropdownMenuLabel>
            )}
            {col.statuses.map((s) => (
              <DropdownMenuItem
                key={s}
                disabled={s === partner.status}
                onSelect={() =>
                  void update(partner.id, statusPatch(s), `${partner.name} → ${STATUS_LABEL[s]}`)
                }
              >
                {STATUS_LABEL[s]}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Boutons 1 clic : WhatsApp, e-mail, Instagram, Google Maps (seulement ceux disponibles). */
export function ContactButtons({
  partner,
  compact = false,
}: {
  partner: Partner;
  compact?: boolean;
}) {
  const links = [
    { href: whatsappUrl(partner), label: "WhatsApp", icon: MessageCircle },
    { href: partner.email ? `mailto:${partner.email}` : null, label: "E-mail", icon: Mail },
    { href: instagramUrl(partner.instagram), label: "Instagram", icon: Instagram },
    {
      href: partner.google_maps_url || partner.address ? mapsUrl(partner) : null,
      label: "Maps",
      icon: MapPin,
    },
    { href: compact ? null : partner.website, label: "Site", icon: Globe },
  ].filter((l): l is { href: string; label: string; icon: typeof Mail } => Boolean(l.href));

  if (links.length === 0)
    return compact ? null : <p className="text-xs text-muted-foreground">Aucun contact</p>;

  return (
    <div className="flex flex-wrap gap-1.5">
      {links.map(({ href, label, icon: Icon }) => (
        <Button
          key={label}
          asChild
          variant="outline"
          size="sm"
          className={compact ? "h-7 w-7 p-0" : "h-8 px-2.5 text-xs"}
        >
          <a
            href={href}
            target={href.startsWith("mailto:") ? undefined : "_blank"}
            rel="noreferrer"
            title={label}
            onClick={(e) => e.stopPropagation()}
          >
            <Icon className={cn("h-3.5 w-3.5", !compact && "mr-1.5")} />
            {!compact && label}
          </a>
        </Button>
      ))}
    </div>
  );
}

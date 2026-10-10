import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { fmtDayLong, type CalendarItem, type SourceLink } from "@/lib/ops/calendrier";
import { SOURCE_META } from "./sources";

const LINK_LABEL: Record<SourceLink["kind"], string> = {
  client: "Ouvrir la fiche client",
  trip: "Ouvrir le voyage",
  quote: "Ouvrir le devis",
  event: "Ouvrir l'événement",
  editorial: "Ouvrir le contenu",
  page: "Ouvrir",
};

export function SourceLinkButton({ link }: { link: SourceLink }) {
  const label = LINK_LABEL[link.kind];
  const inner = (
    <>
      <ExternalLink /> {label}
    </>
  );
  switch (link.kind) {
    case "client":
      return (
        <Button asChild>
          <Link to="/clients/$id" params={{ id: link.id }}>
            {inner}
          </Link>
        </Button>
      );
    case "trip":
      return (
        <Button asChild>
          <Link to="/voyages/$id" params={{ id: link.id }}>
            {inner}
          </Link>
        </Button>
      );
    case "quote":
      return (
        <Button asChild>
          <Link to="/devis/$id" params={{ id: link.id }}>
            {inner}
          </Link>
        </Button>
      );
    case "event":
      return (
        <Button asChild>
          <Link to="/evenements" search={{ id: link.id }}>
            {inner}
          </Link>
        </Button>
      );
    case "editorial":
      return (
        <Button asChild>
          <Link to="/contenus" search={{ id: link.id }}>
            {inner}
          </Link>
        </Button>
      );
    case "page":
      return (
        <Button asChild>
          <Link to={link.to}>{inner}</Link>
        </Button>
      );
  }
}

function dateLine(item: CalendarItem) {
  if (item.start === item.end) {
    const when = item.time
      ? item.endTime
        ? `${item.time} → ${item.endTime}`
        : item.time
      : "journée entière";
    return `${fmtDayLong(item.start)} · ${when}`;
  }
  return `Du ${fmtDayLong(item.start)} au ${fmtDayLong(item.end)}`;
}

export function ItemSheet({
  item,
  onClose,
  onEdit,
  onDelete,
}: {
  item: CalendarItem | null;
  onClose: () => void;
  onEdit: (item: CalendarItem) => void;
  onDelete: (item: CalendarItem) => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const meta = item ? SOURCE_META[item.source] : null;
  const Icon = meta?.icon;

  return (
    <Sheet
      open={!!item}
      onOpenChange={(open) => {
        if (!open) {
          setConfirming(false);
          onClose();
        }
      }}
    >
      <SheetContent className="flex w-full flex-col gap-5 overflow-y-auto sm:max-w-md">
        {item && meta && Icon && (
          <>
            <SheetHeader className="text-left">
              <span
                className={cn(
                  "inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
                  meta.chip,
                  item.tentative && "border-dashed",
                )}
              >
                <Icon className="h-3 w-3" /> {meta.label}
                {item.status && <span className="opacity-70">· {item.status}</span>}
              </span>
              <SheetTitle
                className="pr-6 text-2xl font-normal"
                style={{ fontFamily: "Fraunces, serif" }}
              >
                {item.title}
              </SheetTitle>
              <SheetDescription className="first-letter:uppercase">
                {dateLine(item)}
              </SheetDescription>
            </SheetHeader>

            {item.subtitle && <p className="text-sm">{item.subtitle}</p>}

            {item.details.length > 0 && (
              <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 gap-y-2 text-sm">
                {item.details.map((d, i) => (
                  <div key={i} className="contents">
                    <dt className="text-muted-foreground">{d.label}</dt>
                    <dd className="whitespace-pre-line break-words">{d.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            <div className="mt-auto flex flex-wrap gap-2 border-t border-border/60 pt-4">
              {item.link && <SourceLinkButton link={item.link} />}
              {item.manual && (
                <>
                  <Button variant="outline" onClick={() => onEdit(item)}>
                    <Pencil /> Modifier
                  </Button>
                  {confirming ? (
                    <Button
                      variant="destructive"
                      disabled={deleting}
                      onClick={async () => {
                        setDeleting(true);
                        try {
                          await onDelete(item);
                          setConfirming(false);
                        } finally {
                          setDeleting(false);
                        }
                      }}
                    >
                      <Trash2 /> Confirmer la suppression
                    </Button>
                  ) : (
                    <Button variant="ghost" onClick={() => setConfirming(true)}>
                      <Trash2 /> Supprimer
                    </Button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

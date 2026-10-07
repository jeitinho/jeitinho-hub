import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { fmtMoney } from "@/lib/ops/ops";
import {
  currenciesOf,
  sourceInfo,
  type CurrencyTotals,
  type TimelineLink,
} from "@/lib/ops/client360";

/** Lien interne typé vers la page d'un objet (devis, facture, voyage…). */
export function TargetLink({
  link,
  className,
  children,
}: {
  link: TimelineLink | null | undefined;
  className?: string;
  children: ReactNode;
}) {
  if (!link) return <span className={className}>{children}</span>;
  switch (link.to) {
    case "/devis/$id":
      return (
        <Link to="/devis/$id" params={{ id: link.id }} className={className}>
          {children}
        </Link>
      );
    case "/devis/factures/$id":
      return (
        <Link to="/devis/factures/$id" params={{ id: link.id }} className={className}>
          {children}
        </Link>
      );
    case "/voyages/$id":
      return (
        <Link to="/voyages/$id" params={{ id: link.id }} className={className}>
          {children}
        </Link>
      );
    case "/evenements":
      return (
        <Link to="/evenements" search={{ id: link.id }} className={className}>
          {children}
        </Link>
      );
    default:
      return (
        <Link to={link.to} className={className}>
          {children}
        </Link>
      );
  }
}

export function SourceBadge({ source }: { source: string | null | undefined }) {
  const info = sourceInfo(source);
  if (!info) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span
      className={`inline-flex max-w-full items-center truncate rounded-md border px-2 py-0.5 text-[11px] font-medium ${info.tone}`}
      title={source ?? undefined}
    >
      {info.label}
    </span>
  );
}

/** Un montant par devise, jamais additionnés entre eux. */
export function AmountLines({
  totals,
  className = "text-sm",
  empty = "—",
}: {
  totals: CurrencyTotals;
  className?: string;
  empty?: string;
}) {
  const curs = currenciesOf(totals);
  if (!curs.length) return <p className={`${className} text-muted-foreground`}>{empty}</p>;
  return (
    <div>
      {curs.map((c) => (
        <p key={c} className={`${className} tabular-nums`}>
          {fmtMoney(totals[c], c)}
        </p>
      ))}
    </div>
  );
}

export function PanelTitle({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <h2 className="tracked mb-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
      {icon}
      {children}
    </h2>
  );
}

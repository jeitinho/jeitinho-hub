import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { fmtMoney } from "@/lib/ops/ops";
import {
  BRL_PER_EUR,
  sortedCurrencies,
  toEurIndicative,
  type CurrencyTotals,
  type ObjectLink,
} from "@/lib/ops/finances";

/** Un montant par devise, jamais additionnés entre eux. */
export function Amounts({
  totals,
  size = "lg",
  showIndicative = false,
}: {
  totals: CurrencyTotals;
  size?: "lg" | "sm";
  showIndicative?: boolean;
}) {
  const curs = sortedCurrencies(totals);
  if (curs.length === 0)
    return (
      <p
        className={
          size === "lg"
            ? "text-2xl font-semibold text-muted-foreground"
            : "text-sm text-muted-foreground"
        }
      >
        —
      </p>
    );
  const eur = showIndicative && curs.length > 1 ? toEurIndicative(totals) : null;
  return (
    <div>
      {curs.map((c) => (
        <p
          key={c}
          className={
            size === "lg"
              ? "text-xl font-semibold tabular-nums sm:text-2xl"
              : "text-sm tabular-nums"
          }
        >
          {fmtMoney(totals[c], c)}
        </p>
      ))}
      {eur != null && (
        <p
          className="mt-1 text-xs text-muted-foreground"
          title={`Taux d'affichage fixe de src/lib/currency.ts : 1 € = ${BRL_PER_EUR} R$. Pas un taux de change réel.`}
        >
          ≈ {fmtMoney(eur, "EUR")} au taux fixe 1 € = {BRL_PER_EUR.toLocaleString("fr-FR")} R$
          (indicatif)
        </p>
      )}
    </div>
  );
}

export function ObjectLinkView({
  link,
  children,
  className = "hover:underline",
}: {
  link: ObjectLink | null;
  children: ReactNode;
  className?: string;
}) {
  if (!link) return <span>{children}</span>;
  switch (link.kind) {
    case "devis":
      return (
        <Link to="/devis/$id" params={{ id: link.id }} className={className}>
          {children}
        </Link>
      );
    case "client":
      return (
        <Link to="/clients/$id" params={{ id: link.id }} className={className}>
          {children}
        </Link>
      );
    case "voyage":
      return (
        <Link to="/voyages/$id" params={{ id: link.id }} className={className}>
          {children}
        </Link>
      );
    case "evenement":
      return (
        <Link to="/evenements" search={{ id: link.id }} className={className}>
          {children}
        </Link>
      );
    case "manuel":
      return (
        <Link to="/manuel" className={className}>
          {children}
        </Link>
      );
    case "distribution":
      return (
        <Link to="/distribution" className={className}>
          {children}
        </Link>
      );
  }
}

export function SectionError({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <p className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
      {(error as Error).message}
    </p>
  );
}

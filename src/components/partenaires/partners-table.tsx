import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  KIND_LABEL,
  PARTNER_STATUSES,
  SOURCE_LABEL,
  fmtDate,
  isNewApplication,
  isOverdue,
  pipelineOrder,
  type Partner,
} from "@/lib/ops/partenaires";
import { ContactButtons, KindPill, NewBadge, StatusMenu, StatusPill } from "./shared";

type SortKey =
  | "priority"
  | "name"
  | "kind"
  | "status"
  | "location"
  | "source"
  | "next_action_at"
  | "last_contact_at"
  | "experiences";

function compare(a: Partner, b: Partner, key: SortKey, exp: Map<string, number>) {
  const str = (v: string | null | undefined) => v ?? "";
  switch (key) {
    case "priority":
      return pipelineOrder(a, b);
    case "name":
      return a.name.localeCompare(b.name, "fr");
    case "kind":
      return KIND_LABEL[a.kind].localeCompare(KIND_LABEL[b.kind], "fr");
    case "status":
      return PARTNER_STATUSES.indexOf(a.status) - PARTNER_STATUSES.indexOf(b.status);
    case "location":
      return str(a.location).localeCompare(str(b.location), "fr");
    case "source":
      return a.source.localeCompare(b.source);
    case "experiences":
      return (exp.get(a.id) ?? 0) - (exp.get(b.id) ?? 0);
    default: {
      // Dates : valeurs vides en dernier quel que soit le sens
      const va = a[key];
      const vb = b[key];
      if (!va && !vb) return 0;
      if (!va) return Number.POSITIVE_INFINITY;
      if (!vb) return Number.NEGATIVE_INFINITY;
      return va.localeCompare(vb);
    }
  }
}

export function PartnersTable({
  partners,
  experienceCount,
  onOpen,
}: {
  partners: Partner[];
  experienceCount: Map<string, number>;
  onOpen: (id: string) => void;
}) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "priority", dir: 1 });
  const rows = [...partners].sort((a, b) => {
    const c = compare(a, b, sort.key, experienceCount);
    if (!Number.isFinite(c)) return c > 0 ? 1 : -1;
    return c * sort.dir;
  });

  const toggle = (key: SortKey) =>
    setSort((s) =>
      s.key === key
        ? s.dir === 1
          ? { key, dir: -1 }
          : { key: "priority", dir: 1 }
        : { key, dir: 1 },
    );

  const head = (key: SortKey, label: string, className?: string) => {
    const Icon = sort.key !== key ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown;
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => toggle(key)}
          className={cn(
            "inline-flex items-center gap-1 whitespace-nowrap text-xs",
            sort.key === key ? "text-foreground" : "text-muted-foreground",
          )}
        >
          {label}
          <Icon className="h-3 w-3 opacity-60" />
        </button>
      </TableHead>
    );
  };

  return (
    <div className="rounded-lg border border-border/60">
      <Table>
        <TableHeader>
          <TableRow>
            {head("name", "Nom")}
            {head("kind", "Type", "hidden md:table-cell")}
            {head("status", "Statut")}
            {head("location", "Quartier", "hidden lg:table-cell")}
            {head("source", "Source", "hidden xl:table-cell")}
            {head("next_action_at", "Prochaine action", "hidden sm:table-cell")}
            {head("last_contact_at", "Dernier contact", "hidden lg:table-cell")}
            {head("experiences", "Exp.", "hidden xl:table-cell")}
            <TableHead className="text-right text-xs">
              {sort.key !== "priority" && (
                <button
                  type="button"
                  className="text-muted-foreground underline-offset-2 hover:underline"
                  onClick={() => setSort({ key: "priority", dir: 1 })}
                >
                  Tri par priorité
                </button>
              )}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((p) => {
            const overdue = isOverdue(p);
            return (
              <TableRow
                key={p.id}
                className={cn("cursor-pointer", isNewApplication(p) && "bg-primary/5")}
                onClick={() => onOpen(p.id)}
              >
                <TableCell className="max-w-[16rem]">
                  <div className="flex items-center gap-1.5">
                    {isNewApplication(p) && <NewBadge />}
                    <span className="truncate font-medium">{p.name}</span>
                  </div>
                  {p.contact_name && (
                    <p className="truncate text-[11px] text-muted-foreground">{p.contact_name}</p>
                  )}
                </TableCell>
                <TableCell className="hidden md:table-cell">
                  <KindPill kind={p.kind} />
                </TableCell>
                <TableCell>
                  <StatusPill status={p.status} />
                </TableCell>
                <TableCell className="hidden max-w-[12rem] truncate text-xs lg:table-cell">
                  {p.location ?? "—"}
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground xl:table-cell">
                  {SOURCE_LABEL[p.source] ?? p.source}
                </TableCell>
                <TableCell
                  className={cn(
                    "hidden max-w-[14rem] text-xs sm:table-cell",
                    overdue ? "text-destructive" : "text-muted-foreground",
                  )}
                >
                  {p.next_action_at || p.next_action ? (
                    <span className="line-clamp-2">
                      {p.next_action_at && (
                        <strong className="font-medium">{fmtDate(p.next_action_at)}</strong>
                      )}
                      {p.next_action_at && p.next_action && " · "}
                      {p.next_action}
                    </span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">
                  {fmtDate(p.last_contact_at)}
                </TableCell>
                <TableCell className="hidden text-xs xl:table-cell">
                  {experienceCount.get(p.id) ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1.5">
                    <ContactButtons partner={p} compact />
                    <StatusMenu partner={p} size="icon" />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

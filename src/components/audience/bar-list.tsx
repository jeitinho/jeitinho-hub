import { Card } from "@/components/ui/card";

export type BarItem = { key: string; label: string; count: number };

/** Répartition en barres CSS horizontales, triée par l'appelant. */
export function BarList({
  title,
  items,
  total,
  limit,
  onSelect,
  loading,
}: {
  title: string;
  items: BarItem[];
  total: number;
  limit?: number;
  onSelect?: (key: string) => void;
  loading?: boolean;
}) {
  const shown = limit ? items.slice(0, limit) : items;
  const rest = limit ? items.slice(limit) : [];
  const restCount = rest.reduce((s, i) => s + i.count, 0);
  const max = Math.max(1, ...shown.map((i) => i.count), restCount);
  const pct = (n: number) => (total ? Math.round((n / total) * 1000) / 10 : 0);

  return (
    <Card className="p-4">
      <h3 className="mb-3 text-sm font-medium">{title}</h3>
      {loading && <p className="text-xs text-muted-foreground">Chargement…</p>}
      {!loading && items.length === 0 && (
        <p className="text-xs text-muted-foreground">Aucune donnée.</p>
      )}
      <ul className="space-y-2">
        {shown.map((i) => (
          <li key={i.key}>
            <button
              type="button"
              className="group w-full text-left disabled:cursor-default"
              onClick={() => onSelect?.(i.key)}
              disabled={!onSelect}
              title={onSelect ? "Filtrer le tableau" : undefined}
            >
              <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
                <span className="truncate group-enabled:group-hover:underline">{i.label}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {i.count.toLocaleString("fr-FR")} · {pct(i.count)} %
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary"
                  style={{ width: `${(i.count / max) * 100}%` }}
                />
              </div>
            </button>
          </li>
        ))}
        {restCount > 0 && (
          <li>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs text-muted-foreground">
              <span>Autres ({rest.length})</span>
              <span className="tabular-nums">
                {restCount.toLocaleString("fr-FR")} · {pct(restCount)} %
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-1.5 rounded-full bg-muted-foreground/40"
                style={{ width: `${(restCount / max) * 100}%` }}
              />
            </div>
          </li>
        )}
      </ul>
    </Card>
  );
}

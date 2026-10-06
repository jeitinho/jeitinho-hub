import { EDITORIAL_STATUSES, isOverdue, type EditorialItem } from "@/lib/ops/media";
import { EditorialItemCard, StatusPill } from "./editorial-item-card";

/** Vue Kanban : une colonne par statut ; retards en tête de colonne. */
export function EditorialKanban({
  items,
  onOpen,
}: {
  items: EditorialItem[];
  onOpen: (item: EditorialItem) => void;
}) {
  const known = new Set<string>(EDITORIAL_STATUSES.map((s) => s.value));
  const columns: string[] = EDITORIAL_STATUSES.map((s) => s.value).filter(
    (s) => s !== "abandonne" || items.some((i) => i.status === s),
  );
  for (const i of items)
    if (!known.has(i.status) && !columns.includes(i.status)) columns.push(i.status);

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
      <div className="flex gap-3 lg:grid lg:auto-cols-fr lg:grid-flow-col">
        {columns.map((status) => {
          const list = items
            .filter((i) => i.status === status)
            .sort((a, b) => {
              const late = Number(isOverdue(b)) - Number(isOverdue(a));
              if (late) return late;
              // Publiés : les plus récents d'abord ; sinon chronologique.
              const cmp = (a.planned_at ?? "9").localeCompare(b.planned_at ?? "9");
              return status === "publie" ? -cmp : cmp;
            });
          return (
            <div
              key={status}
              className="w-[270px] flex-shrink-0 space-y-2 rounded-lg bg-muted/40 p-2 lg:w-auto"
            >
              <div className="flex items-center justify-between px-1 py-1">
                <StatusPill status={status} />
                <span className="text-xs text-muted-foreground">{list.length}</span>
              </div>
              {list.length ? (
                list.map((it) => (
                  <EditorialItemCard key={it.id} item={it} onOpen={onOpen} showDate />
                ))
              ) : (
                <p className="px-1 py-4 text-center text-xs text-muted-foreground/70">Vide</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

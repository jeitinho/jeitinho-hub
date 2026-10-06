import { isOverdue, type EditorialItem } from "@/lib/ops/media";

export const ALL = "__all";

export type EditorialFilterState = {
  owner: string;
  kind: string;
  collection: string;
  lateOnly: boolean;
};

export const EMPTY_FILTERS: EditorialFilterState = {
  owner: ALL,
  kind: ALL,
  collection: ALL,
  lateOnly: false,
};

export function applyFilters(items: EditorialItem[], f: EditorialFilterState) {
  return items.filter(
    (i) =>
      (f.owner === ALL || (i.owner ?? "") === f.owner) &&
      (f.kind === ALL || i.kind === f.kind) &&
      (f.collection === ALL || (i.collection ?? "") === f.collection) &&
      (!f.lateOnly || isOverdue(i)),
  );
}

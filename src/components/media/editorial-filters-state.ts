import { isOverdue, normalizeStatus, type EditorialItem } from "@/lib/ops/media";

export const ALL = "__all";

export type EditorialFilterState = {
  owner: string;
  kind: string;
  collection: string;
  channel: string;
  lateOnly: boolean;
  /** Les contenus abandonnés sont masqués par défaut. */
  showAbandoned: boolean;
};

export const EMPTY_FILTERS: EditorialFilterState = {
  owner: ALL,
  kind: ALL,
  collection: ALL,
  channel: ALL,
  lateOnly: false,
  showAbandoned: false,
};

export function applyFilters(items: EditorialItem[], f: EditorialFilterState) {
  return items.filter(
    (i) =>
      (f.showAbandoned || normalizeStatus(i.status) !== "abandonne") &&
      (f.owner === ALL || (i.owner ?? "") === f.owner) &&
      (f.kind === ALL || i.kind === f.kind) &&
      (f.collection === ALL || (i.collection ?? "") === f.collection) &&
      (f.channel === ALL || (i.channel ?? "") === f.channel) &&
      (!f.lateOnly || isOverdue(i)),
  );
}

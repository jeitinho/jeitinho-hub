import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fetchBlogFeed,
  fetchEditorialItems,
  setEditorialStatus,
  statusMeta,
  type EditorialItem,
} from "@/lib/ops/media";

export const EDITORIAL_KEY = ["media", "editorial-items"];
export const FEED_KEY = ["media", "blog-feed"];

export function useEditorialItems() {
  return useQuery({ queryKey: EDITORIAL_KEY, queryFn: fetchEditorialItems });
}

export function useBlogFeed(enabled = true) {
  return useQuery({
    queryKey: FEED_KEY,
    queryFn: fetchBlogFeed,
    enabled,
    retry: false,
    staleTime: 10 * 60_000,
  });
}

/** Changement de statut optimiste (1 clic). */
export function useSetStatus() {
  const qc = useQueryClient();
  return async (item: EditorialItem, status: string) => {
    const prev = qc.getQueryData<EditorialItem[]>(EDITORIAL_KEY);
    qc.setQueryData<EditorialItem[]>(EDITORIAL_KEY, (rows) =>
      rows?.map((r) => (r.id === item.id ? { ...r, status } : r)),
    );
    try {
      await setEditorialStatus(item.id, status);
      toast.success(`« ${item.title} » → ${statusMeta(status).label}`);
    } catch (e) {
      qc.setQueryData(EDITORIAL_KEY, prev);
      toast.error((e as Error).message);
    } finally {
      qc.invalidateQueries({ queryKey: EDITORIAL_KEY });
    }
  };
}

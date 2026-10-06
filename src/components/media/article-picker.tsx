import { useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { fmtPubDate, normalizeUrl, type BlogArticle } from "@/lib/ops/media";
import { useBlogFeed } from "./use-media";
import { FeedUnavailable } from "./blog-feed-state";

/** Choix d'un article publié dans le flux RSS du blog. */
export function ArticlePicker({
  currentUrl,
  onPick,
}: {
  currentUrl?: string | null;
  onPick: (article: BlogArticle) => void;
}) {
  const { data, isLoading, error, refetch } = useBlogFeed();
  const [q, setQ] = useState("");
  const current = normalizeUrl(currentUrl);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = data?.articles ?? [];
    return term
      ? rows.filter(
          (a) =>
            a.title.toLowerCase().includes(term) ||
            a.categories.some((c) => c.toLowerCase().includes(term)),
        )
      : rows;
  }, [data, q]);

  if (isLoading) return <p className="text-xs text-muted-foreground">Lecture du flux RSS…</p>;
  if (error) return <FeedUnavailable error={error} onRetry={() => refetch()} compact />;

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Rechercher parmi ${data?.articles.length ?? 0} articles`}
          className="h-9 pl-8 text-sm"
        />
      </div>
      <div className="max-h-56 divide-y divide-border/60 overflow-y-auto rounded-md border border-border/60">
        {list.length === 0 ? (
          <p className="p-3 text-xs text-muted-foreground">Aucun article.</p>
        ) : (
          list.map((a) => {
            const selected = current && normalizeUrl(a.link) === current;
            return (
              <button
                key={a.link}
                type="button"
                onClick={() => onPick(a)}
                className="flex w-full items-start gap-2 p-2 text-left text-sm hover:bg-accent/40"
              >
                <Check
                  className={`mt-0.5 h-3.5 w-3.5 flex-shrink-0 ${selected ? "text-primary" : "invisible"}`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{a.title}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {fmtPubDate(a.pubDate)}
                    {a.categories.length ? ` · ${a.categories.join(", ")}` : ""}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

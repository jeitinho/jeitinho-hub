import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarCheck, ExternalLink, Plus, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fmtPubDate,
  normalizeUrl,
  saveEditorialItem,
  type BlogArticle,
  type EditorialItem,
} from "@/lib/ops/media";
import { EDITORIAL_KEY, useBlogFeed, useEditorialItems } from "./use-media";
import { FeedUnavailable } from "./blog-feed-state";
import { StatusPill } from "./editorial-item-card";

/** Articles en ligne (RSS) croisés avec le planning éditorial. */
export function BlogFeedList() {
  const qc = useQueryClient();
  const feed = useBlogFeed();
  const { data: items = [] } = useEditorialItems();
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState<string | null>(null);

  const tracked = useMemo(() => {
    const map = new Map<string, EditorialItem>();
    for (const it of items) if (it.url) map.set(normalizeUrl(it.url), it);
    return map;
  }, [items]);

  const articles = useMemo(() => feed.data?.articles ?? [], [feed.data]);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return articles;
    return articles.filter(
      (a) =>
        a.title.toLowerCase().includes(term) ||
        a.description.toLowerCase().includes(term) ||
        a.categories.some((c) => c.toLowerCase().includes(term)),
    );
  }, [articles, q]);

  const trackedCount = articles.filter((a) => tracked.has(normalizeUrl(a.link))).length;

  const addToPlanning = async (a: BlogArticle) => {
    setAdding(a.link);
    try {
      await saveEditorialItem({
        title: a.title,
        kind: "article",
        status: "publie",
        url: a.link,
        planned_at: a.pubDate,
        collection: a.categories[0] ?? null,
        channel: "Blog",
      });
      toast.success("Article ajouté au planning");
      qc.invalidateQueries({ queryKey: EDITORIAL_KEY });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setAdding(null);
    }
  };

  if (feed.isLoading) return <p className="text-sm text-muted-foreground">Lecture du flux RSS…</p>;
  if (feed.error) return <FeedUnavailable error={feed.error} onRetry={() => feed.refetch()} />;
  if (!articles.length)
    return (
      <Card className="border-dashed p-8 text-center text-sm text-muted-foreground">
        Le flux RSS ne contient aucun article.
      </Card>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher un article, une catégorie…"
            className="pl-8"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {articles.length} articles en ligne · {trackedCount} suivis dans le planning
        </p>
      </div>

      {list.length === 0 ? (
        <Card className="border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucun article ne correspond à « {q} ».
        </Card>
      ) : (
        <div className="divide-y divide-border/60 rounded-lg border border-border/60 bg-card">
          {list.map((a) => {
            const item = tracked.get(normalizeUrl(a.link));
            return (
              <div
                key={a.link}
                className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0 space-y-1">
                  <a
                    href={a.link}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-start gap-1.5 text-base hover:text-primary"
                    style={{ fontFamily: "Fraunces, serif" }}
                  >
                    {a.title}
                    <ExternalLink className="mt-1 h-3.5 w-3.5 flex-shrink-0 opacity-50 group-hover:opacity-100" />
                  </a>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{fmtPubDate(a.pubDate)}</span>
                    {a.categories.map((c) => (
                      <Badge key={c} variant="outline" className="text-[10px]">
                        {c}
                      </Badge>
                    ))}
                  </div>
                  {a.description && (
                    <p className="line-clamp-2 text-xs text-muted-foreground">{a.description}</p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {item ? (
                    <Link
                      to="/contenus"
                      className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/40 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300"
                      title={item.title}
                    >
                      <CalendarCheck className="h-3.5 w-3.5" />
                      Suivi dans le planning
                      {item.owner ? ` · ${item.owner}` : ""}
                      {item.status !== "publie" && <StatusPill status={item.status} />}
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-xs text-muted-foreground"
                      disabled={adding === a.link}
                      onClick={() => addToPlanning(a)}
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Ajouter au planning
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

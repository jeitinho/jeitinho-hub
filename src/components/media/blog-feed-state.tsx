import { ExternalLink, RefreshCw, Rss } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BLOG_URL } from "@/lib/ops/media";

/** Erreur de flux RSS : message sobre + lien direct vers le blog. */
export function FeedUnavailable({
  error,
  onRetry,
  compact,
}: {
  error: unknown;
  onRetry?: () => void;
  compact?: boolean;
}) {
  return (
    <Card className={`border-dashed ${compact ? "p-3" : "p-8"} text-center`}>
      {!compact && <Rss className="mx-auto mb-3 h-6 w-6 text-muted-foreground" />}
      <p className="text-sm font-medium">Flux indisponible</p>
      <p className="mx-auto mt-1 max-w-md break-words text-xs text-muted-foreground">
        {(error as Error)?.message ?? "Le flux RSS du blog n'a pas pu être lu."}
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <a href={BLOG_URL} target="_blank" rel="noreferrer">
          <Button size="sm" variant="outline">
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Ouvrir blog.jeitinho.fr
          </Button>
        </a>
        {onRetry && (
          <Button size="sm" variant="ghost" onClick={onRetry}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            Réessayer
          </Button>
        )}
      </div>
    </Card>
  );
}

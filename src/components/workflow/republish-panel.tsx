import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { republishArticle } from "@/lib/publishers/article-lifecycle.functions";
import { RotateCcw } from "lucide-react";

export function RepublishPanel({ contentId, onDone }: { contentId: string; onDone: () => void }) {
  const republish = useServerFn(republishArticle);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    const res = await republish({ data: { contentId } });
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Republication échouée");
    toast.success("Article republié", {
      action: res.commitUrl
        ? { label: "Voir commit", onClick: () => window.open(res.commitUrl!, "_blank") }
        : undefined,
    });
    onDone();
  };

  return (
    <Card className="border-primary/30 space-y-3 p-4">
      <p className="tracked text-[10px] text-muted-foreground flex items-center gap-2">
        <RotateCcw className="h-3 w-3" />Article archivé
      </p>
      <p className="text-sm text-muted-foreground">
        Cet article est archivé sur le blog (published=false). Republiez-le pour le rendre à nouveau visible.
      </p>
      <Button size="sm" className="btn-primary w-full" disabled={busy} onClick={run}>
        {busy ? "…" : "Republier"}
      </Button>
    </Card>
  );
}
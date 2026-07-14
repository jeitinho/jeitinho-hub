import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getPublishersForType } from "@/lib/publishers/registry";
import { useAuth } from "@/hooks/use-auth";
import { Send } from "lucide-react";

export function PublishPanel({ contentId, contentType }: { contentId: string; contentType: string }) {
  const { user, canManage } = useAuth();
  const publishers = useMemo(() => getPublishersForType(contentType), [contentType]);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ label: string; source: string; target: string } | null>(null);

  if (!publishers.length) return null;

  const run = async (publisherId: string, dryRun: boolean) => {
    if (!user) return;
    setBusy(publisherId);
    const pub = publishers.find((p) => p.id === publisherId)!;
    const res = await pub.publish({ contentId, triggeredBy: user.id, dryRun });
    setBusy(null);
    if (!res.ok) return toast.error(res.error ?? "Échec de la publication");
    if (dryRun && res.preview) {
      setPreview({ label: pub.label, source: res.preview, target: res.externalRef ?? "" });
    } else {
      toast.success(`${pub.label} : ${res.externalRef ?? "OK"}`);
    }
  };

  return (
    <Card className="border-border/60 space-y-3 p-4">
      <p className="tracked text-[10px] text-muted-foreground flex items-center gap-2">
        <Send className="h-3 w-3" />Publishers
      </p>
      <div className="space-y-2">
        {publishers.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 p-2">
            <div className="min-w-0">
              <div className="text-sm font-medium">{p.label}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{p.channelSlug}</div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => run(p.id, true)}>Aperçu</Button>
              <Button size="sm" className="btn-primary" disabled={busy !== null || !canManage} onClick={() => run(p.id, false)}>
                Publier
              </Button>
            </div>
          </div>
        ))}
      </div>
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader><DialogTitle>Aperçu — {preview?.label}</DialogTitle></DialogHeader>
          {preview && (
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground font-mono">Cible : {preview.target}</div>
              <pre className="max-h-[60vh] overflow-auto rounded-md bg-muted p-3 text-xs font-mono">{preview.source}</pre>
              <div className="flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { navigator.clipboard.writeText(preview.source); toast.success("Copié"); }}
                >Copier</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
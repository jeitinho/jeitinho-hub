import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { archiveArticle, deleteArticle } from "@/lib/publishers/article-lifecycle.functions";
import { Archive, Trash2, AlertTriangle } from "lucide-react";

type Mode = "menu" | "confirmDelete";

export function DeleteArticleDialog({
  open, onOpenChange, contentId, slug, onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  contentId: string;
  slug: string;
  onDone: () => void;
}) {
  const { canManage } = useAuth();
  const [mode, setMode] = useState<Mode>("menu");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const archiveFn = useServerFn(archiveArticle);
  const deleteFn = useServerFn(deleteArticle);

  const reset = () => { setMode("menu"); setConfirm(""); setBusy(false); };
  const close = (o: boolean) => { if (!busy) { onOpenChange(o); if (!o) reset(); } };

  const runArchive = async () => {
    setBusy(true);
    const res = await archiveFn({ data: { contentId } });
    setBusy(false);
    if (!res.ok) return toast.error(res.error ?? "Archivage échoué");
    toast.success("Article archivé", {
      action: res.commitUrl
        ? { label: "Voir commit", onClick: () => window.open(res.commitUrl!, "_blank") }
        : undefined,
    });
    onDone();
    close(false);
  };

  const runDelete = async () => {
    if (confirm !== slug) return toast.error("Slug incorrect");
    setBusy(true);
    try {
      const res = await deleteFn({ data: { contentId, confirmSlug: confirm } });
      setBusy(false);
      if (!res.ok) return toast.error(res.error ?? "Suppression échouée");
      toast.success("Article supprimé définitivement", {
        action: res.commitUrl
          ? { label: "Voir commit", onClick: () => window.open(res.commitUrl!, "_blank") }
          : undefined,
      });
      onDone();
      close(false);
    } catch (e) {
      setBusy(false);
      toast.error(e instanceof Error ? e.message : "Suppression échouée");
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        {mode === "menu" && (
          <>
            <DialogHeader>
              <DialogTitle>Que faire de cet article ?</DialogTitle>
              <DialogDescription>
                Choisissez entre archiver (recommandé, réversible) et supprimer définitivement.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              <button
                type="button"
                disabled={busy}
                onClick={runArchive}
                className="w-full rounded-md border border-border/60 p-4 text-left transition hover:border-primary/60 hover:bg-muted/40 disabled:opacity-50"
              >
                <div className="flex items-start gap-3">
                  <Archive className="mt-0.5 h-5 w-5 text-primary" />
                  <div>
                    <div className="font-medium">Archiver <span className="ml-2 text-[10px] uppercase tracking-wider text-primary">Recommandé</span></div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      L'article reste dans le dépôt mais est masqué du site (published=false).
                      Réversible depuis le panneau Publishers.
                    </p>
                  </div>
                </div>
              </button>

              {canManage ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setMode("confirmDelete")}
                  className="w-full rounded-md border border-destructive/40 p-4 text-left transition hover:bg-destructive/5 disabled:opacity-50"
                >
                  <div className="flex items-start gap-3">
                    <Trash2 className="mt-0.5 h-5 w-5 text-destructive" />
                    <div>
                      <div className="font-medium text-destructive">Supprimer définitivement</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Supprime réellement le fichier du dépôt GitHub. Irréversible.
                        Réservé aux administrateurs et managers.
                      </p>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="rounded-md border border-border/40 p-4 text-xs text-muted-foreground">
                  La suppression définitive est réservée aux administrateurs et managers.
                </div>
              )}
            </div>
          </>
        )}

        {mode === "confirmDelete" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />Suppression irréversible
              </DialogTitle>
              <DialogDescription>
                Cette action supprime le fichier du dépôt GitHub. Pour confirmer, tapez exactement
                le slug de l'article : <code className="rounded bg-muted px-1 py-0.5 text-xs">{slug}</code>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="confirm-slug">Slug de confirmation</Label>
              <Input
                id="confirm-slug"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={slug}
                autoComplete="off"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" disabled={busy} onClick={() => setMode("menu")}>Retour</Button>
              <Button
                variant="destructive"
                disabled={busy || confirm !== slug}
                onClick={runDelete}
              >
                {busy ? "Suppression…" : "Supprimer définitivement"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
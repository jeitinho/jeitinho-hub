import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { t } from "@/lib/i18n";

/**
 * Confirmation dans le style du hub (remplace window.confirm, gris et brutal sur
 * iPhone). Usage : `if (!(await confirmAction("Supprimer ce lot ?"))) return;`
 * Une phrase de question, un détail facultatif, un bouton qui dit ce qu'il fait.
 */
type Request = {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  resolve: (ok: boolean) => void;
};

let push: ((r: Request) => void) | null = null;

export function confirmAction(
  title: string,
  opts: { description?: string; confirmLabel?: string; destructive?: boolean } = {},
): Promise<boolean> {
  if (!push) return Promise.resolve(window.confirm(title));
  return new Promise((resolve) =>
    push!({ title, destructive: true, ...opts, resolve }),
  );
}

export function ConfirmHost() {
  const [req, setReq] = useState<Request | null>(null);
  useEffect(() => {
    push = setReq;
    return () => {
      push = null;
    };
  }, []);
  const close = (ok: boolean) => {
    req?.resolve(ok);
    setReq(null);
  };
  return (
    <AlertDialog open={!!req} onOpenChange={(o) => !o && close(false)}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-sans text-[16px] font-semibold leading-snug">
            {req?.title}
          </AlertDialogTitle>
          {req?.description && <AlertDialogDescription>{req.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => close(false)}>{t("Annuler")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => close(true)}
            className={req?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
          >
            {req?.confirmLabel ?? (req?.destructive ? t("Supprimer") : t("Confirmer"))}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { snoozeTask } from "@/lib/crm/crm";
import { copyText, updateTaskDraft, type ValidationTask } from "@/lib/ops/ops";
import { discardTask, markSent, type Undo } from "@/lib/ops/send";

export const VALIDATION_KEY = ["ops", "validation"] as const;

type Opts = { onUndo?: () => void; description?: string };

/** Actions de la file À valider : mise à jour optimiste, toasts et annulation. */
export function useValidationActions() {
  const qc = useQueryClient();

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: VALIDATION_KEY });
    qc.invalidateQueries({ queryKey: ["crm", "tasks"] });
    // Badges du menu + fiches mises à jour par le trigger d'envoi.
    qc.invalidateQueries({ queryKey: ["sidebar-badges"] });
    qc.invalidateQueries({ queryKey: ["cockpit"] });
    qc.invalidateQueries({ queryKey: ["ops", "partners"] });
  }, [qc]);

  const removeLocal = useCallback(
    (id: string) =>
      qc.setQueryData<ValidationTask[]>(VALIDATION_KEY, (old) => old?.filter((t) => t.id !== id)),
    [qc],
  );

  const withUndo = useCallback(
    async (task: ValidationTask, run: () => Promise<Undo>, title: string, opts: Opts = {}) => {
      removeLocal(task.id);
      try {
        const undo = await run();
        toast.success(title, {
          description: opts.description,
          duration: 10_000,
          position: "top-center",
          action: {
            label: "Annuler",
            onClick: () => {
              opts.onUndo?.();
              undo()
                .then(() => toast("Remis dans À valider", { position: "top-center" }))
                .catch((e: Error) => toast.error(e.message, { position: "top-center" }))
                .finally(refresh);
            },
          },
        });
      } catch (e) {
        toast.error((e as Error).message, { position: "top-center" });
      } finally {
        refresh();
      }
    },
    [refresh, removeLocal],
  );

  return useMemo(
    () => ({
      send: (task: ValidationTask, name: string, opts?: Opts) =>
        withUndo(task, () => markSent(task), `Envoyé à ${name}`, opts),
      discard: (task: ValidationTask, opts?: Opts) =>
        withUndo(task, () => discardTask(task), "Écarté", opts),
      snooze: async (task: ValidationTask) => {
        removeLocal(task.id);
        try {
          await snoozeTask(task.id, 2);
          toast.success("Reporté de 2 jours");
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          refresh();
        }
      },
      saveDraft: async (task: ValidationTask, draft: string) => {
        qc.setQueryData<ValidationTask[]>(VALIDATION_KEY, (old) =>
          old?.map((t) => (t.id === task.id ? { ...t, message_draft: draft } : t)),
        );
        try {
          await updateTaskDraft(task.id, draft);
          toast.success("Brouillon enregistré");
          return true;
        } catch (e) {
          toast.error((e as Error).message);
          return false;
        } finally {
          refresh();
        }
      },
      copy: async (text: string) => {
        try {
          await copyText(text);
          toast.success("Message copié");
        } catch {
          toast.error("Copie impossible : sélectionner le texte à la main.");
        }
      },
    }),
    [qc, refresh, removeLocal, withUndo],
  );
}

export type ValidationActions = ReturnType<typeof useValidationActions>;

/** Copie lancée dans le clic, avant l'ouverture d'Instagram (sans attendre la promesse). */
export function copyBeforeOpen(text: string) {
  const fail = () =>
    toast.error("Copie impossible : utiliser « Copier » puis coller le message.", {
      position: "top-center",
    });
  if (!navigator.clipboard) return fail();
  navigator.clipboard.writeText(text).catch(fail);
}

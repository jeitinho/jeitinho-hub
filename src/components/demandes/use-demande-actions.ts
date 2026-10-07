import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  DEMANDES_RELATED_KEYS,
  STAGE_LABEL,
  applyStagePatch,
  convertProspectToClient,
  findProspectByEmail,
  qualifyLead,
  removeLead,
  stagePatch,
  type Demande,
  type StageTarget,
} from "@/lib/ops/demandes";

function message(e: unknown) {
  return e instanceof Error ? e.message : "Action impossible.";
}

/** Actions 1 clic sur une demande : changement d'étape (avec « Annuler »), qualification, conversion. */
export function useDemandeActions() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () =>
    Promise.all(DEMANDES_RELATED_KEYS.map((queryKey) => qc.invalidateQueries({ queryKey })));

  const moveTo = async (d: Demande, target: StageTarget) => {
    const p = stagePatch(d, target, new Date().toISOString());
    if (!p) {
      toast.error("Qualifiez d'abord la demande.");
      return;
    }
    const label = target === "spam" ? "Spam" : STAGE_LABEL[target];
    setBusy(d.key);
    try {
      await applyStagePatch(p, p.patch);
      await refresh();
      toast.success(`${d.name} → ${label}`, {
        action: {
          label: "Annuler",
          onClick: () => {
            applyStagePatch(p, p.previous)
              .then(refresh)
              .catch((e) => toast.error(message(e)));
          },
        },
      });
    } catch (e) {
      toast.error(message(e));
    } finally {
      setBusy(null);
    }
  };

  /** Qualifie un lead orphelin ; retourne l'id du prospect (créé ou existant). */
  const qualify = async (d: Demande, all: Demande[]): Promise<string | null> => {
    if (d.kind !== "lead" || !d.lead) return null;
    const existing = findProspectByEmail(all, d.lead.email);
    setBusy(d.key);
    try {
      const prospectId = await qualifyLead(d.lead, existing?.id);
      await refresh();
      toast.success(
        existing ? `Rattachée à la demande existante de ${existing.name}.` : "Demande qualifiée.",
      );
      return prospectId;
    } catch (e) {
      toast.error(message(e));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const convert = async (d: Demande) => {
    if (!d.prospect) return null;
    setBusy(d.key);
    try {
      const clientId = await convertProspectToClient(d.prospect.id);
      await refresh();
      toast.success("Fiche client créée.");
      return clientId;
    } catch (e) {
      toast.error(message(e));
      return null;
    } finally {
      setBusy(null);
    }
  };

  const remove = async (leadId: string) => {
    if (!confirm("Supprimer définitivement ce lead et ses tâches ?")) return false;
    try {
      await removeLead(leadId);
      await refresh();
      toast.success("Lead supprimé.");
      return true;
    } catch (e) {
      toast.error(message(e));
      return false;
    }
  };

  return { moveTo, qualify, convert, remove, busy };
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { BellOff, BellRing, Copy, Loader2, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { PaymentsBlock } from "@/components/payments/payments-block";
import { toggleQuoteFollowups } from "@/lib/crm/crm";
import {
  deleteDraftQuote,
  duplicateQuote,
  fetchQuoteMeta,
  quoteMetaKey,
} from "@/lib/quotes/quote-actions";

function message(e: unknown, fallback: string) {
  return e instanceof Error ? e.message : fallback;
}

/** Relances (pause / reprise), duplication et suppression d'un brouillon. */
export function QuoteActions({ quoteId }: { quoteId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: q } = useQuery({
    queryKey: quoteMetaKey(quoteId),
    queryFn: () => fetchQuoteMeta(quoteId),
  });
  const [busy, setBusy] = useState<"pause" | "dup" | "del" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (!q) return null;

  const togglePause = async () => {
    setBusy("pause");
    try {
      await toggleQuoteFollowups(quoteId, !q.followup_paused);
      await Promise.all(
        [quoteMetaKey(quoteId), ["crm"], ["quotes"], ["demandes"]].map((queryKey) =>
          qc.invalidateQueries({ queryKey }),
        ),
      );
      toast.success(q.followup_paused ? "Relances reprises." : "Relances en pause.");
    } catch (e) {
      toast.error(message(e, "Action impossible."));
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async () => {
    setBusy("dup");
    try {
      const id = await duplicateQuote(quoteId);
      await qc.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Copie créée en brouillon.");
      navigate({ to: "/devis/$id", params: { id } });
    } catch (e) {
      toast.error(message(e, "Duplication impossible."));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    setBusy("del");
    try {
      await deleteDraftQuote(quoteId);
      await Promise.all(
        [["quotes"], ["demandes"]].map((queryKey) => qc.invalidateQueries({ queryKey })),
      );
      toast.success("Devis supprimé.");
      navigate({ to: "/devis" });
    } catch (e) {
      toast.error(message(e, "Suppression impossible."));
    } finally {
      setBusy(null);
      setConfirmDelete(false);
    }
  };

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div className="text-sm">
        <p className="font-medium">Actions sur le devis</p>
        <p className="text-xs text-muted-foreground">
          {q.followup_paused
            ? "Relances automatiques en pause."
            : q.status === "sent"
              ? "Relances automatiques actives tant que le devis est « Envoyé »."
              : "Les relances ne concernent que les devis « Envoyé »."}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={togglePause}>
          {busy === "pause" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : q.followup_paused ? (
            <BellRing className="mr-1.5 h-3.5 w-3.5" />
          ) : (
            <BellOff className="mr-1.5 h-3.5 w-3.5" />
          )}
          {q.followup_paused ? "Reprendre les relances" : "Mettre en pause les relances"}
        </Button>
        <Button size="sm" variant="outline" disabled={busy !== null} onClick={duplicate}>
          {busy === "dup" ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Copy className="mr-1.5 h-3.5 w-3.5" />
          )}
          Dupliquer le devis
        </Button>
        {q.status === "draft" && (
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={busy !== null}
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Supprimer
          </Button>
        )}
      </div>
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce brouillon ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le devis {q.number ?? q.reference} et ses lignes seront supprimés définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                void remove();
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

/** Paiements du devis (masqué pour un brouillon). */
export function QuotePayments({ quoteId }: { quoteId: string }) {
  const { data: q } = useQuery({
    queryKey: quoteMetaKey(quoteId),
    queryFn: () => fetchQuoteMeta(quoteId),
  });
  if (!q || q.status === "draft") return null;
  return (
    <PaymentsBlock
      quoteId={quoteId}
      clientId={q.client_id}
      currency={q.currency}
      total={Number(q.total_amount ?? 0)}
    />
  );
}

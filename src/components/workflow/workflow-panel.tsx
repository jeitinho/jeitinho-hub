import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export type ContentStatus =
  | "draft" | "writing" | "to_review" | "changes_requested" | "approved"
  | "ready_to_publish" | "scheduled" | "published" | "archived" | "deleted";

const STATUS_LABEL: Record<ContentStatus, string> = {
  draft: "Brouillon",
  writing: "En rédaction",
  to_review: "À relire",
  changes_requested: "Corrections",
  approved: "Validé",
  ready_to_publish: "Prêt à publier",
  scheduled: "Programmé",
  published: "Publié",
  archived: "Archivé",
  deleted: "Supprimé",
};

function nextStates(current: ContentStatus, roles: string[]): ContentStatus[] {
  const is = (r: string) => roles.includes(r);
  const canReview = is("admin") || is("manager") || is("redacteur_chef");
  const canEdit = canReview || is("redacteur");
  const canPublish = is("admin") || is("manager");
  const transitions: Record<ContentStatus, ContentStatus[]> = {
    draft: canEdit ? ["writing", "archived"] : [],
    writing: canEdit ? ["to_review", "draft"] : [],
    to_review: canReview ? ["approved", "changes_requested"] : [],
    changes_requested: canEdit ? ["writing"] : [],
    approved: canPublish ? ["ready_to_publish", "scheduled"] : canReview ? ["changes_requested"] : [],
    ready_to_publish: canPublish ? ["published", "scheduled", "approved"] : [],
    scheduled: canPublish ? ["published", "ready_to_publish"] : [],
    published: canPublish ? ["archived"] : [],
    archived: canPublish ? ["draft"] : [],
    deleted: [],
  };
  return transitions[current] ?? [];
}

export function WorkflowPanel({
  contentId, status, onChanged,
}: {
  contentId: string; status: ContentStatus; onChanged: (next: ContentStatus) => void;
}) {
  const { user, roles } = useAuth();
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<ContentStatus | null>(null);
  const nexts = nextStates(status, roles);

  const move = async (to: ContentStatus) => {
    if (!user) return;
    setBusy(to);
    const { data: current } = await supabase.from("contents").select("body_json,title").eq("id", contentId).single();
    const patch: { status: ContentStatus; published_at?: string } = { status: to };
    if (to === "published") patch.published_at = new Date().toISOString();
    const { error } = await supabase.from("contents").update(patch).eq("id", contentId);
    if (error) { setBusy(null); return toast.error(error.message); }
    await supabase.from("content_revisions").insert({
      content_id: contentId,
      editor_id: user.id,
      from_status: status,
      to_status: to,
      note: note.trim() || null,
      snapshot: current ? { title: current.title, body_json: current.body_json } : null,
    });
    setNote("");
    setBusy(null);
    onChanged(to);
    toast.success(`Statut → ${STATUS_LABEL[to]}`);
  };

  return (
    <Card className="border-border/60 space-y-3 p-4">
      <div className="flex items-center justify-between">
        <p className="tracked text-[10px] text-muted-foreground">Workflow</p>
        <span className="pill">{STATUS_LABEL[status]}</span>
      </div>
      {nexts.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucune action disponible avec vos rôles.</p>
      ) : (
        <>
          <Textarea rows={2} placeholder="Note de transition (optionnel)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            {nexts.map((n) => (
              <Button key={n} size="sm" variant="outline" disabled={busy !== null} onClick={() => move(n)}>
                <ArrowRight className="mr-1 h-3 w-3" />{STATUS_LABEL[n]}
              </Button>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { History } from "lucide-react";

type Revision = {
  id: string;
  editor_id: string | null;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
  editor?: { full_name: string | null; email: string } | null;
};

export function RevisionsPanel({ contentId }: { contentId: string }) {
  const [items, setItems] = useState<Revision[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("content_revisions")
        .select("id,editor_id,from_status,to_status,note,created_at")
        .eq("content_id", contentId)
        .order("created_at", { ascending: false })
        .limit(50);
      const list = (data ?? []) as Revision[];
      const ids = Array.from(new Set(list.map((r) => r.editor_id).filter((x): x is string => !!x)));
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email").in("id", ids);
        const map = new Map((profs ?? []).map((p) => [p.id, p]));
        list.forEach((r) => { r.editor = r.editor_id ? map.get(r.editor_id) ?? null : null; });
      }
      setItems(list);
    })();
  }, [contentId]);

  return (
    <Card className="border-border/60 space-y-3 p-4">
      <p className="tracked text-[10px] text-muted-foreground flex items-center gap-2">
        <History className="h-3 w-3" />Historique
      </p>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun changement enregistré.</p>
      ) : (
        <ol className="space-y-2 text-xs">
          {items.map((r) => (
            <li key={r.id} className="border-l-2 border-primary/40 pl-3">
              <div className="text-muted-foreground">
                {new Date(r.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                {" — "}
                {r.editor?.full_name ?? r.editor?.email ?? "système"}
              </div>
              <div>{r.from_status ?? "…"} → <strong>{r.to_status ?? "…"}</strong></div>
              {r.note && <div className="text-muted-foreground italic">« {r.note} »</div>}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
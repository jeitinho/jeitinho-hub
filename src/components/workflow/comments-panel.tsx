import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check } from "lucide-react";

type Comment = {
  id: string;
  body: string;
  author_id: string;
  mentions: string[];
  status: "open" | "resolved" | "hidden";
  created_at: string;
  parent_id: string | null;
  author?: { full_name: string | null; email: string; avatar_url: string | null } | null;
};

type Profile = { id: string; full_name: string | null; email: string; avatar_url: string | null };

export function CommentsPanel({ contentId }: { contentId: string }) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [body, setBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);

  const load = async () => {
    const { data } = await supabase
      .from("content_comments")
      .select("id,body,author_id,mentions,status,created_at,parent_id")
      .eq("content_id", contentId)
      .order("created_at", { ascending: true });
    const list = (data ?? []) as Comment[];
    const ids = Array.from(new Set(list.map((c) => c.author_id)));
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id,full_name,email,avatar_url").in("id", ids);
      const map = new Map((profs ?? []).map((p) => [p.id, p as Profile]));
      list.forEach((c) => { c.author = map.get(c.author_id) ?? null; });
    }
    setComments(list);
  };

  useEffect(() => {
    load();
    supabase.from("profiles").select("id,full_name,email,avatar_url").order("full_name")
      .then(({ data }) => setProfiles((data ?? []) as Profile[]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentId]);

  const parseMentions = (text: string): string[] => {
    const matches = text.match(/@([\w.-]+)/g) ?? [];
    const emails = matches.map((m) => m.slice(1).toLowerCase());
    return profiles.filter((p) =>
      emails.some((e) => (p.email ?? "").toLowerCase().startsWith(e) || (p.full_name ?? "").toLowerCase().replace(/\s+/g, ".").includes(e))
    ).map((p) => p.id);
  };

  const post = async () => {
    if (!user || !body.trim()) return;
    setPosting(true);
    const { error } = await supabase.from("content_comments").insert({
      content_id: contentId,
      author_id: user.id,
      body: body.trim(),
      mentions: parseMentions(body),
    });
    setPosting(false);
    if (error) return toast.error(error.message);
    setBody("");
    await load();
  };

  const resolve = async (id: string) => {
    if (!user) return;
    await supabase.from("content_comments").update({
      status: "resolved", resolved_by: user.id, resolved_at: new Date().toISOString(),
    }).eq("id", id);
    load();
  };

  const onBodyChange = (v: string) => {
    setBody(v);
    const m = v.match(/@([\w.-]*)$/);
    setMentionQuery(m ? m[1].toLowerCase() : null);
  };

  const suggestions = mentionQuery !== null
    ? profiles.filter((p) => (p.full_name ?? "").toLowerCase().includes(mentionQuery) || (p.email ?? "").toLowerCase().includes(mentionQuery)).slice(0, 5)
    : [];

  return (
    <Card className="border-border/60 space-y-3 p-4">
      <p className="tracked text-[10px] text-muted-foreground">Commentaires</p>
      <div className="space-y-3 max-h-[360px] overflow-y-auto">
        {comments.length === 0 && <p className="text-xs text-muted-foreground">Aucun commentaire.</p>}
        {comments.map((c) => (
          <div key={c.id} className={`rounded-md border border-border/60 p-2 text-sm ${c.status === "resolved" ? "opacity-50 line-through" : ""}`}>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{c.author?.full_name ?? c.author?.email ?? "—"}</span>
              <div className="flex items-center gap-2">
                <span>{new Date(c.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                {c.status === "open" && (
                  <button onClick={() => resolve(c.id)} className="text-primary hover:underline" title="Résoudre">
                    <Check className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            <p className="mt-1 whitespace-pre-wrap">{c.body}</p>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <div className="relative">
          <Textarea rows={2} placeholder="Écrire un commentaire (utilisez @ pour mentionner)…" value={body} onChange={(e) => onBodyChange(e.target.value)} />
          {suggestions.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover p-1 text-sm shadow-lg">
              {suggestions.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="block w-full rounded px-2 py-1 text-left hover:bg-accent"
                  onClick={() => {
                    const handle = (s.full_name ?? s.email).split("@")[0].replace(/\s+/g, ".").toLowerCase();
                    setBody(body.replace(/@([\w.-]*)$/, `@${handle} `));
                    setMentionQuery(null);
                  }}
                >
                  {s.full_name ?? s.email} <span className="text-xs text-muted-foreground">{s.email}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-end">
          <Button size="sm" className="btn-primary" disabled={!body.trim() || posting} onClick={post}>
            {posting ? "…" : "Publier"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
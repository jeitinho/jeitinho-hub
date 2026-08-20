import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/cloudflare-auth";
import { getBindings } from "@/lib/cloudflare-db";

const InputSchema = z.object({
  to: z.enum(["draft","writing","to_review","changes_requested","approved","ready_to_publish","scheduled","published","archived","deleted"]),
  note: z.string().max(2000).nullable().optional(),
});

const transitions: Record<string, string[]> = {
  draft: ["writing", "archived"], writing: ["to_review", "draft"], to_review: ["approved", "changes_requested"],
  changes_requested: ["writing"], approved: ["ready_to_publish", "scheduled", "changes_requested"],
  ready_to_publish: ["published", "scheduled", "approved"], scheduled: ["published", "ready_to_publish"],
  published: ["archived"], archived: ["draft"], deleted: [],
};

export const Route = createFileRoute("/api/content/$contentId/workflow")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const db = getBindings().DB;
        const user = await getCurrentUser(db, request);
        if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        const parsed = InputSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: false, error: "Transition invalide." }, { status: 400 });

        const row = await db.prepare("SELECT id,status,body_json,title FROM contents WHERE id = ? LIMIT 1").bind(params.contentId).first<{ id: string; status: string; body_json: string | null; title: string | null }>();
        if (!row) return Response.json({ ok: false, error: "Contenu introuvable." }, { status: 404 });
        if (!transitions[row.status]?.includes(parsed.data.to)) return Response.json({ ok: false, error: "Transition interdite." }, { status: 409 });

        const isReview = user.roles.includes("admin") || user.roles.includes("manager") || user.roles.includes("redacteur_chef");
        const isEdit = isReview || user.roles.includes("redacteur");
        const isPublish = user.roles.includes("admin") || user.roles.includes("manager");
        const to = parsed.data.to;
        if (["writing", "draft", "archived"].includes(to) && !isEdit) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
        if (["approved", "changes_requested"].includes(to) && !isReview) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
        if (["published", "scheduled"].includes(to) && !isPublish) return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });

        const now = new Date().toISOString();
        const publishedAt = to === "published" ? now : null;
        await db.batch([
          db.prepare("UPDATE contents SET status = ?, published_at = COALESCE(?, published_at), updated_at = ? WHERE id = ?").bind(to, publishedAt, now, params.contentId),
          db.prepare("INSERT INTO content_revisions (id,content_id,editor_id,from_status,to_status,note,snapshot,created_at) VALUES (?,?,?,?,?,?,?,?)")
            .bind(crypto.randomUUID(), params.contentId, user.id, row.status, to, parsed.data.note ?? null, JSON.stringify({ title: row.title, body_json: row.body_json ? JSON.parse(row.body_json) : null }), now),
        ]);
        return Response.json({ ok: true, status: to });
      },
    },
  },
});

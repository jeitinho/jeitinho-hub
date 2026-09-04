import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getCurrentUser, getSession } from "@/lib/auth/supabase-auth";

const SUPABASE_URL = "https://sxzdabtarlgozixcbzus.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_lCRfloaagzEBNlbvdspIcA_VCQfL6Cn";

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

function supabaseHeaders(accessToken: string) {
  return { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" };
}

export const Route = createFileRoute("/api/content/$contentId/workflow")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        const current = await getCurrentUser(request);
        if (!current) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        const user = current.user;
        const session = getSession(request);
        if (!session) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        const parsed = InputSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: false, error: "Transition invalide." }, { status: 400 });

        const headers = supabaseHeaders(session.access_token);
        const rowRes = await fetch(`${SUPABASE_URL}/rest/v1/contents?id=eq.${params.contentId}&select=id,status,body_json,title`, { headers });
        const rows = (await rowRes.json().catch(() => [])) as Array<{ id: string; status: string; body_json: unknown; title: string | null }>;
        const row = rows[0];
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
        const publishedAt = to === "published" ? now : undefined;
        const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/contents?id=eq.${params.contentId}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify({ status: to, ...(publishedAt ? { published_at: publishedAt } : {}), updated_at: now }),
        });
        if (!updateRes.ok) return Response.json({ ok: false, error: "Mise à jour impossible." }, { status: 502 });

        await fetch(`${SUPABASE_URL}/rest/v1/content_revisions`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            content_id: params.contentId, editor_id: user.id, from_status: row.status, to_status: to,
            note: parsed.data.note ?? null, snapshot: { title: row.title, body_json: row.body_json },
          }),
        });

        return Response.json({ ok: true, status: to });
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getBindings } from "@/lib/cloudflare-db";

const ALLOWED_BUCKETS = new Set(["avatars", "media"]);

export const Route = createFileRoute("/api/storage/signed-url")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const env = getBindings();
        const current = await getCurrentUser(request);
        const user = current?.user ?? null;
        if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        if (!env.MEDIA) return Response.json({ ok: false, error: "R2 MEDIA binding missing" }, { status: 503 });
        const url = new URL(request.url);
        const bucket = url.searchParams.get("bucket") ?? "";
        const path = url.searchParams.get("path") ?? "";
        if (!ALLOWED_BUCKETS.has(bucket) || !path) return Response.json({ ok: false, error: "Invalid object" }, { status: 400 });
        const object = await env.MEDIA.head(path.replace(/^\/+/, ""));
        if (!object) return Response.json({ ok: false, error: "Not found" }, { status: 404 });
        return Response.json({
          ok: true,
          data: {
            url: `/api/storage/file?bucket=${encodeURIComponent(bucket)}&path=${encodeURIComponent(path)}`,
            expiresAt: Date.now() + 3600 * 1000,
          },
        });
      },
    },
  },
});

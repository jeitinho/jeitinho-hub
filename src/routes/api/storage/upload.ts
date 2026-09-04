import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getBindings } from "@/lib/cloudflare-db";

const ALLOWED_BUCKETS = new Set(["avatars", "media"]);

export const Route = createFileRoute("/api/storage/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const env = getBindings();
        const current = await getCurrentUser(request);
        const user = current?.user ?? null;
        if (!user) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
        if (!env.MEDIA) return Response.json({ ok: false, error: "R2 MEDIA binding missing" }, { status: 503 });

        const form = await request.formData();
        const bucket = String(form.get("bucket") ?? "");
        const path = String(form.get("path") ?? "");
        const file = form.get("file");
        if (!ALLOWED_BUCKETS.has(bucket) || !path || !(file instanceof File)) {
          return Response.json({ ok: false, error: "Invalid upload" }, { status: 400 });
        }
        if (bucket === "avatars") {
          const isManager = user.roles.includes("admin") || user.roles.includes("manager");
          if (!isManager && !path.startsWith(`${user.id}/`)) {
            return Response.json({ ok: false, error: "Forbidden" }, { status: 403 });
          }
        }
        const normalizedPath = path.replace(/^\/+/, "").replace(/\.\.(?:\/|\\)/g, "");
        await env.MEDIA.put(normalizedPath, file.stream() as unknown as ArrayBuffer, {
          httpMetadata: { contentType: file.type || "application/octet-stream", contentDisposition: "inline" },
          customMetadata: { owner_id: user.id, bucket },
        });
        return Response.json({ ok: true, data: { path: normalizedPath, bucket } });
      },
    },
  },
});

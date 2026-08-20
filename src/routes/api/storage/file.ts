import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/cloudflare-auth";
import { getBindings } from "@/lib/cloudflare-db";

export const Route = createFileRoute("/api/storage/file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const env = getBindings();
        const user = await getCurrentUser(env.DB, request);
        if (!user) return new Response("Unauthorized", { status: 401 });
        if (!env.MEDIA) return new Response("R2 MEDIA binding missing", { status: 503 });
        const url = new URL(request.url);
        const bucket = url.searchParams.get("bucket") ?? "";
        const path = (url.searchParams.get("path") ?? "").replace(/^\/+/, "");
        if (!path || !["avatars", "media"].includes(bucket)) return new Response("Invalid object", { status: 400 });

        const object = await env.MEDIA.get(path);
        if (!object) return new Response("Not found", { status: 404 });
        const headers = new Headers();
        object.writeHttpMetadata(headers);
        headers.set("etag", object.httpEtag);
        headers.set("cache-control", "private, max-age=3600");
        return new Response(object.body, { headers });
      },
    },
  },
});

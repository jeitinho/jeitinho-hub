import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/supabase-auth";
import { getBindings } from "@/lib/cloudflare-db";

export const Route = createFileRoute("/api/storage/file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const env = getBindings();
        const current = await getCurrentUser(request);
        const user = current?.user ?? null;
        if (!user) return new Response("Unauthorized", { status: 401 });
        if (!env.MEDIA) return new Response("R2 MEDIA binding missing", { status: 503 });
        const url = new URL(request.url);
        const bucket = url.searchParams.get("bucket") ?? "";
        const path = (url.searchParams.get("path") ?? "").replace(/^\/+/, "");
        if (!path || !["avatars", "media"].includes(bucket)) return new Response("Invalid object", { status: 400 });

        const object = await env.MEDIA.get(path);
        if (!object) return new Response("Not found", { status: 404 });
        const headers = new Headers();
        object.writeHttpMetadata(headers as unknown as Parameters<typeof object.writeHttpMetadata>[0]);
        headers.set("etag", object.httpEtag);
        headers.set("cache-control", "private, max-age=3600");
        return new Response(object.body as unknown as ReadableStream<Uint8Array>, { headers });
      },
    },
  },
});

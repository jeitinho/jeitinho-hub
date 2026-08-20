import { createFileRoute } from "@tanstack/react-router";
import { getBindings } from "@/lib/cloudflare-db";

export const Route = createFileRoute("/api/internal/health")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const env = getBindings();
          const result = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
          const database = result?.ok === 1;
          return Response.json({
            ok: database,
            runtime: "cloudflare-workers",
            database,
            storage: Boolean(env.MEDIA),
            secrets: {
              SETUP_KEY: Boolean(env.SETUP_KEY),
              GITHUB_API_KEY: Boolean(env.GITHUB_API_KEY),
              RESEND_API_KEY: Boolean(env.RESEND_API_KEY),
              RESEND_FROM: Boolean(env.RESEND_FROM),
            },
          }, { status: database ? 200 : 503 });
        } catch (error) {
          return Response.json({ ok: false, runtime: "cloudflare-workers", database: false, error: error instanceof Error ? error.message : "Health check failed" }, { status: 503 });
        }
      },
    },
  },
});

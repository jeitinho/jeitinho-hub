import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getSession } from "@/lib/auth/supabase-auth";

export const Route = createFileRoute("/api/auth/diagnostics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const runtimeEnv = env as unknown as Record<string, string | undefined>;
        const session = getSession(request);
        return Response.json({
          ok: true,
          diagnostics: {
            hasSessionCookie: Boolean(session),
            hasSupabaseAnonKey: Boolean(runtimeEnv.SUPABASE_ANON_KEY || runtimeEnv.VITE_SUPABASE_ANON_KEY),
            hasSupabaseServiceRoleKey: Boolean(runtimeEnv.SUPABASE_SERVICE_ROLE_KEY),
            environment: runtimeEnv.ENVIRONMENT ?? null,
          },
        });
      },
    },
  },
});

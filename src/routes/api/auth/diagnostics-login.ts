import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { getCurrentUser, sessionCookie, signIn } from "@/lib/auth/supabase-auth";

export const Route = createFileRoute("/api/auth/diagnostics-login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
        if (!body?.email || !body?.password) return Response.json({ ok: false, stage: "input" }, { status: 400 });
        try {
          const session = await signIn(body.email, body.password);
          const current = await getCurrentUser(new Request(request.url, { headers: { Cookie: sessionCookie(session) } }));
          const runtimeEnv = env as unknown as Record<string, string | undefined>;
          return Response.json({
            ok: Boolean(current),
            stage: current ? "active" : "profile_lookup_failed",
            hasSupabaseServiceRoleKey: Boolean(runtimeEnv.SUPABASE_SERVICE_ROLE_KEY),
            user: current?.user ?? null,
          }, { status: current ? 200 : 403 });
        } catch (error) {
          return Response.json({
            ok: false,
            stage: "exception",
            error: error instanceof Error ? error.message : "unknown",
          }, { status: 500 });
        }
      },
    },
  },
});

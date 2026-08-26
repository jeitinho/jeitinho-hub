import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie, getCurrentUser, sessionCookie } from "@/lib/auth/supabase-auth";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const current = await getCurrentUser(request);
        if (!current) return new Response(JSON.stringify({ ok: false, user: null }), { status: 401, headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() } });
        return new Response(JSON.stringify({ ok: true, user: current.user }), {
          status: 200,
          headers: { "content-type": "application/json", "set-cookie": sessionCookie(current.session) },
        });
      },
    },
  },
});

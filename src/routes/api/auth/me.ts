import { createFileRoute } from "@tanstack/react-router";
import { clearSessionCookie, getCurrentUser } from "@/lib/auth/cloudflare-auth";
import { getBindings } from "@/lib/cloudflare-db";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const env = getBindings();
        const user = await getCurrentUser(env.DB, request);
        if (!user) {
          return new Response(JSON.stringify({ ok: false, user: null }), {
            status: 401,
            headers: { "content-type": "application/json", "set-cookie": clearSessionCookie() },
          });
        }
        return Response.json({ ok: true, user });
      },
    },
  },
});

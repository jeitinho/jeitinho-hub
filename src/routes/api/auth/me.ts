import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/cloudflare-auth";
import { getBindings } from "@/lib/cloudflare-db";

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const user = await getCurrentUser(getBindings().DB, request);
        if (!user) return Response.json({ ok: false, user: null }, { status: 401 });
        return Response.json({ ok: true, user });
      },
    },
  },
});

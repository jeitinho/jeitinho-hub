import { createFileRoute } from "@tanstack/react-router";
import { getCurrentUser } from "@/lib/auth/supabase-auth";

// Lets the browser bridge the existing httpOnly-cookie session into the
// client-side Supabase SDK (see src/routes/auth.tsx and use-auth.tsx), for
// sessions that started before that bridging existed, or after a reload
// where the SDK's own localStorage session was cleared.
export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const current = await getCurrentUser(request);
        if (!current) return Response.json({ ok: false }, { status: 401 });
        return Response.json({ ok: true, session: current.session });
      },
    },
  },
});

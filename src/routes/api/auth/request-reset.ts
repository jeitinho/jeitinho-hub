import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requestPasswordReset } from "@/lib/auth/supabase-auth";

const RequestSchema = z.object({ email: z.string().email() });

export const Route = createFileRoute("/api/auth/request-reset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: true, message: "Si ce compte existe, vous recevrez les instructions." }, { status: 202 });
        try {
          const origin = new URL(request.url).origin;
          await requestPasswordReset(parsed.data.email, `${origin}/reset-password`);
        } catch (error) {
          console.error("[auth/request-reset] Supabase recover failed", error);
        }
        return Response.json({ ok: true, message: "Si ce compte existe, vous recevrez les instructions." }, { status: 202 });
      },
    },
  },
});

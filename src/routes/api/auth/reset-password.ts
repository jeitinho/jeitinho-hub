import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { updatePassword } from "@/lib/auth/supabase-auth";

const ResetSchema = z.object({ accessToken: z.string().min(20), password: z.string().min(10) });

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = ResetSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: false, error: "Lien ou mot de passe invalide." }, { status: 400 });
        try {
          await updatePassword(parsed.data.accessToken, parsed.data.password);
          return Response.json({ ok: true });
        } catch (error) {
          return Response.json({ ok: false, error: error instanceof Error ? error.message : "Impossible de réinitialiser le mot de passe." }, { status: 400 });
        }
      },
    },
  },
});

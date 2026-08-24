import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { consumePasswordResetToken } from "@/lib/auth/cloudflare-auth";
import { getBindings } from "@/lib/cloudflare-db";

const ResetSchema = z.object({
  accessToken: z.string().min(20).optional(),
  token: z.string().min(20).optional(),
  password: z.string().min(10),
});

export const Route = createFileRoute("/api/auth/reset-password")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = ResetSchema.safeParse(await request.json().catch(() => null));
        const token = parsed.success ? (parsed.data.token ?? parsed.data.accessToken) : null;
        if (!parsed.success || !token) return Response.json({ ok: false, error: "Lien ou mot de passe invalide." }, { status: 400 });
        try {
          const result = await consumePasswordResetToken(getBindings().DB, token, parsed.data.password);
          if (!result) return Response.json({ ok: false, error: "Lien de réinitialisation invalide ou expiré." }, { status: 400 });
          return Response.json({ ok: true });
        } catch (error) {
          console.error("[auth/reset-password]", error);
          return Response.json({ ok: false, error: "Impossible de réinitialiser le mot de passe." }, { status: 500 });
        }
      },
    },
  },
});

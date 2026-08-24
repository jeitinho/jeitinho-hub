import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createPasswordResetToken } from "@/lib/auth/cloudflare-auth";
import { getBindings } from "@/lib/cloudflare-db";

const RequestSchema = z.object({ email: z.string().email() });
const GENERIC = { ok: true, message: "Si ce compte existe, vous recevrez les instructions." };

export const Route = createFileRoute("/api/auth/request-reset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json(GENERIC, { status: 202 });
        const env = getBindings();
        const email = parsed.data.email.toLowerCase();
        try {
          const user = await env.DB.prepare("SELECT id FROM users WHERE email = ? LIMIT 1").bind(email).first<{ id: string }>();
          if (user) {
            const token = await createPasswordResetToken(env.DB, user.id);
            const origin = new URL(request.url).origin;
            const link = `${origin}/reset-password#access_token=${token}&type=recovery`;
            if (env.RESEND_API_KEY && env.RESEND_FROM) {
              const sent = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
                body: JSON.stringify({
                  from: env.RESEND_FROM,
                  to: [email],
                  subject: "Réinitialisation de votre mot de passe — JEITINHO Hub",
                  html: `<p>Bonjour,</p><p>Pour choisir un nouveau mot de passe, cliquez sur ce lien (valable 1 heure) :</p><p><a href="${link}">${link}</a></p>`,
                }),
              });
              if (!sent.ok) console.error("[auth/request-reset] resend failed", sent.status);
            } else {
              console.warn("[auth/request-reset] RESEND_API_KEY/RESEND_FROM missing — reset link not emailed");
            }
          }
        } catch (error) {
          console.error("[auth/request-reset]", error);
        }
        return Response.json(GENERIC, { status: 202 });
      },
    },
  },
});

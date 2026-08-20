import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getBindings } from "@/lib/cloudflare-db";

const RequestSchema = z.object({ email: z.string().email() });

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const Route = createFileRoute("/api/auth/request-reset")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = RequestSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: true, message: "Si ce compte existe, vous recevrez les instructions." }, { status: 202 });
        const env = getBindings();
        const user = await env.DB.prepare("SELECT id,email,status FROM users WHERE email=? LIMIT 1").bind(parsed.data.email.toLowerCase()).first<{ id: string; email: string; status: string }>();
        if (!user || user.status !== "active") return Response.json({ ok: true, message: "Si ce compte existe, vous recevrez les instructions." }, { status: 202 });
        if (!env.RESEND_API_KEY || !env.RESEND_FROM) return Response.json({ ok: false, error: "La réinitialisation par email n'est pas encore configurée." }, { status: 503 });

        const rawTokenBytes = new Uint8Array(48);
        crypto.getRandomValues(rawTokenBytes);
        const rawToken = btoa(String.fromCharCode(...rawTokenBytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
        const tokenHash = await sha256Hex(rawToken);
        const now = Math.floor(Date.now() / 1000);
        const expires = now + 30 * 60;
        await env.DB.prepare("INSERT INTO auth_password_resets (id,user_id,token_hash,expires_at,created_at) VALUES (?,?,?,?,?)").bind(crypto.randomUUID(), user.id, tokenHash, expires, now).run();

        const resetUrl = `${new URL(request.url).origin}/reset-password?token=${encodeURIComponent(rawToken)}`;
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Authorization": `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: env.RESEND_FROM, to: [user.email], subject: "Réinitialiser votre mot de passe — JEITINHO Hub", html: `<p>Vous avez demandé à réinitialiser votre mot de passe JEITINHO Hub.</p><p><a href="${resetUrl}">Réinitialiser mon mot de passe</a></p><p>Ce lien expire dans 30 minutes.</p>` }),
        });
        if (!response.ok) {
          await env.DB.prepare("DELETE FROM auth_password_resets WHERE token_hash=?").bind(tokenHash).run();
          console.error("[auth/request-reset] Resend failed", response.status, await response.text());
          return Response.json({ ok: false, error: "Impossible d'envoyer l'email de réinitialisation." }, { status: 502 });
        }
        return Response.json({ ok: true, message: "Si ce compte existe, vous recevrez les instructions." }, { status: 202 });
      },
    },
  },
});

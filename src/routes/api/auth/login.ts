import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { resolveSession, sessionCookie, signIn } from "@/lib/auth/supabase-auth";

const LoginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null);
        const parsed = LoginSchema.safeParse(body);
        if (!parsed.success) return Response.json({ ok: false, error: "Identifiants invalides." }, { status: 400 });
        try {
          const session = await signIn(parsed.data.email, parsed.data.password);
          const current = await resolveSession(session);
          if (!current) {
            return Response.json({
              ok: false,
              error: "Profil Hub introuvable ou inactif après authentification Supabase.",
            }, { status: 403 });
          }
          return new Response(JSON.stringify({ ok: true, user: current.user }), {
            status: 200,
            headers: { "content-type": "application/json", "set-cookie": sessionCookie(session) },
          });
        } catch (error) {
          return Response.json({ ok: false, error: error instanceof Error ? error.message : "Connexion impossible." }, { status: 401 });
        }
      },
    },
  },
});

import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { sessionCookie, signUp } from "@/lib/auth/supabase-auth";

const SignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(10, "Le mot de passe doit contenir au moins 10 caractères."),
  fullName: z.string().trim().min(2).max(120),
});

export const Route = createFileRoute("/api/auth/signup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = SignupSchema.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return Response.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Informations invalides." }, { status: 400 });
        try {
          const result = await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName);
          if (!result.user) return Response.json({ ok: false, error: "Création impossible." }, { status: 502 });
          // The pending profiles row is created by the on_auth_user_created DB
          // trigger (see migration auto_create_pending_profile_on_signup),
          // not here — this used to insert it client-side, but that only ran
          // when Supabase returned an immediate session, which it doesn't
          // when email confirmation is required: the row, and with it any
          // trace of the signup, was silently never created.
          if (!result.access_token || !result.refresh_token) {
            return Response.json({ ok: true, active: false, message: "Compte créé. Vérifiez votre email si nécessaire, puis un administrateur validera votre accès." });
          }
          return new Response(JSON.stringify({ ok: true, active: false, message: "Compte créé. Un administrateur doit valider votre accès.", session: { access_token: result.access_token, refresh_token: result.refresh_token } }), {
            status: 200,
            headers: { "content-type": "application/json", "set-cookie": sessionCookie({ access_token: result.access_token, refresh_token: result.refresh_token }) },
          });
        } catch (error) {
          return Response.json({ ok: false, error: error instanceof Error ? error.message : "Création impossible." }, { status: 400 });
        }
      },
    },
  },
});

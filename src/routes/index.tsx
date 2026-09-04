import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    // Supabase's password-recovery email link verifies the token server-side, then
    // redirects the browser to the project's configured Site URL — which is this
    // root route, not /reset-password — appending #access_token=...&type=recovery.
    // Forward it to /reset-password (which parses that hash) instead of letting the
    // normal auth check below swallow it and bounce to /auth.
    if (typeof window !== "undefined" && window.location.hash.includes("type=recovery")) {
      window.location.replace(`/reset-password${window.location.hash}`);
      return;
    }
    const response = await fetch("/api/auth/me", { credentials: "include" });
    throw redirect({ to: response.ok ? "/dashboard" : "/auth" });
  },
  component: () => null,
});

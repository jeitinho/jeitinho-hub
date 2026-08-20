import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const response = await fetch("/api/auth/me", { credentials: "include" });
    throw redirect({ to: response.ok ? "/dashboard" : "/auth" });
  },
  component: () => null,
});

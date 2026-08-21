import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/diagnostics-logo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const origin = new URL(request.url).origin;
        const candidates = [
          "/__l5e/assets-v1/f1ab1964-a2c8-4076-b0bc-900118e82538/jeitinho-logo.png",
          "/assets/jeitinho-logo.png",
        ];
        const results = await Promise.all(candidates.map(async (path) => {
          try {
            const response = await fetch(`${origin}${path}`, { method: "HEAD" });
            return { path, status: response.status, contentType: response.headers.get("content-type") };
          } catch (error) {
            return { path, status: 0, contentType: null, error: error instanceof Error ? error.message : "unknown" };
          }
        }));
        return Response.json({ results });
      },
    },
  },
});

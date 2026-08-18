// @lovable.dev/vite-tanstack-config already includes the TanStack Start,
// React, Tailwind, TypeScript paths, Nitro/Cloudflare target and env handling.
// Keep the default TanStack server entry so Cloudflare can deploy the
// generated .output/server/index.mjs without a custom server wrapper.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({});

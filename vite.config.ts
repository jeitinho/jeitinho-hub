import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteTsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [
    viteTsconfigPaths(),
    tailwindcss(),
    cloudflare({
      configPath: "./wrangler.jsonc",
      viteEnvironment: { name: "ssr" },
    }),
    tanstackStart(),
    react(),
  ],
});

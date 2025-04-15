import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    cloudflare(),
    tailwindcss(),
    sentryVitePlugin({
      org: "sentry",
      project: "remote-mcp",
    }),
  ],

  define: {
    "import.meta.env.SENTRY_DSN": JSON.stringify(process.env.SENTRY_DSN),
  },

  build: {
    sourcemap: true,
  },
});

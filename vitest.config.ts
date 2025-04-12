import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    poolOptions: {
      workers: {
        miniflare: {},
        wrangler: { configPath: "./wrangler.toml" },
      },
    },
    deps: {
      interopDefault: true,
    },
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.{test,spec,eval}.ts", "src/types.ts"],
    },
    setupFiles: ["dotenv/config", "src/test-setup.ts"],
  },
});

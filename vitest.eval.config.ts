import { defineConfig } from "vitest/config";

import defaultConfig from "./vitest.config";

export default defineConfig({
  ...defaultConfig,
  test: {
    ...defaultConfig.test,
    include: ["src/**/*.eval.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
  },
});

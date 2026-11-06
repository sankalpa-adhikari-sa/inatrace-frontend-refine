import react from "@vitejs/plugin-react";
import path from "node:path";
import { configDefaults, defineConfig } from "vitest/config";

// Kept apart from vite.config.ts: tests don't need the hey-api plugin (it would regenerate
// src/client/types.gen.ts on every run) or Tailwind.
// Tests that import nothing touching the DOM or i18next run in plain Node; everything else in jsdom.
const NODE_TESTS = ["src/lib/endpoint.test.ts", "src/lib/i18n-locales.test.ts"];

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  define: { __APP_VERSION__: JSON.stringify("test") },
  test: {
    css: false,
    // Refine's ESM builds import "lodash/isEqual" without an extension, which Node can't resolve;
    // let Vite transform them instead.
    server: { deps: { inline: [/@refinedev\//] } },
    restoreMocks: true,
    unstubEnvs: true,
    coverage: {
      provider: "v8",
      include: [
        "src/lib/**",
        "src/providers/**",
        "src/stores/**",
        "src/hooks/**",
        "src/pages/**/model.ts",
        "src/pages/**/model.tsx",
        "src/components/app/**",
      ],
      exclude: ["src/client/**", "src/lib/endpoints.ts", "src/**/*-impl.tsx", "src/**/*.test.{ts,tsx}"],
    },
    projects: [
      {
        extends: true,
        test: { name: "node", environment: "node", include: NODE_TESTS },
      },
      {
        extends: true,
        test: {
          name: "dom",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          exclude: [...configDefaults.exclude, ...NODE_TESTS],
          setupFiles: ["./test/setup.ts"],
        },
      },
    ],
  },
});

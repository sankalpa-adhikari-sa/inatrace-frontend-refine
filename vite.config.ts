import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { defineConfig } from "vite";
import { heyApiPlugin } from "@hey-api/vite-plugin";
import openApiConfig from "./openapi-ts.config";
import pkg from "./package.json";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), heyApiPlugin({ config: openApiConfig })],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    // Playwright writes traces / reports while tests run; watching them makes Vite reload the page under test.
    watch: { ignored: ["**/.playwright/**", "**/coverage/**"] },
    proxy: {
      "/api": { target: process.env.API_PROXY_TARGET ?? "http://localhost:8080", changeOrigin: true },
    },
  },
  // `vite preview` (the built app, used by the CI end-to-end run) proxies /api the same way.
  preview: {
    proxy: {
      "/api": { target: process.env.API_PROXY_TARGET ?? "http://localhost:8080", changeOrigin: true },
    },
  },
});

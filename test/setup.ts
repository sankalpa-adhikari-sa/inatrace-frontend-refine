/**
 * Vitest setup for the jsdom project: jest-dom matchers, the MSW server, real translations without
 * HTTP, the jsdom gaps Base UI needs, and a reset of the app's module-level singletons between tests.
 */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";
import { requests, server } from "./msw";

// i18next-http-backend fetches /locales/… with a relative URL, which Node's fetch rejects.
// Serve the real locale files instead, so tests see real strings (and raw keys when one is missing).
vi.mock("i18next-http-backend", async () => {
  const { readFileSync } = await import("node:fs");
  const path = await import("node:path");
  const read = (lng: string) => {
    try {
      return JSON.parse(readFileSync(path.join(process.cwd(), "public/locales", lng, "common.json"), "utf8"));
    } catch {
      return {};
    }
  };
  return {
    default: class {
      static type = "backend" as const;
      type = "backend" as const;
      init() {}
      read(lng: string, _ns: string, callback: (error: unknown, data: unknown) => void) {
        callback(null, read(lng));
      }
    },
  };
});

// MapLibre needs WebGL, which jsdom lacks; maps are covered by Playwright.
vi.mock("@/components/app/map-view-impl", () => ({ default: () => null }));

// The language detector reads this when @/lib/i18n is first imported.
localStorage.setItem("inatraceLocale", "en");

// jsdom gaps that Base UI touches.
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= NoopResizeObserver as unknown as typeof ResizeObserver;
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;
Element.prototype.scrollIntoView ??= () => {};
Element.prototype.getAnimations ??= () => [];
globalThis.PointerEvent ??= MouseEvent as unknown as typeof PointerEvent;

// A request no handler answered fails the test that made it (strict mocking, like the Playwright ApiMock).
const unhandled: string[] = [];
server.events.on("request:unhandled", ({ request }) => {
  const url = new URL(request.url);
  unhandled.push(`${request.method} ${url.pathname}${url.search}`);
});

beforeAll(async () => {
  server.listen({ onUnhandledFrame: "error" });
  const { i18nReady } = await import("@/lib/i18n");
  await i18nReady();
});

afterEach(async () => {
  cleanup();
  const missed = unhandled.splice(0);
  server.resetHandlers();
  requests.length = 0;

  // Module singletons that would otherwise leak from one test into the next.
  const [{ queryClient }, auth, api, { useCompanyStore }, { changeLocale }] = await Promise.all([
    import("@/lib/query-client"),
    import("@/providers/auth"),
    import("@/lib/api"),
    import("@/stores/company"),
    import("@/lib/i18n"),
  ]);
  queryClient.clear();
  auth.invalidateProfile();
  api.setLoggedOut(false);
  useCompanyStore.getState().clear();
  sessionStorage.clear();
  localStorage.clear();
  localStorage.setItem("inatraceLocale", "en");
  await changeLocale("en");

  if (missed.length) throw new Error(`Unmocked API requests (add a handler with server.use(on(ep.…))):\n  ${missed.join("\n  ")}`);
});

afterAll(() => server.close());

import type { Page, Request, Route } from "@playwright/test";
import type { Endpoint } from "@/lib/endpoint";

/**
 * Typed, strict mock of the InaTrace API for the mocked Playwright tier.
 *
 * - One `page.route("**\/api/**")` dispatches to handlers registered with `on(ep.x, …)`. The URL
 *   template and the response type come from the OpenAPI spec, so a backend change breaks the
 *   mock at typecheck.
 * - A request no handler answers gets a 599 and is recorded in `unhandled`; the `api` fixture
 *   fails the test with the list, so a new request on a screen can't go unnoticed.
 * - Third-party requests (map tiles, analytics) are aborted so tests never touch the network.
 */

type Params = Record<string, string>;
type Info = { request: Request; params: Params; url: URL; body: any };
type Raw = { status: number; body?: unknown };
type Handler<R> = (info: Info) => R | Raw | Promise<R | Raw>;

type Entry = { method: string; regex: RegExp; keys: string[]; handler: Handler<unknown> };

export type ApiCall = { method: string; path: string; url: URL; body: any };

export const ok = <T>(data: T) => ({ status: "OK" as const, data });
export const paged = <T>(items: T[], count = items.length) => ok({ items, count });
/** A non-OK response, e.g. `fail(400, "VALIDATION_ERROR", { email: "invalid" })`. */
export const fail = (status: number, errorMessage = "ERROR", fieldErrors?: Record<string, string>): Raw => ({
  status,
  body: { status: "ERROR", errorMessage, ...(fieldErrors && { validationErrorDetails: { fieldErrors } }) },
});

const isRaw = (value: unknown): value is Raw =>
  !!value && typeof value === "object" && typeof (value as Raw).status === "number";

function compile(template: string) {
  const keys: string[] = [];
  const source = template
    .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
    .replace(/\{(\w+)\}/g, (_, key: string) => {
      keys.push(key);
      return "([^/]+)";
    });
  return { regex: new RegExp(`^${source}$`), keys };
}

export class ApiMock {
  private entries: Entry[] = [];
  readonly calls: ApiCall[] = [];
  readonly unhandled: string[] = [];

  constructor(
    private readonly page: Page,
    /** The app's origin; requests to it (other than /api) are served normally. */
    private readonly appOrigin: string,
  ) {}

  async install() {
    const origin = new URL(this.appOrigin).origin;
    await this.page.route("**/*", (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith("/api/")) return this.dispatch(route);
      // App assets come from the dev server; anything else (tiles, analytics, fonts CDN) is blocked.
      if (url.origin === origin || url.hostname === "localhost" || url.hostname === "127.0.0.1") return route.fallback();
      return route.abort("blockedbyclient");
    });
  }

  /** Answer `e` with `handler`. Registered later = checked first, so tests can override defaults. */
  on<R>(e: Endpoint<any, R>, handler: Handler<R>) {
    const { regex, keys } = compile(e.url);
    this.entries.unshift({ method: e.method.toUpperCase(), regex, keys, handler: handler as Handler<unknown> });
    return this;
  }

  /** Calls made to `e` so far. */
  callsTo(e: Endpoint<any, any>) {
    const { regex } = compile(e.url);
    return this.calls.filter((c) => c.method === e.method.toUpperCase() && regex.test(c.path));
  }

  private async dispatch(route: Route) {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    let body: unknown;
    try {
      body = request.postDataJSON();
    } catch {
      body = request.postData();
    }
    this.calls.push({ method, path: url.pathname, url, body });

    for (const entry of this.entries) {
      if (entry.method !== method) continue;
      const match = entry.regex.exec(url.pathname);
      if (!match) continue;
      const params = Object.fromEntries(entry.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
      const result = await entry.handler({ request, params, url, body });
      // Envelopes carry a string status ("OK"); a numeric status means "send this HTTP status".
      const raw = isRaw(result) ? result : null;
      return route.fulfill({
        status: raw ? raw.status : 200,
        contentType: "application/json",
        body: raw ? (raw.body === undefined ? "" : JSON.stringify(raw.body)) : JSON.stringify(result),
      });
    }

    this.unhandled.push(`${method} ${url.pathname}${url.search}`);
    return route.fulfill({ status: 599, contentType: "text/plain", body: `Unmocked ${method} ${url.pathname}` });
  }
}

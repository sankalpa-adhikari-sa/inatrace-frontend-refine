# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: login.spec.ts >> Login >> logs in and returns to the page that required it
- Location: test/ui/login.spec.ts:46:3

# Error details

```
TypeError: Invalid URL
```

# Test source

```ts
  1   | import type { Page, Request, Route } from "@playwright/test";
  2   | import type { Endpoint } from "@/lib/endpoint";
  3   | 
  4   | /**
  5   |  * Typed, strict mock of the InaTrace API for the mocked Playwright tier.
  6   |  *
  7   |  * - One `page.route("**\/api/**")` dispatches to handlers registered with `on(ep.x, …)`. The URL
  8   |  *   template and the response type come from the OpenAPI spec, so a backend change breaks the
  9   |  *   mock at typecheck.
  10  |  * - A request no handler answers gets a 599 and is recorded in `unhandled`; the `api` fixture
  11  |  *   fails the test with the list, so a new request on a screen can't go unnoticed.
  12  |  * - Third-party requests (map tiles, analytics) are aborted so tests never touch the network.
  13  |  */
  14  | 
  15  | type Params = Record<string, string>;
  16  | type Info = { request: Request; params: Params; url: URL; body: any };
  17  | type Raw = { status: number; body?: unknown };
  18  | type Handler<R> = (info: Info) => R | Raw | Promise<R | Raw>;
  19  | 
  20  | type Entry = { method: string; regex: RegExp; keys: string[]; handler: Handler<unknown> };
  21  | 
  22  | export type ApiCall = { method: string; path: string; url: URL; body: any };
  23  | 
  24  | export const ok = <T>(data: T) => ({ status: "OK" as const, data });
  25  | export const paged = <T>(items: T[], count = items.length) => ok({ items, count });
  26  | /** A non-OK response, e.g. `fail(400, "VALIDATION_ERROR", { email: "invalid" })`. */
  27  | export const fail = (status: number, errorMessage = "ERROR", fieldErrors?: Record<string, string>): Raw => ({
  28  |   status,
  29  |   body: { status: "ERROR", errorMessage, ...(fieldErrors && { validationErrorDetails: { fieldErrors } }) },
  30  | });
  31  | 
  32  | const isRaw = (value: unknown): value is Raw =>
  33  |   !!value && typeof value === "object" && typeof (value as Raw).status === "number";
  34  | 
  35  | function compile(template: string) {
  36  |   const keys: string[] = [];
  37  |   const source = template
  38  |     .replace(/[.*+?^$()|[\]\\]/g, "\\$&")
  39  |     .replace(/\{(\w+)\}/g, (_, key: string) => {
  40  |       keys.push(key);
  41  |       return "([^/]+)";
  42  |     });
  43  |   return { regex: new RegExp(`^${source}$`), keys };
  44  | }
  45  | 
  46  | export class ApiMock {
  47  |   private entries: Entry[] = [];
  48  |   readonly calls: ApiCall[] = [];
  49  |   readonly unhandled: string[] = [];
  50  | 
  51  |   constructor(
  52  |     private readonly page: Page,
  53  |     /** The app's origin; requests to it (other than /api) are served normally. */
  54  |     private readonly appOrigin: string,
  55  |   ) {}
  56  | 
  57  |   async install() {
> 58  |     const origin = new URL(this.appOrigin).origin;
      |                    ^ TypeError: Invalid URL
  59  |     await this.page.route("**/*", (route) => {
  60  |       const url = new URL(route.request().url());
  61  |       if (url.pathname.startsWith("/api/")) return this.dispatch(route);
  62  |       // App assets come from the dev server; anything else (tiles, analytics, fonts CDN) is blocked.
  63  |       if (url.origin === origin || url.hostname === "localhost" || url.hostname === "127.0.0.1") return route.fallback();
  64  |       return route.abort("blockedbyclient");
  65  |     });
  66  |   }
  67  | 
  68  |   /** Answer `e` with `handler`. Registered later = checked first, so tests can override defaults. */
  69  |   on<R>(e: Endpoint<any, R>, handler: Handler<R>) {
  70  |     const { regex, keys } = compile(e.url);
  71  |     this.entries.unshift({ method: e.method.toUpperCase(), regex, keys, handler: handler as Handler<unknown> });
  72  |     return this;
  73  |   }
  74  | 
  75  |   /** Calls made to `e` so far. */
  76  |   callsTo(e: Endpoint<any, any>) {
  77  |     const { regex } = compile(e.url);
  78  |     return this.calls.filter((c) => c.method === e.method.toUpperCase() && regex.test(c.path));
  79  |   }
  80  | 
  81  |   private async dispatch(route: Route) {
  82  |     const request = route.request();
  83  |     const url = new URL(request.url());
  84  |     const method = request.method();
  85  |     let body: unknown;
  86  |     try {
  87  |       body = request.postDataJSON();
  88  |     } catch {
  89  |       body = request.postData();
  90  |     }
  91  |     this.calls.push({ method, path: url.pathname, url, body });
  92  | 
  93  |     for (const entry of this.entries) {
  94  |       if (entry.method !== method) continue;
  95  |       const match = entry.regex.exec(url.pathname);
  96  |       if (!match) continue;
  97  |       const params = Object.fromEntries(entry.keys.map((k, i) => [k, decodeURIComponent(match[i + 1])]));
  98  |       const result = await entry.handler({ request, params, url, body });
  99  |       // Envelopes carry a string status ("OK"); a numeric status means "send this HTTP status".
  100 |       const raw = isRaw(result) ? result : null;
  101 |       return route.fulfill({
  102 |         status: raw ? raw.status : 200,
  103 |         contentType: "application/json",
  104 |         body: raw ? (raw.body === undefined ? "" : JSON.stringify(raw.body)) : JSON.stringify(result),
  105 |       });
  106 |     }
  107 | 
  108 |     this.unhandled.push(`${method} ${url.pathname}${url.search}`);
  109 |     return route.fulfill({ status: 599, contentType: "text/plain", body: `Unmocked ${method} ${url.pathname}` });
  110 |   }
  111 | }
  112 | 
```
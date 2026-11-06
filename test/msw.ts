import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { Endpoint } from "@/lib/endpoint";

/**
 * MSW server for Vitest. Started in test/setup.ts with `onUnhandledRequest: "error"`, so a request a
 * test didn't mock fails it. Register handlers per test with `server.use(on(ep.x, …))`.
 */
export const server = setupServer();

/** Every request a handler built with `on()` answered, in order; cleared after each test. */
export const requests: { method: string; url: URL; body: unknown; headers: Headers }[] = [];

export const ok = <T>(data: T) => ({ status: "OK" as const, data });
export const paged = <T>(items: T[], count = items.length) => ok({ items, count });
export const fail = (status: number, errorMessage = "ERROR", fieldErrors?: Record<string, string>) =>
  HttpResponse.json(
    { status: "ERROR", errorMessage, ...(fieldErrors && { validationErrorDetails: { fieldErrors } }) },
    { status },
  );

type Info = { request: Request; params: Record<string, string>; body: any; url: URL };

/**
 * Handler for an `ep` entry. The URL template comes from the OpenAPI spec and the resolver must return
 * the endpoint's generated response type (envelope included), so a backend change breaks the mock at `tsc`.
 * Return a `Response` (e.g. `fail(400)`) to send something else.
 */
export function on<R>(e: Endpoint<any, R>, resolve: (info: Info) => R | Response | Promise<R | Response>) {
  const path = `*${e.url.replace(/\{(\w+)\}/g, ":$1")}`;
  return http[e.method](path, async ({ request, params }) => {
    const url = new URL(request.url);
    const text = request.method === "GET" || request.method === "HEAD" ? "" : await request.clone().text();
    const body = text ? JSON.parse(text) : undefined;
    requests.push({ method: request.method, url, body, headers: request.headers });
    const out = await resolve({ request, params: params as Record<string, string>, body, url });
    return out instanceof Response ? out : HttpResponse.json(out as never);
  });
}

/** Requests sent to one endpoint. */
export function requestsTo(e: Endpoint<any, any>) {
  const pattern = new RegExp(`${e.url.replace(/\{\w+\}/g, "[^/]+")}$`);
  return requests.filter((r) => r.method === e.method.toUpperCase() && pattern.test(r.url.pathname));
}

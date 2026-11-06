import type { BaseKey, CrudFilter, CrudSort, DataProvider, Pagination } from "@refinedev/core";
import { createDataProvider } from "@refinedev/rest";
import type { Options as KyOptions } from "ky";
import { ApiError, apiBase, notifyApiError, readJson, toApiError, unwrapResponse } from "@/lib/api";
import { argsOf, fillPath, toSearchParams } from "@/lib/endpoint";
import { getLocale } from "@/lib/i18n";
import { type ResourceRequest, resources } from "./resources";

type Op = "list" | "one" | "create" | "update" | "remove";
type Meta = Record<string, any> | undefined;

function resolve(resource: string, op: Op, params: { id?: BaseKey; variables?: unknown; meta?: Meta }): ResourceRequest {
  const def = resources[resource];
  const meta = params.meta ?? {};
  const req =
    op === "list"
      ? def?.list?.(meta)
      : op === "one"
        ? def?.one?.(params.id!, meta)
        : op === "create"
          ? def?.create?.(params.variables, meta)
          : op === "update"
            ? def?.update?.(params.id!, params.variables, meta)
            : def?.remove?.(params.id!, meta);
  if (!req) throw new ApiError(`"${op}" is not supported for resource "${resource}"`, 501);
  return req;
}

// ky's prefixUrl requires inputs without a leading slash.
const endpointOf = (req: ResourceRequest) => {
  const { path, query } = argsOf(req.args);
  return fillPath(req.ep.url, path, query).replace(/^\//, "");
};
const queryOf = (req: ResourceRequest) => toSearchParams(argsOf(req.args).query);

/** limit / offset / sortBy / sort plus plain filter params, as InaTrace list endpoints expect. */
function listQuery(pagination?: Pagination, sorters?: CrudSort[], filters?: CrudFilter[]) {
  const query: Record<string, unknown> = {};
  if (pagination?.mode !== "off") {
    const pageSize = pagination?.pageSize ?? 10;
    query.limit = pageSize;
    query.offset = ((pagination?.currentPage ?? 1) - 1) * pageSize;
  } else {
    query.limit = 1000;
  }
  const sorter = sorters?.[0];
  if (sorter) {
    query.sortBy = sorter.field;
    query.sort = sorter.order === "desc" ? "DESC" : "ASC";
  }
  for (const filter of filters ?? []) {
    if ("field" in filter) query[filter.field] = filter.value;
  }
  return query;
}

// "create" requests that must be sent with PUT go through the update method,
// since @refinedev/rest always POSTs creates (InaTrace mostly uses
// create-or-update PUT endpoints).
const CREATE_VIA_UPDATE = "__createViaUpdate";
const updateOp = (meta: Meta): Op => (meta?.[CREATE_VIA_UPDATE] ? "create" : "update");

const kyOptions: KyOptions = {
  // The session lives in an http-only cookie.
  credentials: "include",
  // @refinedev/rest sets this for its CRUD client but not for the client
  // `custom` builds from these options; without it ky throws its own
  // HTTPError before transformError can map the response to an ApiError.
  throwHttpErrors: false,
  hooks: {
    beforeRequest: [(request) => request.headers.set("language", getLocale().toUpperCase())],
    afterResponse: [
      async (request, _options, response) => {
        if (!response.ok) notifyApiError(response.status, request.url, await readJson(response));
      },
    ],
  },
};

const { dataProvider: rest, kyInstance } = createDataProvider(
  apiBase(),
  {
    getList: {
      getEndpoint: (p) => endpointOf(resolve(p.resource, "list", p)),
      buildQueryParams: async (p) =>
        toSearchParams({
          ...(argsOf(resolve(p.resource, "list", p).args).query as object),
          ...listQuery(p.pagination, p.sorters, p.filters),
        }),
      mapResponse: async (response) => {
        const data = await unwrapResponse<{ items?: unknown[] } | unknown[]>(response);
        return Array.isArray(data) ? data : (data?.items ?? []);
      },
      getTotalCount: async (response) => {
        const data = await unwrapResponse<{ count?: number } | unknown[]>(response);
        return Array.isArray(data) ? data.length : (data?.count ?? 0);
      },
    },
    getOne: {
      getEndpoint: (p) => endpointOf(resolve(p.resource, "one", p)),
      buildQueryParams: async (p) => queryOf(resolve(p.resource, "one", p)),
      mapResponse: (response) => unwrapResponse(response),
    },
    create: {
      getEndpoint: (p) => endpointOf(resolve(p.resource, "create", p)),
      buildQueryParams: async (p) => queryOf(resolve(p.resource, "create", p)),
      buildBodyParams: async (p) => (argsOf(resolve(p.resource, "create", p).args).body ?? p.variables) as object,
      mapResponse: async (response, p) => ((await unwrapResponse(response)) ?? p.variables) as object,
      transformError: async (response) => toApiError(response, await readJson(response)),
    },
    update: {
      getEndpoint: (p) => endpointOf(resolve(p.resource, updateOp(p.meta), p)),
      getRequestMethod: (p) => resolve(p.resource, updateOp(p.meta), p).ep.method as "put" | "patch",
      buildQueryParams: async (p) => queryOf(resolve(p.resource, updateOp(p.meta), p)),
      buildBodyParams: async (p) =>
        (argsOf(resolve(p.resource, updateOp(p.meta), p).args).body ?? p.variables) as object,
      mapResponse: async (response, p) =>
        ((await unwrapResponse(response)) ?? (p.id === "" ? p.variables : { id: p.id, ...p.variables })) as object,
      transformError: async (response) => toApiError(response, await readJson(response)),
    },
    deleteOne: {
      getEndpoint: (p) => endpointOf(resolve(p.resource, "remove", p)),
      buildQueryParams: async (p) => queryOf(resolve(p.resource, "remove", p)),
      mapResponse: async (response) => {
        await unwrapResponse(response);
        return undefined;
      },
      transformError: async (response) => toApiError(response, await readJson(response)),
    },
    // Non-CRUD operations (see src/lib/http.ts). meta.blob returns the body
    // as a Blob, meta.raw returns JSON that is not wrapped in an envelope.
    custom: {
      buildQueryParams: async (p) => toSearchParams(p.query),
      buildHeaders: async (p) => ({
        ...(["post", "put", "patch"].includes(p.method) ? { "Content-Type": "application/json" } : {}),
        ...(p.headers ?? {}),
      }),
      buildBodyParams: async (p) => (p.payload ?? {}) as object,
      mapResponse: async (response, p) => {
        if (p.meta?.blob) {
          if (!response.ok) throw toApiError(response, await readJson(response));
          return { blob: await response.blob() };
        }
        if (p.meta?.raw) {
          const body = await readJson(response);
          if (!response.ok) throw toApiError(response, body);
          return body as object;
        }
        return (await unwrapResponse(response)) as object;
      },
      transformError: async (response) => toApiError(response, await readJson(response)),
    },
  },
  kyOptions,
);

export const dataProvider: DataProvider = {
  ...rest,
  create: async (params) => {
    const req = resolve(params.resource, "create", params);
    if (req.ep.method === "post") return rest.create(params);
    const { data } = await rest.update({ ...params, id: "", meta: { ...params.meta, [CREATE_VIA_UPDATE]: true } });
    return { data } as never;
  },
};

/** The provider's ky instance, for multipart uploads (`custom` always sends JSON). */
export { kyInstance };

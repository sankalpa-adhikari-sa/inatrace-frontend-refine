import { keys, useCustom } from "@refinedev/core";
import { keepPreviousData, type UseMutationOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ApiDocument, ApiLogRequest } from "@/client/types.gen";
import { dataProvider, kyInstance } from "@/providers/data";
import { apiBase, readJson, toApiError, unwrapResponse } from "./api";
import { type Args, argsOf, type Endpoint, fillPath, type Payload, type RequestShape } from "./endpoint";
import { saveBlob } from "./download";
import { ep } from "./endpoints";
import { env } from "./env";

/** Arguments are optional when the endpoint takes no required path/query/body. */
type OptionalArgs<D extends RequestShape> = {} extends Args<D> ? [args?: Args<D>] : [args: Args<D>];

function customParams(e: Endpoint, args: unknown, meta?: Record<string, unknown>) {
  const { path, query, body, headers } = argsOf(args);
  return {
    url: `${apiBase()}${fillPath(e.url, path, query)}`,
    method: e.method,
    query: query as Record<string, unknown> | undefined,
    payload: body,
    headers: headers as Record<string, string> | undefined,
    meta,
  };
}

/**
 * Call a backend operation through the Refine data provider's `custom` method
 * and return the payload of its `{ status, data }` envelope.
 *
 *   const company = await call(ep.getCompany, { path: { id } });
 */
export async function call<D extends RequestShape, R>(e: Endpoint<D, R>, ...[args]: OptionalArgs<D>): Promise<Payload<R>> {
  const { data } = await dataProvider.custom!(customParams(e, args));
  return data as Payload<R>;
}

/** Like `call`, for the few endpoints whose JSON is not wrapped in an envelope. */
export async function callRaw<D extends RequestShape, R>(e: Endpoint<D, R>, ...[args]: OptionalArgs<D>): Promise<R> {
  const { data } = await dataProvider.custom!(customParams(e, args, { raw: true }));
  return data as R;
}

/** Download a file-producing endpoint (exports, PDFs) and save it. */
export async function download<D extends RequestShape, R>(e: Endpoint<D, R>, args: Args<D>, fileName: string) {
  const { data } = await dataProvider.custom!(customParams(e, args, { blob: true }));
  saveBlob((data as { blob: Blob }).blob, fileName);
}

/**
 * Upload a file to `/api/common/document` (images: `/api/common/image`). Uses the data provider's ky
 * instance directly because `custom` always sends JSON bodies.
 */
export async function uploadFile(file: File, image = false): Promise<ApiDocument> {
  // /common/image also stores the resized variants that /common/image/{key}/{size} serves;
  // /common/document with type IMAGE keeps only the original.
  return image ? postFile("api/common/image", file, { resize: "true" }) : postFile("api/common/document", file, { type: "GENERAL" });
}

/** POST a file as multipart `file` (`call` always sends JSON). `path` has no leading slash. */
export async function postFile<T>(path: string, file: File, searchParams?: Record<string, string>): Promise<T> {
  const body = new FormData();
  body.append("file", file);
  const response = await kyInstance.post(path, {
    body,
    searchParams,
    // Let the browser set the multipart boundary.
    headers: { "Content-Type": undefined },
  });
  if (!response.ok) throw toApiError(response, await readJson(response));
  return unwrapResponse<T>(response);
}

/**
 * Query a backend operation with Refine's `useCustom`. `select` receives the
 * unwrapped payload; its result is structurally shared like any TanStack
 * Query `select`.
 *
 *   const { data: company } = useApi(ep.getCompany, { path: { id } }, { enabled: id != null });
 */
export function useApi<D extends RequestShape, R, S = Payload<R>>(
  e: Endpoint<D, R>,
  args: Args<D>,
  /** `keepPrevious`: show the last result while new arguments load (e.g. a growing limit). */
  options?: { enabled?: boolean; select?: (data: Payload<R>) => S; staleTime?: number; keepPrevious?: boolean },
) {
  const params = customParams(e, args);
  const { query } = useCustom({
    url: params.url,
    method: params.method,
    config: { query: params.query, payload: params.payload, headers: params.headers },
    queryOptions: {
      enabled: options?.enabled ?? true,
      staleTime: options?.staleTime,
      placeholderData: options?.keepPrevious ? keepPreviousData : undefined,
      select: (response: { data: unknown }) =>
        (options?.select ? options.select(response.data as Payload<R>) : response.data) as never,
    },
  });
  return {
    data: query.data as S | undefined,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isSuccess: query.isSuccess,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Mark every Refine data query stale (resource lists / details and `useApi` queries): the ones on
 * screen refetch now, the rest on next use. Backend actions often change data other screens show
 * (confirming a payment changes stock orders, a processing order changes all stock), so after a
 * write we refresh everything rather than have each page guess its dependents.
 */
export function useInvalidateData() {
  const queryClient = useQueryClient();
  return useCallback(() => queryClient.invalidateQueries({ queryKey: keys().data().get() }), [queryClient]);
}

/**
 * `useMutation` for backend writes made with `call` / `postFile`: on success it invalidates all
 * data queries (see `useInvalidateData`), then runs the caller's `onSuccess`. Refresh is not
 * awaited, so navigation in `onSuccess` isn't delayed.
 */
export function useApiMutation<TData = unknown, TVariables = void, TContext = unknown>(
  options: UseMutationOptions<TData, Error, TVariables, TContext>,
) {
  const invalidateData = useInvalidateData();
  return useMutation<TData, Error, TVariables, TContext>({
    ...options,
    onSuccess: (...args) => {
      void invalidateData();
      return options.onSuccess?.(...args);
    },
  });
}

/** Fire-and-forget public analytics log (PublicController.logPublicRequest). */
export function logPublicRequest(type: ApiLogRequest["type"], logKey?: string) {
  if (!env.publicLogToken) return;
  call(ep.logPublicRequest, { body: { token: env.publicLogToken, type, logKey } }).catch(() => {});
}

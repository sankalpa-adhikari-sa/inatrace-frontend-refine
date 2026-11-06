import type { ApiDefaultResponse } from "@/client/types.gen";
import { toast } from "@/components/ui/toast";
import { env } from "@/lib/env";
import { t } from "@/lib/i18n";

export type ApiStatus = ApiDefaultResponse["status"];

/** Shape every InaTrace endpoint wraps its payload in. */
export type Envelope<T = unknown> = {
  status: ApiStatus;
  data?: T;
  errorMessage?: string;
  validationErrorDetails?: { fieldErrors?: Record<string, string> };
};

/**
 * Error thrown for failed API calls. Compatible with Refine's `HttpError`
 * (`message` + `statusCode`).
 */
export class ApiError extends Error {
  statusCode: number;
  apiStatus?: ApiStatus;
  errors?: Record<string, string>;

  constructor(message: string, statusCode: number, apiStatus?: ApiStatus, errors?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.apiStatus = apiStatus;
    this.errors = errors;
  }
}

/** Fired when the backend reports the session is no longer valid. */
export const SESSION_EXPIRED_EVENT = "inatrace:session-expired";

// Paths whose 401 is expected and must not trigger a logout or toast.
const QUIET_401 = ["/api/user/login", "/api/user/logout", "/api/user/profile"];

// Set by the auth provider between a deliberate logout and the next login. Pages still mounted
// during logout refetch without a session; those 401s aren't an expired session, so stay quiet.
let loggedOut = false;
export function setLoggedOut(value: boolean) {
  loggedOut = value;
}

export function notifyApiError(status: number, url: string, body: unknown) {
  const errorMessage = (body as Envelope | null)?.errorMessage ?? "";
  const path = url.split("?")[0];

  if (status === 401) {
    if (path.endsWith("/api/user/login")) {
      toast.add({
        type: "error",
        title: t("notifications.error"),
        description: t("notifications.wrongUsernameOrPassword"),
      });
    } else if (!loggedOut && !QUIET_401.some((p) => path.endsWith(p))) {
      window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
      toast.add({
        type: "error",
        title: t("notifications.error"),
        description: t("notifications.yourSessionHasExpired"),
      });
    }
  } else if (status === 403) {
    toast.add({
      type: "error",
      title: t("notifications.error"),
      description: t("notifications.unauthorizedAccess"),
    });
  } else if (status === 400) {
    toast.add({
      type: "error",
      title: t("notifications.communicationError"),
      description:
        errorMessage ||
        t("common.descriptions.requestCouldNotBeCompleted"),
    });
  } else {
    toast.add({
      type: "error",
      title: t("notifications.communicationError"),
      description: t("notifications.pleaseReloadThePage"),
    });
  }
}

/** Read a response body as JSON, or null when it has none. */
export async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.clone().json();
  } catch {
    return null;
  }
}

export function toApiError(response: Response, body: unknown) {
  const env = (body ?? {}) as Envelope;
  return new ApiError(
    env.errorMessage || response.statusText || "Request failed",
    response.status,
    env.status,
    env.validationErrorDetails?.fieldErrors,
  );
}

/**
 * Return the payload of a `{ status, data }` envelope, throwing `ApiError`
 * when the request failed or the backend reports a non-OK status.
 */
export async function unwrapResponse<T = unknown>(response: Response): Promise<T> {
  const body = (await readJson(response)) as Envelope<T> | null;
  if (!response.ok || !body || body.status !== "OK") throw toApiError(response, body);
  return body.data as T;
}

/** Paginated list payload (`ApiPaginatedList*`). */
export type Paginated<T> = { items?: T[]; count?: number; limit?: number; offset?: number };

/** Absolute base URL of the backend (same origin unless VITE_API_URL is set). */
export function apiBase() {
  return env.apiUrl || window.location.origin;
}

export function apiUrl(path: string) {
  return `${env.apiUrl}${path}`;
}

/** URL of a stored image, optionally resized ("SMALL", "MEDIUM", ...). */
export function imageUrl(storageKey?: string, size?: string, isPublic = false) {
  if (!storageKey) return undefined;
  const base = isPublic ? "/api/public/image" : "/api/common/image";
  return apiUrl(size ? `${base}/${storageKey}/${size}` : `${base}/${storageKey}`);
}

export function documentUrl(storageKey?: string, isPublic = false) {
  if (!storageKey) return undefined;
  return apiUrl(`${isPublic ? "/api/public/document" : "/api/common/document"}/${storageKey}`);
}

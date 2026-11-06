/**
 * An in-app path taken from the URL (`?to=`, `?returnUrl=`), or `fallback` when it would leave this app.
 * These params come from the URL, so anyone can craft them: an external URL would be an open redirect and a
 * `javascript:` URL would run script in the app (login sends it to `window.location.assign`).
 * Resolving against our origin also catches `//host`, `/\host` and whitespace tricks.
 */
export function safeRedirect(to: string | undefined | null, fallback = "/home"): string {
  if (!to || !to.startsWith("/")) return fallback;
  try {
    const url = new URL(to, window.location.origin);
    if (url.origin !== window.location.origin) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

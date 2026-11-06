import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router";

/**
 * Go back one page in history, or to `fallback` when this page was opened directly (new tab, bookmark,
 * link), where `navigate(-1)` would leave the app or do nothing. React Router gives the first history
 * entry the key "default".
 *
 * `then` runs once the navigation has landed. Going back in history is asynchronous, so anything that
 * depends on the new URL (e.g. a reload after a language change) must wait for it.
 */
export function useGoBack(fallback = "/home") {
  const navigate = useNavigate();
  const { key } = useLocation();
  return useCallback(
    (then?: () => void) => {
      if (key === "default") {
        navigate(fallback, { replace: true });
        then?.();
      } else {
        if (then) window.addEventListener("popstate", then, { once: true });
        navigate(-1);
      }
    },
    [key, navigate, fallback]
  );
}

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router";

type Patch<K extends string> = Partial<Record<K, string | number | boolean | null | undefined>>;

/**
 * List filters kept in the URL query (`?from=…&to=…`), so they survive a reload or the back button and can
 * be shared. Values are strings; "" means "not set" and removes the parameter. Updates replace the history
 * entry rather than adding one per keystroke.
 *
 * `set` builds on the URL as it is now, not as it was at render: React Router's functional update sees the
 * render's params, so two updates in the same tick (or one next to another `setSearchParams`) would
 * otherwise overwrite each other.
 */
export function useUrlFilters<K extends string>(keys: readonly K[]) {
  const [params, setParams] = useSearchParams();
  const signature = keys.map((k) => `${k}=${params.get(k) ?? ""}`).join("&");
  const values = useMemo(
    () => Object.fromEntries(keys.map((k) => [k, params.get(k) ?? ""])) as Record<K, string>,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [signature]
  );
  const set = useCallback(
    (patch: Patch<K>) =>
      setParams(
        () => {
          const p = new URLSearchParams(window.location.search);
          for (const [k, next] of Object.entries(patch)) {
            const v = next == null || next === false ? "" : String(next);
            if (v) p.set(k, v);
            else p.delete(k);
          }
          return p;
        },
        { replace: true }
      ),
    [setParams]
  );
  const keyList = keys.join(",");
  const clear = useCallback(
    () => set(Object.fromEntries(keyList.split(",").map((k) => [k, ""])) as Patch<K>),
    [set, keyList]
  );
  const active = keys.some((k) => values[k] !== "");
  return { values, set, clear, active };
}

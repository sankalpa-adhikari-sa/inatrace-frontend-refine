import { type ComponentType, lazy } from "react";

/**
 * `React.lazy` for a named export, so each page module becomes its own chunk:
 *
 *   const CompanyList = lazyPage(() => import("@/pages/companies/list"), "CompanyList");
 *
 * Several pages taken from one module share that module's chunk. Render inside a
 * `<Suspense>` (App.tsx wraps the routes; AppLayout wraps its outlet).
 */
export function lazyPage<M extends Record<K, ComponentType<any>>, K extends keyof M & string>(
  load: () => Promise<M>,
  name: K,
) {
  return lazy(() => load().then((m) => ({ default: m[name] })));
}

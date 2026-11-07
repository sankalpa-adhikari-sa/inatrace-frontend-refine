import type { FieldErrors, FieldValues } from "react-hook-form";

/** Matches a field wrapper or control that is currently invalid (`Field data-invalid`, `aria-invalid`). */
export const INVALID_SELECTOR = '[data-invalid]:not([data-invalid="false"]), [aria-invalid="true"]';

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), button:not([disabled]), [contenteditable="true"], [tabindex]:not([tabindex="-1"])';

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Smooth unless the user asked for reduced motion. */
export const scrollBehavior = (): ScrollBehavior => (prefersReducedMotion() ? "auto" : "smooth");

/** Number of leaf errors in a react-hook-form errors object (nested objects and field arrays included). */
export function countErrors(errors: FieldErrors<FieldValues> | undefined): number {
  if (!errors || typeof errors !== "object") return 0;
  // A leaf error carries a `type` ("required", "validate", …); don't descend into its `ref` element.
  if (typeof (errors as { type?: unknown }).type === "string") return 1;
  let n = 0;
  for (const value of Object.values(errors)) if (value && typeof value === "object") n += countErrors(value as FieldErrors);
  return n;
}

/** If `el` sits in an inactive tab panel (e.g. a translation tab), activates that tab. */
function revealTabPanel(el: Element) {
  let panel = el.closest<HTMLElement>('[role="tabpanel"]');
  while (panel) {
    if (panel.hidden) {
      const tabId = panel.getAttribute("aria-labelledby");
      const tab = tabId ? document.getElementById(tabId) : null;
      tab?.click();
    }
    panel = panel.parentElement?.closest<HTMLElement>('[role="tabpanel"]') ?? null;
  }
}

/**
 * Brings the first invalid field (in page order) into view and focuses it.
 * Works for any field that renders `data-invalid` / `aria-invalid`, including selects, lists and uploads
 * that don't forward a ref to react-hook-form. Returns whether an invalid field was found.
 */
export function revealFirstError(root: ParentNode = document): boolean {
  const el = root.querySelector<HTMLElement>(INVALID_SELECTOR);
  if (!el) return false;
  revealTabPanel(el);
  // Let a newly activated tab panel render before measuring.
  requestAnimationFrame(() => {
    el.scrollIntoView({ block: "center", behavior: scrollBehavior() });
    const target = el.matches(FOCUSABLE) ? el : el.querySelector<HTMLElement>(FOCUSABLE);
    target?.focus({ preventScroll: true });
  });
  return true;
}

/**
 * `handleSubmit(onValid, focusFirstError)`: after a failed submit, scroll to and focus the first invalid
 * field. Runs a frame after react-hook-form's own focus (which only knows fields that forward a ref, in
 * registration order) so the page ends on the first error the user sees.
 */
export function focusFirstError() {
  setTimeout(() => requestAnimationFrame(() => revealFirstError()));
}

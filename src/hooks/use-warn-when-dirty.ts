import { useWarnAboutChange } from "@refinedev/core";
import { useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { type Control, type FieldValues, useFormState } from "react-hook-form";

/** Whether a react-hook-form `dirtyFields` tree has any field marked dirty. */
export function anyDirty(dirtyFields: unknown): boolean {
  if (dirtyFields === true) return true;
  if (!dirtyFields || typeof dirtyFields !== "object") return false;
  return Object.values(dirtyFields).some(anyDirty);
}

/**
 * Whether the user has changed the form. Uses `dirtyFields`, not `isDirty`: Refine's `useForm` loads the
 * record with `setValue` and leaves `defaultValues` empty, so `isDirty` (all values vs. defaults) turns true
 * as soon as anything recomputes it, without any edit. `dirtyFields` only marks fields the user changed
 * (including `useFieldArray` adds / removes), and drops a field again when it's changed back.
 */
export function useHasUnsavedChanges<T extends FieldValues>(control: Control<T>) {
  const { dirtyFields } = useFormState({ control });
  return anyDirty(dirtyFields);
}

/**
 * Warns before leaving the page (in-app navigation or closing the tab) while the form has unsaved changes,
 * through Refine's `UnsavedChangesNotifier` (App.tsx).
 *
 * Refine's own `useForm` only notices edits reported as `type: "change"`, which misses `useFieldArray`
 * appends / removes; plain react-hook-form forms aren't covered at all.
 *
 * Returns `release()`: call it after a successful save, before navigating away, since the form is still
 * dirty at that point. It applies synchronously: Refine blocks navigation by patching the router's
 * `push` in an effect, so a plain state update would still be blocked by a `navigate()` in the same tick.
 */
export function useWarnWhenDirty<T extends FieldValues>(
  control: Control<T>,
  /** Unsaved state kept outside the form (e.g. a title in `useState`). */
  alsoDirty = false
) {
  const dirty = useHasUnsavedChanges(control) || alsoDirty;
  const { setWarnWhen } = useWarnAboutChange();

  useEffect(() => {
    setWarnWhen(dirty);
  }, [dirty, setWarnWhen]);

  // Don't leave the warning armed for the next page.
  useEffect(() => () => setWarnWhen(false), [setWarnWhen]);

  return useCallback(() => flushSync(() => setWarnWhen(false)), [setWarnWhen]);
}

import { type ComponentProps, useState } from "react";
import { imageUrl } from "@/lib/api";

/**
 * An image from storage at a resized `size`. If that size doesn't exist, it falls back to the original;
 * `onError` is called only when that fails too (so callers can show a placeholder).
 */
export function StoredImage({
  storageKey,
  size,
  isPublic,
  onError,
  ...props
}: Omit<ComponentProps<"img">, "src"> & { storageKey?: string; size?: string; isPublic?: boolean }) {
  const [original, setOriginal] = useState(false);
  const src = imageUrl(storageKey, original ? undefined : size, isPublic);
  if (!src) return null;
  return (
    <img
      {...props}
      src={src}
      onError={(e) => {
        if (size && !original) setOriginal(true);
        else onError?.(e);
      }}
    />
  );
}

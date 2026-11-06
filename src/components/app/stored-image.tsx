import { type ComponentProps, useState } from "react";
import { imageUrl } from "@/lib/api";


export function StoredImage({
  storageKey,
  size,
  isPublic,
  ...props
}: Omit<ComponentProps<"img">, "src"> & { storageKey?: string; size?: string; isPublic?: boolean }) {
  const [original, setOriginal] = useState(false);
  const src = imageUrl(storageKey, original ? undefined : size, isPublic);
  if (!src) return null;
  return <img {...props} src={src} onError={() => size && !original && setOriginal(true)} />;
}

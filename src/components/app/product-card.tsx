import { ArrowUpRight } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import type { ApiProductListResponse } from "@/client/types.gen";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { StoredImage } from "./stored-image";

/**
 * Photo frame. Product photos are stored pre-cropped to 2:1 (the backend's SMALL size is 640×320), so the
 * card shows them whole instead of cropping them a second time.
 */
const FRAME = "aspect-2/1";

/** Grid for product cards (Home, Products), shared so both pages lay them out alike. */
export const PRODUCT_GRID = "grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5";

/** Brand tints for products without a photo; picked from the name so a product keeps its colour. */
const TINTS = [
  "bg-primary-lighter text-primary-strong dark:bg-primary/15 dark:text-primary",
  "bg-secondary/10 text-secondary-strong dark:bg-secondary/15 dark:text-secondary",
  "bg-primary-light/50 text-primary-strong dark:bg-primary/25 dark:text-primary-light",
];

function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words.length > 1 ? words[words.length - 1][0] : (words[0]?.[1] ?? ""))).toUpperCase();
}

function tintFor(name: string) {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}

/** Stand-in for a missing or broken photo: the product's initials, so products stay distinguishable. */
function Monogram({ name }: { name: string }) {
  return (
    <div aria-hidden className={cn("flex size-full items-center justify-center", tintFor(name))}>
      <span className="font-heading text-2xl font-semibold tracking-wide opacity-80">{initials(name) || "·"}</span>
    </div>
  );
}

export function ProductCard({ product }: { product: ApiProductListResponse }) {
  const name = product.name ?? "";
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const photo = product.photoStorageId && !failed;

  return (
    <Link
      to={`/product-labels/${product.id}/product`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-xl border border-foreground/8 bg-card shadow-card outline-none",
        "transition-[transform,box-shadow,border-color] duration-200 hover:border-primary/40 hover:shadow-md",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 motion-safe:hover:-translate-y-0.5"
      )}
    >
      <div className={cn("relative overflow-hidden border-b border-foreground/8 bg-muted", FRAME)}>
        {photo ? (
          <StoredImage
            storageKey={product.photoStorageId}
            size="SMALL"
            alt=""
            loading="lazy"
            decoding="async"
            onLoad={() => setLoaded(true)}
            onError={() => setFailed(true)}
            className={cn(
              "size-full object-cover transition-[opacity,transform] duration-300 motion-safe:group-hover:scale-[1.03]",
              loaded ? "opacity-100" : "opacity-0"
            )}
          />
        ) : (
          <Monogram name={name} />
        )}
      </div>
      <div className="flex flex-1 items-start justify-between gap-2 px-3 py-2.5">
        {/* Clamped to two lines; the full name is the hover tooltip. */}
        <span className="line-clamp-2 text-sm leading-snug font-medium" title={name}>
          {name}
        </span>
        <ArrowUpRight
          aria-hidden
          className="mt-0.5 size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </div>
    </Link>
  );
}

/** Placeholder card while products load, so the grid keeps its shape. */
export function ProductCardSkeleton() {
  return (
    <div aria-hidden className="flex flex-col overflow-hidden rounded-xl border border-foreground/8 bg-card">
      <Skeleton className={cn("rounded-none", FRAME)} />
      <div className="flex flex-col gap-1.5 px-3 py-2.5">
        <Skeleton className="h-3.5 w-3/4" />
        <Skeleton className="h-3.5 w-1/3" />
      </div>
    </div>
  );
}

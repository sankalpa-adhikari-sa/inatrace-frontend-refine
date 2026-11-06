import { Package } from "lucide-react";
import { Link } from "react-router";
import type { ApiProductListResponse } from "@/client/types.gen";
import { StoredImage } from "./stored-image";

export function ProductCard({ product }: { product: ApiProductListResponse }) {
  return (
    <Link
      to={`/product-labels/${product.id}/product`}
      className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-shadow hover:shadow-md"
    > 
      <div className="flex aspect-[16/10] items-center justify-center bg-muted">
        {product.photoStorageId ? (
          <StoredImage storageKey={product.photoStorageId} size="SMALL" alt="" className="size-full object-cover" />
        ) : (
          <Package className="size-8 text-muted-foreground/50" />
        )}
      </div>
      <div className="p-2 text-xs font-medium group-hover:underline">{product.name}</div>
    </Link>
  );
}

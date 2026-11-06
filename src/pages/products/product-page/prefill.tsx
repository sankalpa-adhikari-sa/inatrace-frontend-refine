import { useTranslate } from "@refinedev/core";
import { useState } from "react";
import type { ApiProduct } from "@/client/types.gen";
import { SimpleSelect } from "@/components/app/controls";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ep } from "@/lib/endpoints";
import { call, useApi } from "@/lib/http";

/** PrefillProductSelectionModalComponent: pick one of your products, then copy from it. */
export function PrefillProductDialog({
  excludeId,
  onClose,
  onSelect,
}: {
  excludeId?: number;
  onClose: () => void;
  onSelect: (product: ApiProduct) => void;
}) {
  const translate = useTranslate();
  const [productId, setProductId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const { data: products = [] } = useApi(
    ep.listProducts,
    { query: { requestType: "FETCH", limit: 1000, sortBy: "name", sort: "ASC" } },
    { select: (r) => r?.items ?? [] }
  );
  async function confirm() {
    if (productId == null) return;
    setLoading(true);
    try {
      const product = await call(ep.getProduct, { path: { id: productId } });
      if (product) onSelect(product);
    } finally {
      setLoading(false);
    }
  }
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{translate("products.productPage.titles.products")}</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>
            {translate("products.productPage.fields.selectAProduct")}
          </FieldLabel>
          <SimpleSelect
            options={products.filter((p) => p.id !== excludeId).map((p) => ({ value: p.id!, label: p.name ?? "" }))}
            value={productId}
            onChange={setProductId}
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
          <Button disabled={productId == null || loading} onClick={confirm}>
            {loading && <Spinner />}
            {translate("buttons.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

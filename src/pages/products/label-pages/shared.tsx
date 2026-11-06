import { useTranslate } from "@refinedev/core";
import { ArrowLeft } from "lucide-react";
import { type ReactNode } from "react";
import { Link, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { ep } from "@/lib/endpoints";
import { useApi } from "@/lib/http";
import { ProductTabs } from "../tabs";

export function useLabelParams() {
  const params = useParams();
  return { productId: Number(params.id), labelId: Number(params.labelId), batchId: params.batchId };
}

/** Product tabs plus a "label › page" heading that links back to the label editor. */
export function LabelPageHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  const translate = useTranslate();
  const { productId, labelId } = useLabelParams();
  const { data: label } = useApi(ep.getProductLabel, { path: { id: labelId } });
  return (
    <>
      <ProductTabs productId={productId} />
      
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={translate("products.labelPages.buttons.backToLabel")}
            nativeButton={false}
            render={<Link to={`/product-labels/${productId}?label=${labelId}`} />}
          >
            <ArrowLeft />
          </Button>
          <h2 className="text-base font-semibold">
            <span className="text-muted-foreground">
              {label?.title || translate("common.fields.label")} ›{" "}
            </span>
            {title}
          </h2>
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </>
  );
}

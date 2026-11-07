import { useTranslate } from "@refinedev/core";
import { type ReactNode } from "react";
import { useParams } from "react-router";
import type { Crumb } from "@/components/app/page";
import { ep } from "@/lib/endpoints";
import { useApi } from "@/lib/http";
import { ProductTabs } from "../tabs";

export function useLabelParams() {
  const params = useParams();
  return { productId: Number(params.id), labelId: Number(params.labelId), batchId: params.batchId };
}

/** Product header and tabs for a page of one label (batches, feedback, statistics), with the label in the trail. */
export function LabelPageHeader({ title, actions, crumbs = [] }: { title: ReactNode; actions?: ReactNode; crumbs?: Crumb[] }) {
  const translate = useTranslate();
  const { productId, labelId } = useLabelParams();
  const { data: label } = useApi(ep.getProductLabel, { path: { id: labelId } });
  return (
    <ProductTabs
      productId={productId}
      title={title}
      actions={actions}
      crumbs={[
        { label: label?.title || translate("common.fields.label"), to: `/product-labels/${productId}?label=${labelId}` },
        ...crumbs,
      ]}
    />
  );
}

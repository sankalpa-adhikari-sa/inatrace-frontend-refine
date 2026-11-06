import { useNotification, useTranslate } from "@refinedev/core";
import type { ReactNode } from "react";
import { useNavigate } from "react-router";
import { useConfirm } from "@/components/app/confirm";
import { PageHeader, PageTabs } from "@/components/app/page";
import { Button } from "@/components/ui/button";
import { useIdentity } from "@/hooks/use-session";
import { call, useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";

/** Header + navigation of one product (ProductLabelLeftPanelContentComponent). */
export function ProductTabs({
  productId,
  title,
  actions,
}: {
  productId: number;
  title?: ReactNode;
  actions?: ReactNode;
}) {
  const translate = useTranslate();
  const { user } = useIdentity();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { open: notify } = useNotification();
  const { data: product } = useApi(ep.getProduct, { path: { id: productId } }, { select: (r) => r });

  const base = `/product-labels/${productId}`;

  async function archive() {
    const ok = await confirm({
      description: translate("products.descriptions.areYouSureYouWantToDeleteThe"),
      destructive: true,
      confirmLabel: translate("products.buttons.deleteProduct"),
    });
    if (!ok) return;
    await call(ep.deleteProduct, { path: { id: productId } });
    notify?.({
      type: "success",
      message: translate("products.notifications.deleted"),
      description: translate("products.notifications.productWasSuccessfullyDeleted"),
    });
    navigate("/product-labels");
  }

  return (
    <>
      <PageHeader
        title={title ?? product?.name ?? translate("products.titles.product")}
        description={product?.valueChain?.name}
        back="/product-labels"
        actions={
          <>
            {actions}
            {user?.role === "SYSTEM_ADMIN" && (
              <Button variant="destructive" size="sm" onClick={archive}>
                {translate("products.buttons.archiveProduct")}
              </Button>
            )}
          </>
        }
      />
      <PageTabs
        tabs={[
          {
            label: translate("products.fields.productSettings"),
            to: `${base}/product`,
            exact: true,
          },
          { label: translate("products.fields.qrLabels"), to: base, exact: true },
          { label: translate("products.fields.knowledgeBlog"), to: `${base}/knowledge-blog` },
          { label: translate("products.fields.stakeholders"), to: `${base}/stakeholders` },
          { label: translate("products.fields.finalProducts"), to: `${base}/final-products` },
        ]}
      />
    </>
  );
}

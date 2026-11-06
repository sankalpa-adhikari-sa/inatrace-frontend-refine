import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import type { ApiFinalProduct, ApiProductLabelBase } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { env } from "@/lib/env";
import { SimpleSelect } from "./controls";
import { useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { useTranslate } from "@refinedev/core";

/** QR code of a stock order for one of its final product's labels (GenerateQRCodeModalComponent). */
export function QrCodeDialog({
  qrCodeTag,
  finalProduct,
  onClose,
}: {
  qrCodeTag: string;
  finalProduct?: ApiFinalProduct;
  onClose: () => void;
}) {
  const translate = useTranslate();
  const productId = finalProduct?.product?.id;
  const { data: labels = [] } = useApi(
    ep.getFinalProductLabels,
    { path: { productId: productId ?? 0, finalProductId: finalProduct?.id ?? 0 } },
    { enabled: productId != null && finalProduct?.id != null, select: (r) => (r ?? []) as ApiProductLabelBase[] }
  );
  const [labelId, setLabelId] = useState<number | null>(null);
  useEffect(() => {
    if (labels.length === 1) setLabelId(labels[0].id ?? null);
  }, [labels]);

  const label = labels.find((l) => l.id === labelId);
  const url = label
    ? `${env.appBaseUrl}/${label.language?.toLowerCase()}/${env.qrCodeBasePath}/${label.uuid}/${qrCodeTag}`
    : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{translate("common.titles.orderItemQrCode")}</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>{translate("common.fields.finalProduct")}</FieldLabel>
          <Input disabled value={finalProduct ? `${finalProduct.name} (${finalProduct.product?.name ?? ""})` : ""} />
        </Field>
        <Field>
          <FieldLabel>
            {translate("common.fields.finalProductLabel")}
          </FieldLabel>
          <SimpleSelect
            options={labels.map((l) => ({ value: l.id!, label: l.title ?? String(l.id) }))}
            value={labelId}
            onChange={setLabelId}
          />
        </Field>
        {url ? (
          <div className="flex flex-col items-center gap-2">
            <QRCodeSVG value={url} size={200} className="rounded bg-white p-2" />
            <button
              type="button"
              className="text-center text-xs break-all text-muted-foreground hover:text-foreground"
              title={translate("common.titles.copyToClipboard")}
              onClick={() => navigator.clipboard?.writeText(url)}
            >
              {url}
            </button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            {translate("common.fields.pleaseSelectAFinalProduct")}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

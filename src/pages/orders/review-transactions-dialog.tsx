import { useTranslate } from "@refinedev/core";
import { useState } from "react";
import type { ApiStockOrder, ApiTransaction } from "@/client/types.gen";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { fmt } from "../stock/shared";
import { call, useApi, useApiMutation } from "@/lib/http";
import { ep } from "@/lib/endpoints";

/** ApproveRejectTransactionModalComponent. */
export function ReviewTransactionsDialog({
  order,
  onClose,
  onDone,
}: {
  order: ApiStockOrder;
  onClose: () => void;
  onDone: () => void;
}) {
  const translate = useTranslate();
  const { data: txs = [], isLoading } = useApi(
    ep.getStockOrderInputTransactions,
    { path: { stockOrderId: order.id! } },
    { select: (r) => (r?.items ?? []).filter((t) => t.status === "PENDING") }
  );
  const [rejections, setRejections] = useState<Record<number, string | null>>({});

  const save = useApiMutation({
    mutationFn: async () => {
      for (const t of txs) {
        const comment = rejections[t.id!];
        if (comment)
          await call(ep.rejectTransaction, { path: { id: t.id! }, body: { id: t.id, rejectComment: comment } });
        else await call(ep.approveTransaction, { path: { id: t.id! } });
      }
    },
    onSuccess: onDone,
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{translate("orders.titles.approveRejectTransaction")}</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Spinner />
        ) : txs.length === 0 ? (
          <p className="text-xs text-muted-foreground">{translate("orders.texts.noPendingTransactions")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {txs.map((t: ApiTransaction) => {
              const rejected = rejections[t.id!] != null;
              return (
                <li key={t.id} className="flex flex-col gap-2 rounded-md bg-muted/50 p-2 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span>
                      {t.sourceStockOrder?.internalLotNumber ?? t.sourceStockOrder?.identifier} · {fmt(t.inputQuantity)}{" "}
                      {t.inputMeasureUnitType?.label}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant={rejected ? "outline" : "default"}
                        onClick={() => setRejections({ ...rejections, [t.id!]: null })}
                      >
                        {translate("orders.buttons.approve")}
                      </Button>
                      <Button
                        size="sm"
                        variant={rejected ? "destructive" : "outline"}
                        onClick={() => setRejections({ ...rejections, [t.id!]: rejections[t.id!] ?? "" })}
                      >
                        {translate("orders.buttons.reject")}
                      </Button>
                    </div>
                  </div>
                  {rejected && (
                    <Input
                      placeholder={translate("orders.placeholders.comment")}
                      value={rejections[t.id!] ?? ""}
                      onChange={(e) => setRejections({ ...rejections, [t.id!]: e.target.value })}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
          <Button
            disabled={save.isPending || txs.length === 0 || txs.some((t) => rejections[t.id!] === "")}
            onClick={() => save.mutate()}
          >
            {translate("buttons.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

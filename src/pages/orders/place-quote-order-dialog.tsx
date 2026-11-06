import { useTranslate } from "@refinedev/core";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { ApiFacility, ApiProcessingAction } from "@/client/types.gen";
import { SimpleSelect } from "@/components/app/controls";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";

/** Quote order processing actions that can be started at a facility. */
function quoteActionsFor(actions: ApiProcessingAction[], facility?: ApiFacility) {
  if (!facility) return [];
  return actions.filter(
    (a) =>
      a.type === "SHIPMENT" &&
      (!a.supportedFacilities?.length || a.supportedFacilities.some((s) => s.id === facility.id)) &&
      (facility.facilitySemiProductList?.some((s) => s.id === a.inputSemiProduct?.id) ||
        facility.facilityFinalProducts?.some((p) => p.id === a.inputFinalProduct?.id))
  );
}

/** PlaceQuoteOrderModalComponent: pick facility and order template, then open the quote form. */
export function PlaceQuoteOrderDialog({
  facilities,
  companyId,
  onClose,
}: {
  facilities: ApiFacility[];
  companyId: number;
  onClose: () => void;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const [facilityId, setFacilityId] = useState<number | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);
  const { data: actions = [] } = useApi(
    ep.listProcessingActionsByCompany,
    { path: { id: companyId }, query: { requestType: "FETCH", limit: 1000 } },
    { select: (r) => r?.items ?? [] }
  );
  const options = quoteActionsFor(
    actions,
    facilities.find((f) => f.id === facilityId)
  );

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{translate("orders.titles.placeQuoteOrder")}</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>
            {translate("common.fields.facility")}
          </FieldLabel>
          <SimpleSelect
            options={facilities.map((f) => ({ value: f.id!, label: f.name ?? "" }))}
            value={facilityId}
            onChange={(id) => {
              setFacilityId(id);
              setActionId(null);
            }}
            placeholder={translate("orders.placeholders.selectFacility")}
          />
        </Field>
        <Field>
          <FieldLabel>{translate("orders.fields.orderTemplate")}</FieldLabel>
          <SimpleSelect
            options={options.map((a) => ({ value: a.id!, label: a.name ?? "" }))}
            value={actionId}
            onChange={setActionId}
            disabled={facilityId == null}
            placeholder={
              facilityId != null && options.length === 0
                ? translate("orders.placeholders.noQuoteActionsForThis")
                : translate("orders.placeholders.selectOrderTemplate")
            }
          />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
          <Button
            disabled={facilityId == null || actionId == null}
            onClick={() => navigate(`/my-stock/processing/${actionId}/facility/${facilityId}/new`)}
          >
            {translate("buttons.continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

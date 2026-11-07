import { useOne, useTranslate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { Check } from "lucide-react";
import { useState } from "react";
import { useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import type { ApiProductLabelBatch } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { CheckboxField, DateField, TextField } from "@/components/app/form-fields";
import { LocationPinsField } from "@/components/app/location-pins-field";
import { FormActions, PageLoader, Section } from "@/components/app/page";
import { IMAGE_TYPES, UploadField } from "@/components/app/upload-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ep } from "@/lib/endpoints";
import { call } from "@/lib/http";
import { focusFirstError } from "@/lib/form-errors";
import { LabelPageHeader, useLabelParams } from "./shared";

/** `.../batches/new` and `.../batches/:batchId` (BatchDetailPageComponent) */
export function BatchForm() {
  const translate = useTranslate();
  const { productId, labelId, batchId } = useLabelParams();
  const isNew = batchId == null;
  const navigate = useNavigate();
  const back = () => navigate(`/product-labels/${productId}/labels/${labelId}/batches`);

  const { query } = useOne<ApiProductLabelBatch>({
    resource: "label-batches",
    id: batchId,
    queryOptions: { enabled: !isNew },
  });
  const {
    control,
    handleSubmit,
    getValues,
    setValue,
    refineCore: { onFinish, formLoading },
  } = useForm<ApiProductLabelBatch>({
    values: query.data?.data,
    defaultValues: { locations: [], checkAuthenticity: false, traceOrigin: false },
    refineCoreProps: {
      resource: "label-batches",
      action: isNew ? "create" : "edit",
      id: batchId,
      queryOptions: { enabled: false },
      redirect: false,
      onMutationSuccess: back,
    },
  });
  const checkAuthenticity = useWatch({ control, name: "checkAuthenticity" });
  const traceOrigin = useWatch({ control, name: "traceOrigin" });
  const [prefilling, setPrefilling] = useState(false);
  const confirm = useConfirm();

  async function prefill() {
    const ok = await confirm({
      title: translate("products.labelPages.titles.prefillLocationsFromProduct"),
      description: translate("products.labelPages.descriptions.thisActionWillReplaceAll"),
    });
    if (!ok) return;
    setPrefilling(true);
    try {
      const product = await call(ep.getProduct, { path: { id: productId } });
      setValue("locations", product?.origin?.locations ?? [], { shouldDirty: true });
    } finally {
      setPrefilling(false);
    }
  }

  if (!isNew && query.isLoading) return <PageLoader />;


  const atLeastOneDate = () =>
    !getValues("checkAuthenticity") ||
    !!getValues("productionDate") ||
    !!getValues("expiryDate") ||
    translate("products.labelPages.errors.atLeastOneOfThe");

  return (
    <>
      <LabelPageHeader
        crumbs={[{ label: translate("products.productPage.buttons.batches"), to: `/product-labels/${productId}/labels/${labelId}/batches` }]}
        title={
          isNew ? translate("products.labelPages.titles.addBatch") : translate("products.labelPages.titles.editBatch")
        }
      />
      <form onSubmit={handleSubmit((v) => onFinish(isNew ? { ...v, labelId } : v), focusFirstError)} className="flex flex-col gap-6">
        <Section>
          <FieldGroup>
            <TextField
              control={control}
              name="number"
              label={translate("products.labelPages.fields.batchNumber")}
              placeholder={translate("products.labelPages.placeholders.enterBatchNumber")}
              rules={{ required: translate("products.labelPages.errors.batchNumberIsRequired") }}
              className="max-w-md"
            />
            <CheckboxField
              control={control}
              name="checkAuthenticity"
              label={translate("products.labelPages.fields.checkAuthenticity")}
            />
            {checkAuthenticity && (
              <div className="grid gap-4 sm:grid-cols-2">
                <DateField
                  control={control}
                  name="productionDate"
                  label={translate("products.labelPages.fields.productionDate")}
                  rules={{ validate: atLeastOneDate }}
                />
                <DateField
                  control={control}
                  name="expiryDate"
                  label={translate("products.labelPages.fields.expiryDate")}
                  rules={{
                    validate: {
                      atLeastOneDate,
                      endBeforeStart: (v) => {
                        const pd = getValues("productionDate");
                        return !v || !pd || v >= pd || translate("products.labelPages.errors.expiryDateMustBeLater");
                      },
                    },
                  }}
                />
                <UploadField
                  control={control}
                  name="photo"
                  label={translate("products.labelPages.fields.instructionsImage")}
                  description={translate("products.labelPages.descriptions.pleaseUploadAnImageThat")}
                  image
                  accept={IMAGE_TYPES}
                  className="sm:col-span-2"
                />
              </div>
            )}
            <CheckboxField
              control={control}
              name="traceOrigin"
              label={translate("products.labelPages.fields.traceOrigin")}
            />
            {traceOrigin && (
              <LocationPinsField
                control={control}
                name="locations"
                required={translate("products.labelPages.errors.atLeastOneLocationIs")}
                actions={
                  <Button type="button" variant="outline" size="sm" disabled={prefilling} onClick={prefill}>
                    {prefilling && <Spinner />}
                    {translate("products.labelPages.buttons.prefillLocationsFromProduct")}
                  </Button>
                }
              />
            )}
          </FieldGroup>
        </Section>
        <FormActions>
          <Button type="button" variant="outline" onClick={back}>
            {translate("buttons.cancel")}
          </Button>
          <Button type="submit" disabled={formLoading}>
            {formLoading && <Spinner />}
            {isNew
              ? translate("buttons.create")
              : translate("buttons.save")}
          </Button>
        </FormActions>
      </form>
    </>
  );
}

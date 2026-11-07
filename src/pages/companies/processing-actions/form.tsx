import { useOne, useTranslate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import type { ApiProcessingAction, ApiValueChain } from "@/client/types.gen";
import { CheckboxField, EntityListField, EntitySelectField, SelectField, TextField, TextareaField } from "@/components/app/form-fields";
import { FormActions, Section } from "@/components/app/page";
import { FormSkeleton } from "@/components/app/states";
import { useWarnWhenDirty } from "@/hooks/use-warn-when-dirty";
import { FormLayout } from "@/components/app/form-layout";
import { TranslationTabs } from "@/components/app/translation-tabs";
import { completeOnboarding } from "@/stores/onboarding";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { CompanyTabs } from "../company-tabs";
import { useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { t } from "@/lib/i18n";
import { focusFirstError } from "@/lib/form-errors";
import { ACTION_TYPES, LANGUAGES } from "./action-types";
import { EvidenceList } from "./evidence-list";
import { type FormValues, toForm } from "./model";
import { OutputSemiProducts } from "./output-semi-products";

/** `/companies/:id/processingActions/new` and `.../:paId/edit` */
export function ProcessingActionForm() {
  const translate = useTranslate();
  const { id, paId } = useParams();
  const companyId = Number(id);
  const isNew = paId == null;
  const navigate = useNavigate();
  const back = () => navigate(`/companies/${companyId}/processingActions`);

  const { query } = useOne<ApiProcessingAction>({
    resource: "processing-actions",
    id: paId,
    queryOptions: { enabled: !isNew },
  });
  const existing = query.data?.data;

  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading },
  } = useForm<ApiProcessingAction, any, FormValues>({
    values: existing ? toForm(existing) : undefined,
    defaultValues: toForm({}),
    refineCoreProps: {
      resource: "processing-actions",
      action: isNew ? "create" : "edit",
      id: paId,
      queryOptions: { enabled: false },
      redirect: false,
      onMutationSuccess: () => (completeOnboarding("processingAction") ? navigate("/home") : back()),
    },
  });

  const type = useWatch({ control, name: "type" });
  const finalProductAction = useWatch({ control, name: "finalProductAction" });
  const chains = (useWatch({ control, name: "valueChains" }) as ApiValueChain[] | undefined) ?? [];
  const valueChainIds = chains.map((c) => c.id!).filter(Boolean);
  const byChains = { query: { valueChainIds, requestType: "FETCH" as const, limit: 1000 } };
  const hasChains = valueChainIds.length > 0;

  const { data: companyChains = [] } = useApi(
    ep.getCompanyValueChains,
    { path: { id: companyId } },
    { select: (r) => r?.items ?? [] }
  );
  const { data: finalProducts = [] } = useApi(
    ep.getFinalProductsForCompany,
    { path: { companyId }, query: { requestType: "FETCH", limit: 1000 } },
    { select: (r) => r?.items ?? [] }
  );
  const { data: facilities = [] } = useApi(
    ep.listFacilitiesByCompany,
    { path: { id: companyId }, query: { requestType: "FETCH", limit: 1000 } },
    { select: (r) => r?.items ?? [] }
  );
  const { data: semiProducts = [] } = useApi(ep.getSemiProductListByValueChains, byChains, {
    enabled: hasChains,
    select: (r) => r?.items ?? [],
  });
  const { data: evidenceFields = [] } = useApi(ep.listProcessingEvidenceFieldsByValueChains, byChains, {
    enabled: hasChains,
    select: (r) => r?.items ?? [],
  });
  const { data: evidenceDocs = [] } = useApi(ep.listProcessingEvidenceTypesByValueChains, byChains, {
    enabled: hasChains,
    select: (r) => (r?.items ?? []).filter((t) => t.type === "DOCUMENT"),
  });

  useWarnWhenDirty(control);

  if (!isNew && query.isLoading) return <FormSkeleton sections={4} />;

  function submit(v: FormValues) {
    const english = v.translations.find((t) => t.language === "EN");
    onFinish({
      ...v,
      name: english?.name,
      description: english?.description,
      company: v.company?.id ? v.company : { id: companyId },
    });
  }

  const isProcessing = type === "PROCESSING";
  const isFinalProcessing = type === "FINAL_PROCESSING";
  const isMove = type === "SHIPMENT" || type === "TRANSFER";
  const productLabel = (f: { name?: string; product?: { name?: string } }) =>
    `${f.name}${f.product?.name ? ` (${f.product.name})` : ""}`;

  return (
    <>
      <CompanyTabs
        companyId={companyId}
        crumbs={[{ label: translate("companies.fields.processingActions"), to: `/companies/${companyId}/processingActions` }]}
        title={
          isNew
            ? translate("companies.processingActions.titles.newProcessingAction")
            : translate("companies.processingActions.titles.editProcessingAction", { name: existing?.name ?? "" })
        }
      />
      <form onSubmit={handleSubmit((v) => submit(v as FormValues), focusFirstError)}>
        <FormLayout control={control}>
          <Section id="basic" title={translate("common.titles.basicInformation")}>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <EntityListField
                control={control}
                name="valueChains"
                label={translate("companies.processingActions.fields.valueChains")}
                required
                items={companyChains}
                getLabel={(v) => v.name ?? ""}
                rules={{ validate: (v) => (Array.isArray(v) && v.length > 0) || translate("companies.processingActions.errors.atLeastOneValueChain") }}
                className="sm:col-span-2"
              />
              <SelectField
                control={control}
                name="type"
                label={translate("companies.processingActions.fields.actionType")}
                options={ACTION_TYPES}
                rules={{ required: translate("companies.processingActions.errors.actionTypeIsRequired") }}
              />
              {isMove && (
                <CheckboxField control={control} name="finalProductAction" label={translate("companies.processingActions.fields.finalProductAction")} />
              )}

              {(isMove || type === "GENERATE_QR_CODE") && !finalProductAction && (
                <EntitySelectField
                  control={control}
                  name="inputSemiProduct"
                  label={translate("companies.processingActions.fields.selectSemiProduct")}
                  items={semiProducts}
                  getLabel={(s) => s.name ?? ""}
                  rules={{
                    required: translate("companies.processingActions.errors.semiProductIsRequired"),
                  }}
                />
              )}
              {type === "GENERATE_QR_CODE" && (
                <EntitySelectField
                  control={control}
                  name="qrCodeForFinalProduct"
                  label={translate("companies.processingActions.fields.qrCodeForFinalProduct")}
                  items={finalProducts}
                  getLabel={productLabel}
                  rules={{
                    required: translate("companies.processingActions.errors.finalProductIsRequired"),
                  }}
                />
              )}
              {isMove && finalProductAction && (
                <EntitySelectField
                  control={control}
                  name="inputFinalProduct"
                  label={translate("companies.processingActions.fields.selectFinalProduct")}
                  items={finalProducts}
                  getLabel={productLabel}
                  rules={{
                    required: translate("companies.processingActions.errors.finalProductIsRequired"),
                  }}
                />
              )}
              {(isProcessing || isFinalProcessing) && (
                <EntitySelectField
                  control={control}
                  name="inputSemiProduct"
                  label={translate("companies.processingActions.fields.selectInputSemiProduct")}
                  items={semiProducts}
                  getLabel={(s) => s.name ?? ""}
                  rules={{
                    required: translate("companies.processingActions.errors.inputSemiProductIsRequired"),
                  }}
                />
              )}
              {isFinalProcessing && (
                <>
                  <EntitySelectField
                    control={control}
                    name="outputFinalProduct"
                    label={translate("companies.processingActions.fields.selectOutputFinalProduct")}
                    items={finalProducts}
                    getLabel={productLabel}
                    rules={{
                      required: translate("companies.processingActions.errors.outputFinalProductIsRequired"),
                    }}
                  />
                  <CheckboxField
                    control={control}
                    name="repackedOutputFinalProducts"
                    label={translate("companies.processingActions.fields.repackedOutputs")}
                  />
                  <TextField
                    control={control}
                    name="maxOutputWeight"
                    type="number"
                    label={translate("companies.processingActions.fields.maxOutputWeight")}
                  />
                </>
              )}
              {isProcessing && (
                <TextField
                  control={control}
                  name="estimatedOutputQuantityPerUnit"
                  type="number"
                  label={translate("companies.processingActions.fields.estimatedOutputQuantityPerUnit")}
                />
              )}
              <TextField
                control={control}
                name="prefix"
                label={translate("companies.processingActions.fields.internalLotNamePrefix")}
                placeholder={translate("companies.processingActions.placeholders.enterPrefix")}
                rules={{ required: translate("companies.processingActions.errors.internalLotNamePrefixIs") }}
              />
              <TextField control={control} name="sortOrder" type="number" label={translate("companies.processingActions.fields.sortOrder")} />
            </FieldGroup>
            {isProcessing && <OutputSemiProducts control={control} items={semiProducts} disabled={!hasChains} />}
          </Section>

          <Section
            id="facilities"
            title={translate("companies.processingActions.titles.facilitiesWhereThisProcessStarts")}
          >
            <EntityListField
              control={control}
              name="supportedFacilities"
              items={facilities}
              getLabel={(f) => f.name ?? ""}
            />
          </Section>

          <Section id="translations" title={translate("companies.processingActions.titles.translations")}>
            <TranslationTabs languages={LANGUAGES}>
              {(l, i) => (
                <>
                  <TextField
                    control={control}
                    name={`translations.${i}.name`}
                    label={translate("companies.processingActions.fields.nameOfProcess")}
                    rules={l === "EN" ? { required: translate("companies.processingActions.errors.nameOfProcessInEnglish") } : undefined}
                  />
                  <TextareaField
                    control={control}
                    name={`translations.${i}.description`}
                    label={translate("common.fields.description")}
                  />
                </>
              )}
            </TranslationTabs>
            <TextField
              control={control}
              name="publicTimelineLabel"
              label={translate("companies.processingActions.fields.publicTimelineLabel")}
            />
          </Section>

          <div className="grid gap-6 @3xl:grid-cols-2">
            <Section
              id="evidence-fields"
              title={translate("common.titles.processingEvidenceFields")}
              description={translate("companies.processingActions.descriptions.mandatoryRequiredOnQuote")}
            >
              <EvidenceList
                control={control}
                name="requiredEvidenceFields"
                items={evidenceFields}
                disabled={!hasChains}
              />
            </Section>
            <Section
              id="evidence-documents"
              title={translate("companies.processingActions.titles.processingEvidenceDocuments")}
              description={translate("companies.processingActions.descriptions.mandatoryRequiredOnQuoteRequired")}
            >
              <EvidenceList
                control={control}
                name="requiredDocumentTypes"
                items={evidenceDocs}
                disabled={!hasChains}
                withGroup
              />
            </Section>
          </div>

          <FormActions sticky control={control}>
            <Button type="button" variant="outline" disabled={formLoading} onClick={back}>
              {translate("buttons.cancel")}
            </Button>
            <Button type="submit" disabled={formLoading} data-onboarding="processing-action-save">
              {formLoading && <Spinner />}
              {translate("buttons.save")}
            </Button>
          </FormActions>
        </FormLayout>
      </form>
    </>
  );
}

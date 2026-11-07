import { useNotification, useTranslate } from "@refinedev/core";
import { type ReactNode, useState } from "react";
import { useForm } from "react-hook-form";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import type { ApiProduct, ApiProductLabel, ApiProductLabelContent } from "@/client/types.gen";
import { FormLayout } from "@/components/app/form-layout";
import { FormActions, PageHeader, PageLoader, Section } from "@/components/app/page";
import { FormSkeleton } from "@/components/app/states";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useWarnWhenDirty } from "@/hooks/use-warn-when-dirty";
import { ep } from "@/lib/endpoints";
import { focusFirstError } from "@/lib/form-errors";
import { call, useApi, useApiMutation } from "@/lib/http";
import { completeOnboarding } from "@/stores/onboarding";
import { ProductTabs } from "../tabs";
import { type FormValues, DEFAULT_B2C, labelFields, toForm, productBody, LabelMode, useIsOwner } from "./model";
import { ProductSections, prefillFrom } from "./sections";
import { MediaSection } from "./media";
import { LabelBar } from "./labels";

/**
 * `/product-labels/new/:companyId/:valueChainId`, `/product-labels/:id/product`
 * (product settings) and `/product-labels/:id` (QR labels).
 */
export function ProductPage({ mode }: { mode: "create" | "product" | "labels" }) {
  const params = useParams();
  const productId = params.id ? Number(params.id) : undefined;
  const { data: product, isLoading } = useApi(
    ep.getProduct,
    { path: { id: productId ?? 0 } },
    { enabled: productId != null }
  );
  const { data: company, isLoading: companyLoading } = useApi(
    ep.getCompany,
    { path: { id: Number(params.companyId) } },
    { enabled: mode === "create" }
  );
  const { data: valueChain, isLoading: vcLoading } = useApi(
    ep.getValueChain,
    { path: { id: Number(params.valueChainId) } },
    { enabled: mode === "create" }
  );

  if (mode === "create") {
    if (companyLoading || vcLoading) return <PageLoader />;
    if (!company || !valueChain) return <Navigate to="/product-labels" replace />;
    return (
      <ProductEditor
        mode="create"
        initial={toForm({
          name: "",
          company,
          valueChain,
          settings: { language: "EN" },
          businessToCustomerSettings: DEFAULT_B2C,
        })}
      />
    );
  }

  if (isLoading || !product) return <FormSkeleton sections={4} />;
  return mode === "labels" ? (
    <LabelsMode product={product} />
  ) : (
    <ProductEditor key={product.id} mode="product" product={product} initial={toForm(product)} />
  );
}

/** `/product-labels/:id/labels/:labelId` → QR labels with that label selected (LabelRedirectToProductPageComponent). */
export function LabelRedirect() {
  const { id, labelId } = useParams();
  return <Navigate to={`/product-labels/${id}?label=${labelId}`} replace />;
}

function LabelsMode({ product }: { product: ApiProduct }) {
  const [params, setParams] = useSearchParams();
  const {
    data: labels = [],
    refetch: refetchLabels,
    isLoading,
  } = useApi(ep.getProductLabels, { path: { id: product.id! } });
  const requested = Number(params.get("label"));
  const labelId = labels.find((l) => l.id === requested)?.id ?? labels[0]?.id;
  const select = (id: number) => setParams({ label: String(id) }, { replace: true });

  const { data: label, refetch: refetchLabel } = useApi(
    ep.getProductLabel,
    { path: { id: labelId ?? 0 } },
    { enabled: labelId != null }
  );
  const { data: content } = useApi(
    ep.getProductLabelContent,
    { path: { id: labelId ?? 0 } },
    { enabled: labelId != null }
  );
  const { data: docs } = useApi(
    ep.getCompanyDocumentsForProductLabel,
    { path: { id: labelId ?? 0 } },
    { enabled: labelId != null }
  );

  if (isLoading) return <PageLoader />;
  if (labels.length === 0 || labelId == null) {
    return (
      <>
        <ProductTabs productId={product.id!} />
        <LabelBar product={product} labels={labels} onCreated={async (id) => (await refetchLabels(), select(id))} />
      </>
    );
  }
  if (!label || !content || !docs) return <PageLoader />;

  return (
    <ProductEditor
      key={label.id}
      mode="labels"
      product={product}
      label={label}
      initial={toForm(content, label.fields, docs)}
      onSaved={async () => (await refetchLabels(), refetchLabel())}
      header={(dirty) => (
        <LabelBar
          dirty={dirty}
          product={product}
          labels={labels}
          current={label}
          onSelect={select}
          onCreated={async (id) => (await refetchLabels(), select(id))}
          onChanged={async () => (await refetchLabels(), refetchLabel())}
          onDeleted={async () => {
            await refetchLabels();
            setParams({}, { replace: true });
          }}
        />
      )}
    />
  );
}

function ProductEditor({
  mode,
  product,
  label,
  initial,
  header,
  onSaved,
}: {
  mode: "create" | "product" | "labels";
  product?: ApiProduct;
  label?: ApiProductLabel;
  initial: FormValues;
  /** Rendered above the form; gets whether the form has unsaved changes. */
  header?: ReactNode | ((dirty: boolean) => ReactNode);
  /** Called after a successful save (label mode refetches the label so its title is current). */
  onSaved?: () => void;
}) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  const isOwner = useIsOwner(product);
  const canEdit = mode === "create" || isOwner;

  const { control, handleSubmit, reset, formState, setValue } = useForm<FormValues>({
    defaultValues: initial,
    disabled: !canEdit,
  });
  const [title, setTitle] = useState(label?.title ?? "");
  // Not `formState.isDirty`: that compares the whole form to the defaults, and a field
  // registered without a value (key missing from the loaded data) counts as a change,
  // so the form is dirty as soon as it loads. `dirtyFields` compares field by field.
  const dirty = Object.keys(formState.dirtyFields).length > 0 || title !== (label?.title ?? "");
  const release = useWarnWhenDirty(control, title !== (label?.title ?? ""));

  const save = useApiMutation({
    mutationFn: async (v: FormValues) => {
      const body = productBody(v);
      if (mode === "create") return call(ep.createProduct, { body });
      if (mode === "product") return call(ep.updateProduct, { body });
      // Label mode: field visibility + title, label content, label media.
      await call(ep.updateProductLabel, {
        body: { ...label, fields: labelFields(v.visibility, label?.fields), title },
      });
      await call(ep.updateProductLabelContent, {
        body: { ...body, id: product!.id, labelId: label!.id } as ApiProductLabelContent,
      });
      await call(ep.updateCompanyDocumentsForProductLabel, {
        path: { id: label!.id! },
        body: [...v.media.video, ...v.media.farmers, ...v.media.productionRecord],
      });
    },
    onSuccess: (_, v) => {
      release();
      if (mode === "create") return navigate(completeOnboarding("product") ? "/home" : "/product-labels");
      reset(v);
      onSaved?.();
      notify?.({ type: "success", message: mode === "labels" ? translate("products.productPage.notifications.labelSaved") : translate("products.productPage.notifications.productSaved") });
    },
  });

  const content = (
    <form onSubmit={handleSubmit((v) => save.mutate(v), focusFirstError)}>
      <FormLayout control={control}>
      {mode === "labels" && (
        <Section id="label" title={translate("products.productPage.titles.label")}>
          <Field className="max-w-md">
            <FieldLabel>{translate("products.productPage.fields.labelTitle")}</FieldLabel>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit} maxLength={255} />
          </Field>
          <p className="text-xs text-muted-foreground">
            {translate("products.productPage.fields.useTheShowOnLabel")}
          </p>
        </Section>
      )}
      <ProductSections
        control={control}
        mode={mode}
        onPrefill={canEdit ? (kind, from) => prefillFrom(kind, from, setValue) : undefined}
        currentProductId={product?.id}
      />
      {mode === "labels" && <MediaSection control={control} />}
      {canEdit && (
        <FormActions sticky control={control} dirty={dirty}>
          <Button type="button" variant="outline" disabled={!dirty} onClick={() => (reset(), setTitle(label?.title ?? ""))}>
            {translate("products.productPage.buttons.discardChanges")}
          </Button>
          <Button
            type="submit"
            disabled={save.isPending}
            data-onboarding={mode === "create" ? "product-create" : undefined}
          >
            {save.isPending && <Spinner />}
            {mode === "create"
              ? translate("buttons.create")
              : translate("buttons.save")}
          </Button>
        </FormActions>
      )}
      </FormLayout>
    </form>
  );

  return (
    <LabelMode.Provider value={mode === "labels" ? { control } : null}>
      {mode === "create" ? (
        <PageHeader
          title={translate("products.productPage.titles.newProduct")}
          breadcrumbs={[{ label: translate("products.titles.products"), to: "/product-labels" }]}
        />
      ) : (
        <ProductTabs productId={product!.id!} />
      )}
      {typeof header === "function" ? header(dirty) : header}
      {!canEdit && (
        <p className="text-xs text-muted-foreground">
          {translate("products.productPage.texts.onlyTheCompanyThatOwns")}
        </p>
      )}
      {content}
    </LabelMode.Provider>
  );
}

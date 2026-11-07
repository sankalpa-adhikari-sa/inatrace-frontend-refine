import { useTranslate } from "@refinedev/core";
import { type ReactNode, useContext, useState } from "react";
import { type Control, type FieldPath, type UseFormSetValue, useController, useWatch } from "react-hook-form";
import type { ApiProduct } from "@/client/types.gen";
import { EMAIL_PATTERN, ReadOnlyField, SelectField, TextField, TextareaField } from "@/components/app/form-fields";
import { LocationFields } from "@/components/app/location-fields";
import { LocationPinsField } from "@/components/app/location-pins-field";
import { Section } from "@/components/app/page";
import { RichTextField } from "@/components/app/rich-text-field";
import { IMAGE_TYPES, UploadField } from "@/components/app/upload-field";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { FieldGroup, FieldLabel } from "@/components/ui/field";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { LANGUAGES, SOCIAL, visKey, type FormValues, LabelMode, type Language } from "./model";
import { PrefillProductDialog } from "./prefill";
import { JourneyMarkers } from "./journey";
import { B2cSection } from "./b2c";

/** A field with an optional "Show on label" switch (label mode only). */
export function Labeled({ name, children, className }: { name: string; children: ReactNode; className?: string }) {
  const ctx = useContext(LabelMode);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {ctx && <VisibilityToggle control={ctx.control} name={name} />}
      {children}
    </div>
  );
}

function VisibilityToggle({ control, name }: { control: Control<FormValues>; name: string }) {
  const translate = useTranslate();
  const { field } = useController({ control, name: `visibility.${visKey(name)}` as FieldPath<FormValues> });
  const id = `vis-${visKey(name)}`;
  return (
    <div className="flex items-center gap-1.5 self-end text-[0.7rem] text-muted-foreground">
      <Checkbox
        id={id}
        checked={!!field.value}
        onCheckedChange={(c) => field.onChange(!!c)}
        disabled={field.disabled}
      />
      <Label htmlFor={id} className="font-normal">
        {translate("products.productPage.fields.showOnLabel")}
      </Label>
    </div>
  );
}

export type PrefillKind = "responsibility" | "sustainability";

/** Copy one section's texts from another product (ProductLabelComponent.prefillFields). */
export function prefillFrom(kind: PrefillKind, from: ApiProduct, setValue: UseFormSetValue<FormValues>) {
  const opts = { shouldDirty: true };
  if (kind === "responsibility") {
    if (from.responsibility?.laborPolicies)
      setValue("responsibility.laborPolicies", from.responsibility.laborPolicies, opts);
    return;
  }
  if (from.sustainability?.production) setValue("sustainability.production", from.sustainability.production, opts);
  if (from.sustainability?.packaging) setValue("sustainability.packaging", from.sustainability.packaging, opts);
  if (from.sustainability?.co2Footprint)
    setValue("sustainability.co2Footprint", from.sustainability.co2Footprint, opts);
}

export function ProductSections({
  control,
  mode,
  onPrefill,
  currentProductId,
}: {
  control: Control<FormValues>;
  mode: "create" | "product" | "labels";
  onPrefill?: (kind: PrefillKind, from: ApiProduct) => void;
  currentProductId?: number;
}) {
  const translate = useTranslate();
  const [prefilling, setPrefilling] = useState<PrefillKind | null>(null);
  const prefillButton = (kind: PrefillKind) =>
    onPrefill && (
      <Button type="button" variant="outline" size="sm" onClick={() => setPrefilling(kind)}>
        {kind === "responsibility"
          ? translate("products.productPage.buttons.prefill")
          : translate("products.productPage.buttons.prefill")}
      </Button>
    );
  // Backend @Size limits (ApiProductBase, ApiSustainability, ApiCompanyBase, …); a longer value is rejected on save.
  const max = (
    value: number,
    text = translate("products.productPage.errors.entryExceedsAllowedMaxCharacters")
  ) => ({ value, message: `${text} (${value})` });
  const strict = mode !== "labels";
  const required = (message: string) => (strict ? { required: message } : undefined);
  // Product name / photo / description are worded for the label in label mode (productNameLabelAndPlaceholder).
  const named = (product: string, label: string) => (mode === "labels" ? label : product);
  const socialLabels: Record<(typeof SOCIAL)[number], string> = {
    facebook: translate("products.productPage.fields.facebookWebpageUrl"),
    instagram: translate("products.productPage.fields.instagramWebpageUrl"),
    twitter: translate("products.productPage.fields.twitterWebpageUrl"),
    youtube: translate("products.productPage.fields.youTubeWebpageUrl"),
    other: translate("products.productPage.fields.otherWebpageUrl"),
  };
  const valueChain = useWatch({ control, name: "valueChain" });
  return (
    <>
      <Section
        id="data"
        navLabel={
          mode === "labels"
            ? translate("products.productPage.titles.labelData")
            : translate("products.productPage.titles.productData")
        }
        title={
          mode === "labels"
            ? translate("products.productPage.titles.labelData")
            : translate("products.productPage.titles.productData")
        }
      >
        <FieldGroup className="grid gap-4 @2xl:grid-cols-2">
          {/* Fixed when the product is created; shown for context, not a section of its own. Label content
              doesn't carry it. */}
          {valueChain?.name && (
            <ReadOnlyField
              label={translate("products.productPage.fields.valueChain")}
              value={valueChain.name}
              className="@2xl:col-span-2 @2xl:max-w-[calc(50%-0.5rem)]"
            />
          )}
          <Labeled name="name">
            <TextField
              control={control}
              name="name"
              label={named(
                translate("products.productPage.fields.productName"),
                translate("products.productPage.fields.labelName")
              )}
              placeholder={
                mode === "labels"
                  ? translate("products.productPage.placeholders.enterLabelName")
                  : translate("products.productPage.placeholders.enterProductName")
              }
              rules={{ ...required(translate("products.productPage.errors.productNameIsRequired")), maxLength: max(255) }}
            />
          </Labeled>
          <Labeled name="photo">
            <UploadField
              control={control}
              name="photo"
              label={named(
                translate("products.productPage.fields.productPhoto"),
                translate("products.productPage.fields.labelPhoto")
              )}
              image
              accept={IMAGE_TYPES}
              rules={required(translate("products.productPage.errors.productPhotoIsRequired"))}
            />
          </Labeled>
          <Labeled name="description" className="@2xl:col-span-2">
            <TextareaField
              control={control}
              name="description"
              label={named(
                translate("products.productPage.fields.productDescription"),
                translate("products.productPage.fields.labelDescription")
              )}
              rules={{ ...required(translate("products.productPage.errors.productDescriptionIsRequired")), maxLength: max(2000) }}
            />
          </Labeled>
          <Labeled name="origin" className="@2xl:col-span-2">
            <TextareaField
              control={control}
              name="origin.text"
              label={translate("products.productPage.fields.origin")}
              description={translate("products.productPage.descriptions.brieflyDescribeWhereTheProduct")}
              rules={{ ...required(translate("products.productPage.errors.originIsRequired")), maxLength: max(2000) }}
            />
            <LocationPinsField
              control={control}
              name="origin.locations"
              required={strict ? translate("products.productPage.errors.originIsRequired") : undefined}
              pinNameLabel={translate("products.productPage.fields.pinName")}
              farmersLabel={translate("products.productPage.fields.ofFarmers")}
              resetLabel={translate("products.productPage.buttons.resetMap")}
            />
          </Labeled>
        </FieldGroup>
        <JourneyMarkers control={control} />
      </Section>

      <Section id="process" title={translate("products.productPage.titles.process")}>
        <Labeled name="process.production">
          <TextareaField
            control={control}
            name="process.production"
            label={translate("products.productPage.fields.production")}
            rules={{ ...required(translate("products.productPage.errors.productionIsRequired")), maxLength: max(2000) }}
          />
        </Labeled>
      </Section>

      <Section
        id="social-responsibility"
        title={translate("products.productPage.titles.socialResponsibility")}
        actions={prefillButton("responsibility")}
      >
        <Labeled name="responsibility.laborPolicies">
          <TextareaField
            control={control}
            name="responsibility.laborPolicies"
            label={translate("products.productPage.fields.laborPolicies")}
            rules={{ ...required(translate("products.productPage.errors.laborPoliciesAreRequired")), maxLength: max(2000) }}
          />
        </Labeled>
      </Section>

      <Section
        id="sustainability"
        title={translate("products.productPage.titles.environmentalSustainability")}
        actions={prefillButton("sustainability")}
      >
        <FieldGroup>
          <Labeled name="sustainability.production">
            <TextareaField
              control={control}
              name="sustainability.production"
              label={translate("products.productPage.fields.environmentallyFriendlyProduction")}
              rules={{
                ...required(translate("products.productPage.errors.environmentallyFriendlyProductionIsRequired")),
                maxLength: max(1000),
              }}
            />
          </Labeled>
          <Labeled name="sustainability.packaging">
            <TextareaField
              control={control}
              name="sustainability.packaging"
              label={translate("products.productPage.fields.sustainablePackaging")}
              rules={{ maxLength: max(1000, translate("products.productPage.errors.entryExceedsAllowedMaxCharacters")) }}
            />
          </Labeled>
          <Labeled name="sustainability.co2Footprint">
            <TextareaField
              control={control}
              name="sustainability.co2Footprint"
              label={translate("products.productPage.fields.co2Footprint")}
              rules={{ maxLength: max(255) }}
            />
          </Labeled>
        </FieldGroup>
      </Section>

      <Section id="settings" title={translate("products.productPage.titles.settings")}>
        <FieldGroup>
          <Labeled name="settings.language" className="max-w-xs">
            <SelectField
              control={control}
              name="settings.language"
              label={translate("products.productPage.fields.language")}
              options={LANGUAGES}
            />
          </Labeled>
          <Labeled name="settings.gdprText">
            <RichTextField
              control={control}
              name="settings.gdprText"
              label={translate("products.productPage.fields.gdprText")}
              rules={{ maxLength: max(2000) }}
            />
          </Labeled>
          <Labeled name="settings.privacyPolicyText">
            <RichTextField
              control={control}
              name="settings.privacyPolicyText"
              label={translate("products.productPage.fields.privacyPolicyText")}
              rules={{ maxLength: max(50000) }}
            />
          </Labeled>
          <Labeled name="settings.termsOfUseText">
            <RichTextField
              control={control}
              name="settings.termsOfUseText"
              label={translate("products.productPage.fields.termsOfUseText")}
              rules={{ maxLength: max(50000) }}
            />
          </Labeled>
        </FieldGroup>
      </Section>

      <Section id="company" title={translate("products.productPage.titles.company")}>
        <FieldGroup className="grid gap-4 @2xl:grid-cols-2">
          <Labeled name="company.name">
            <TextField
              control={control}
              name="company.name"
              label={translate("common.fields.companyName")}
              rules={{ ...required(translate("common.errors.companyNameIsRequired")), maxLength: max(255) }}
            />
          </Labeled>
          <Labeled name="company.logo">
            <UploadField
              control={control}
              name="company.logo"
              label={translate("products.productPage.fields.companyLogo")}
              image
              accept={IMAGE_TYPES}
            />
          </Labeled>
          <Labeled name="company.headquarters" className="@2xl:col-span-2">
            <FieldLabel>{translate("products.productPage.fields.companyHeadquarters")}</FieldLabel>
            <LocationFields
              control={control}
              prefix="company.headquarters"
              variant="person"
              showVisibility={false}
              showPin={false}
              flat
            />
          </Labeled>
          <Labeled name="company.about" className="@2xl:col-span-2">
            <TextareaField
              control={control}
              name="company.about"
              label={translate("products.productPage.fields.aboutCompany")}
              rules={{ maxLength: max(2000) }}
            />
          </Labeled>
          <Labeled name="company.manager">
            <TextField
              control={control}
              name="company.manager"
              label={translate("products.productPage.fields.nameOfManagerCeo")}
              rules={{ maxLength: max(255) }}
            />
          </Labeled>
          <Labeled name="company.email">
            <TextField
              control={control}
              name="company.email"
              type="email"
              label={translate("products.productPage.fields.contactEMail")}
              rules={{ pattern: EMAIL_PATTERN, maxLength: max(255) }}
            />
          </Labeled>
          <Labeled name="company.phone">
            <TextField
              control={control}
              name="company.phone"
              type="tel"
              label={translate("products.productPage.fields.contactPhoneNumber")}
              rules={{ maxLength: max(20) }}
            />
          </Labeled>
          <Labeled name="company.webPage">
            <TextField
              control={control}
              name="company.webPage"
              type="url"
              label={translate("products.productPage.fields.companyWebpageUrl")}
              rules={{ maxLength: max(255) }}
            />
          </Labeled>
          {SOCIAL.map((s) => (
            <Labeled key={s} name={`company.mediaLinks.${s}`}>
              <TextField
                control={control}
                name={`company.mediaLinks.${s}` as FieldPath<FormValues>}
                type="url"
                label={socialLabels[s]}
              />
            </Labeled>
          ))}
        </FieldGroup>
      </Section>

      <B2cSection control={control} />
      {prefilling && onPrefill && (
        <PrefillProductDialog
          excludeId={currentProductId}
          onClose={() => setPrefilling(null)}
          onSelect={(product) => {
            onPrefill(prefilling, product);
            setPrefilling(null);
          }}
        />
      )}
    </>
  );
}

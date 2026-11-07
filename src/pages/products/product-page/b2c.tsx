import { useTranslate } from "@refinedev/core";
import { type Control, type FieldPath, useController, useWatch } from "react-hook-form";
import { CheckboxField, SelectField, TextField } from "@/components/app/form-fields";
import { Section } from "@/components/app/page";
import { RichTextField } from "@/components/app/rich-text-field";
import { IMAGE_TYPES, UploadField } from "@/components/app/upload-field";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { GRAPHIC_OPTIONS, type FormValues } from "./model";

function ColorField({
  control,
  name,
  label,
}: {
  control: Control<FormValues>;
  name: FieldPath<FormValues>;
  label: string;
}) {
  const { field } = useController({ control, name });
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          id={name}
          type="color"
          className="h-7 w-10 cursor-pointer rounded border bg-transparent p-0.5 disabled:cursor-not-allowed"
          value={(field.value as string) || "#000000"}
          onChange={(e) => field.onChange(e.target.value)}
          disabled={field.disabled}
        />
        <Input
          className="font-mono"
          value={(field.value as string) ?? ""}
          onChange={(e) => field.onChange(e.target.value)}
          disabled={field.disabled}
        />
      </div>
    </Field>
  );
}

export const FONT_TYPES = ".ttf,.woff,.woff2,font/ttf,font/woff,font/woff2";

export function B2cSection({ control }: { control: Control<FormValues> }) {
  const translate = useTranslate();
  const b = "businessToCustomerSettings";
  const fontTypeError = translate("products.productPage.errors.uploadOnlyFileTypesTtf");
  const tabs = useWatch({ control, name: "businessToCustomerSettings" }) ?? {};
  const tab = (key: "FairPrices" | "Producers" | "Quality" | "Feedback", label: string, enableLabel: string) => (
    <div className="flex flex-col gap-2 border-b pb-4 last:border-b-0 last:pb-0">
      <CheckboxField
        control={control}
        name={`${b}.tab${key}`}
        label={enableLabel}
      />
      {tabs[`tab${key}`] && (
        <TextField
          control={control}
          name={`${b}.order${key}`}
          type="number"
          label={translate("products.productPage.fields.tabPosition", { label })}
        />
      )}
    </div>
  );
  return (
    <Section
      id="b2c"
      title={translate("products.productPage.titles.b2cSettings")}
      description={translate("products.productPage.descriptions.lookAndContentOfThe")}
    >
      <FieldGroup className="grid gap-4 @lg:grid-cols-2 @4xl:grid-cols-4">
        <ColorField
          control={control}
          name={`${b}.primaryColor`}
          label={translate("products.productPage.fields.primaryColor")}
        />
        <ColorField
          control={control}
          name={`${b}.secondaryColor`}
          label={translate("products.productPage.fields.secondaryColor")}
        />
        <ColorField
          control={control}
          name={`${b}.tertiaryColor`}
          label={translate("products.productPage.fields.tertiaryColor")}
        />
        <ColorField
          control={control}
          name={`${b}.quaternaryColor`}
          label={translate("products.productPage.fields.quaternaryColor")}
        />
        <ColorField
          control={control}
          name={`${b}.productTitleColor`}
          label={translate("products.productPage.fields.productTitleColor")}
        />
        <ColorField
          control={control}
          name={`${b}.headingColor`}
          label={translate("products.productPage.fields.headingColor")}
        />
        <ColorField
          control={control}
          name={`${b}.textColor`}
          label={translate("products.productPage.fields.textColor")}
        />
      </FieldGroup>
      <FieldGroup className="grid gap-4 @lg:grid-cols-2">
        <UploadField
          control={control}
          name={`${b}.productFont`}
          label={translate("products.productPage.fields.productFont")}
          description={translate("products.productPage.descriptions.uploadFontUsedForProduct")}
          accept={FONT_TYPES}
          typeError={fontTypeError}
        />
        <UploadField
          control={control}
          name={`${b}.textFont`}
          label={translate("products.productPage.fields.textFont")}
          description={translate("products.productPage.descriptions.uploadFontUsedForMain")}
          accept={FONT_TYPES}
          typeError={fontTypeError}
        />
        <UploadField
          control={control}
          name={`${b}.landingPageImage`}
          label={translate("products.productPage.fields.landingPageImage")}
          description={translate("products.productPage.descriptions.uploadHighQualityLandingPage")}
          image
          accept={IMAGE_TYPES}
        />
        <UploadField
          control={control}
          name={`${b}.landingPageBackgroundImage`}
          label={translate("products.productPage.fields.landingPageBackgroundImage")}
          description={translate("products.productPage.descriptions.uploadHighQualityLandingPageBackgroundImageRecommended")}
          image
          accept={IMAGE_TYPES}
        />
        <UploadField
          control={control}
          name={`${b}.headerBackgroundImage`}
          label={translate("products.productPage.fields.headerBackgroundImage")}
          description={translate("products.productPage.descriptions.uploadHighQualityHeaderBackground")}
          image
          accept={IMAGE_TYPES}
        />
      </FieldGroup>
      <div className="grid gap-3 @lg:grid-cols-2 @4xl:grid-cols-4">
        {tab("FairPrices", translate("products.productPage.fields.fairPrices"), translate("products.productPage.fields.enableFairPricesTab"))}
        {tab("Producers", translate("products.productPage.fields.producers"), translate("products.productPage.fields.enableProducersTab"))}
        {tab("Quality", translate("common.fields.quality"), translate("products.productPage.fields.enableQualityTab"))}
        {tab("Feedback", translate("products.productPage.buttons.feedback"), translate("products.productPage.fields.enableFeedbackTab"))}
      </div>
      {tabs.tabFairPrices && (
        <RichTextField
          control={control}
          name="settings.incomeIncreaseDescription"
          label={translate("products.productPage.fields.pricingTransparencyDescription")}
          rules={{
            maxLength: {
              value: 2000,
              message: `${translate("products.productPage.errors.entryExceedsAllowedMaxCharacters")} (2000)`,
            },
          }}
        />
      )}
      <FieldGroup className="grid gap-4 @lg:grid-cols-2 @3xl:grid-cols-3">
        <SelectField
          control={control}
          name={`${b}.graphicPriceToProducer`}
          label={translate("products.productPage.fields.pricePaidToProducerGraphic")}
          options={GRAPHIC_OPTIONS}
        />
        <SelectField
          control={control}
          name={`${b}.graphicFarmGatePrice`}
          label={translate("products.productPage.fields.farmGatePriceGraphic")}
          options={GRAPHIC_OPTIONS}
        />
        <CheckboxField
          control={control}
          name={`${b}.graphicQuality`}
          label={translate("products.productPage.fields.enableQualityGraphic")}
          className="self-end"
        />
        <TextField
          control={control}
          name={`${b}.containerSize`}
          type="number"
          label={translate("products.productPage.fields.containerSize")}
        />
        <TextField
          control={control}
          name={`${b}.worldMarket`}
          type="number"
          label={translate("products.productPage.fields.worldMarketPriceUsdPound")}
        />
        <TextField
          control={control}
          name={`${b}.fairTrade`}
          type="number"
          label={translate("products.productPage.fields.fairtradeMinimumPricePremiumUsd")}
        />
        <TextField
          control={control}
          name={`${b}.manualFarmGatePrice`}
          type="number"
          label={translate("products.productPage.fields.manualFarmGatePriceUsd")}
        />
        <TextField
          control={control}
          name={`${b}.averageRegionFarmGatePrice`}
          type="number"
          label={translate("products.productPage.fields.averageFarmGatePriceFor")}
        />
        <TextField
          control={control}
          name={`${b}.manualProducerPrice`}
          type="number"
          label={translate("products.productPage.fields.manualProducerPriceUsdKg")}
        />
      </FieldGroup>
    </Section>
  );
}

import { useOne, useTranslate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useNavigate, useParams } from "react-router";
import type { ApiCompanyGet } from "@/client/types.gen";
import { CertificationsField } from "@/components/app/certifications-field";
import { CompanyDocumentsField } from "@/components/app/company-documents-field";
import { useConfirm } from "@/components/app/confirm";
import { CheckboxField, EMAIL_PATTERN, EntityComboboxField, EntityListField, EntitySelectField, TextField, TextareaField } from "@/components/app/form-fields";
import { FormActions, PageLoader, Section } from "@/components/app/page";
import { IMAGE_TYPES, UploadField } from "@/components/app/upload-field";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useInvalidateSelectedCompany } from "@/hooks/use-session";
import { useCountries, useEnabledCurrencies, useEnabledValueChains } from "@/hooks/use-lookups";
import { CompanyTabs } from "./company-tabs";
import { t } from "@/lib/i18n";

const MAX_2000 = { value: 2000, get message() { return t("companies.errors.atMost2000Characters"); } };
const SOCIAL = ["facebook", "instagram", "twitter", "youtube", "other"] as const;

type FormValues = ApiCompanyGet & { mediaLinks: Record<(typeof SOCIAL)[number], string> };

/** `/companies/new` and `/companies/:id/company`. */
export function CompanyDetail() {
  const translate = useTranslate();
  const { id } = useParams();
  const companyId = id ? Number(id) : undefined;
  const isNew = companyId == null;
  const navigate = useNavigate();
  const confirm = useConfirm();
  const invalidateSelected = useInvalidateSelectedCompany();

  const countries = useCountries();
  const currencies = useEnabledCurrencies();
  const valueChains = useEnabledValueChains();

  const { query } = useOne<ApiCompanyGet>({ resource: "companies", id: companyId, queryOptions: { enabled: !isNew } });

  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading },
  } = useForm<FormValues>({
    defaultValues: {
      documents: [],
      certifications: [],
      valueChains: [],
      mediaLinks: { facebook: "", instagram: "", twitter: "", youtube: "", other: "" },
    },
    refineCoreProps: {
      resource: "companies",
      action: isNew ? "create" : "edit",
      id: companyId,
      redirect: false,
      successNotification: { type: "success", message: translate("companies.errors.companySaved") },
      onMutationSuccess: () => {
        invalidateSelected();
        if (isNew) navigate("/companies");
      },
    },
  });

  if (!isNew && query.isLoading) return <PageLoader />;

  function submit(values: FormValues) {
    const mediaLinks = Object.fromEntries(Object.entries(values.mediaLinks ?? {}).filter(([, v]) => !!v));
    const { users: _users, actions: _actions, ...rest } = values;
    return onFinish({ ...rest, mediaLinks } as FormValues);
  }

  return (
    <>
      <CompanyTabs companyId={companyId} />
      <form onSubmit={handleSubmit((v) => submit(v as FormValues))} className="flex flex-col gap-6">
        <Section
          title={translate("common.titles.basicInformation")}
          description={translate("companies.descriptions.addInformationAboutYourCompany")}
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name="name"
              label={translate("common.fields.companyName")}
              rules={{ required: translate("common.errors.companyNameIsRequired") }}
            />
            <TextField
              control={control}
              name="abbreviation"
              label={translate("companies.fields.companyAbbreviation")}
              rules={{
                minLength: { value: 3, message: translate("companies.errors.abbreviationMustHave3To") },
                maxLength: { value: 6, message: translate("companies.errors.abbreviationMustHave3To") },
              }}
            />
            <UploadField
              control={control}
              name="logo"
              label={translate("companies.fields.companyLogo")}
              description={translate("companies.descriptions.uploadAHighResolutionLogo")}
              image
              accept={IMAGE_TYPES}
              rules={{
                required: translate("companies.errors.companyLogoIsRequired"),
              }}
              className="sm:col-span-2"
            />
          </FieldGroup>
        </Section>

        <Section title={translate("companies.titles.companyHeadquarters")}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name="headquarters.address"
              label={translate("companies.fields.streetAddress")}
              rules={{ required: translate("companies.errors.streetAddressIsRequired") }}
              className="sm:col-span-2"
            />
            <TextField
              control={control}
              name="headquarters.city"
              label={translate("companies.fields.city")}
            />
            <TextField
              control={control}
              name="headquarters.state"
              label={translate("companies.fields.stateProvinceRegion")}
            />
            <TextField
              control={control}
              name="headquarters.zip"
              label={translate("companies.fields.zipPostalCodePO")}
              rules={{ maxLength: { value: 50, message: translate("companies.errors.atMost50Characters") } }}
            />
            <EntityComboboxField
              control={control}
              name="headquarters.country"
              label={translate("common.fields.country")}
              items={countries}
              getLabel={(c) => c.name}
              rules={{
                required: translate("companies.errors.countryIsRequired"),
              }}
            />
          </FieldGroup>
        </Section>

        <Section title={translate("companies.titles.companyDescription")}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextareaField
              control={control}
              name="about"
              label={translate("companies.fields.aboutCompany")}
              rules={{ required: translate("companies.errors.aboutCompanyIsRequired"), maxLength: MAX_2000 }}
              className="sm:col-span-2"
            />
            <TextField
              control={control}
              name="manager"
              label={translate("companies.fields.nameOfManagerCeo")}
            />
            <TextField
              control={control}
              name="email"
              type="email"
              label={translate("companies.fields.contactEMail")}
              rules={{ required: translate("companies.errors.contactEMailIsRequired"), pattern: EMAIL_PATTERN }}
            />
            <TextField
              control={control}
              name="phone"
              type="tel"
              label={translate("companies.fields.contactPhoneNumber")}
              rules={{ required: translate("companies.errors.contactPhoneNumberIsRequired") }}
            />
            <TextField
              control={control}
              name="webPage"
              type="url"
              label={translate("companies.fields.companyWebpageUrl")}
            />
            <TextareaField
              control={control}
              name="interview"
              label={translate("companies.fields.interview")}
              rules={{ maxLength: MAX_2000 }}
              className="sm:col-span-2"
            />
          </FieldGroup>
        </Section>

        <div className="grid gap-6 lg:grid-cols-3">
          <Section title={translate("companies.titles.videos")}>
            <CompanyDocumentsField control={control} name="documents" category="VIDEO" />
          </Section>
          <Section title={translate("companies.titles.productionRecords")}>
            <CompanyDocumentsField control={control} name="documents" category="PRODUCTION_RECORD" />
          </Section>
          <Section title={translate("companies.titles.meetTheFarmers")}>
            <CompanyDocumentsField control={control} name="documents" category="MEET_THE_FARMER" />
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title={translate("companies.titles.companyValueChains")}>
            <EntityListField
              control={control}
              name="valueChains"
              items={valueChains}
              getLabel={(v) => v.name ?? ""}
              rules={{ validate: (v) => (Array.isArray(v) && v.length > 0) || translate("companies.errors.atLeastOneValueChain") }}
              confirmRemove={
                isNew
                  ? undefined
                  : () =>
                      confirm({
                        description: translate("companies.descriptions.areYouSureYouWantToRemoveThe"),
                        destructive: true,
                        confirmLabel: translate("buttons.remove"),
                      })
              }
            />
          </Section>
          <Section title={translate("companies.titles.baseCurrency")}>
            <EntitySelectField
              control={control}
              name="currency"
              label={translate("common.fields.currency")}
              items={currencies}
              getLabel={(c) => `${c.code} – ${c.label}`}
              rules={{ required: translate("companies.errors.baseCurrencyIsRequired") }}
            />
          </Section>
        </div>

        <Section
          title={translate("companies.titles.socialMedia")}
          description={translate("companies.descriptions.provideTheUrlLinksTo")}
        >
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            {SOCIAL.map((s) => (
              <TextField
                key={s}
                control={control}
                name={`mediaLinks.${s}`}
                type="url"
                label={translate("companies.fields.webpageUrl", { value: s === "youtube" ? "YouTube" : s.charAt(0).toUpperCase() + s.slice(1) })}
              />
            ))}
          </FieldGroup>
        </Section>

        <Section title={translate("companies.titles.beycoIntegration")}>
          <CheckboxField
            control={control}
            name="allowBeycoIntegration"
            label={translate("companies.fields.companyIsAllowedToExport")}
          />
        </Section>

        <Section title={translate("companies.titles.certification")}>
          <CertificationsField control={control} name="certifications" />
        </Section>

        <FormActions>
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
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

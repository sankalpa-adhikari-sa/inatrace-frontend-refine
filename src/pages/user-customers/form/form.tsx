import { useOne, useTranslate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useEffect } from "react";
import { useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import type { ApiProductType, ApiUserCustomer } from "@/client/types.gen";
import {
  CheckboxField,
  EMAIL_PATTERN,
  EntityListField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/app/form-fields";
import { CertificationsField } from "@/components/app/certifications-field";
import { LocationFields } from "@/components/app/location-fields";
import { FormActions, Section } from "@/components/app/page";
import { FormSkeleton } from "@/components/app/states";
import { FormLayout } from "@/components/app/form-layout";
import { UserCustomerCard } from "@/components/app/user-customer-card";
import { Button } from "@/components/ui/button";
import { FieldDescription, FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useSelectedCompany } from "@/hooks/use-session";
import { useWarnWhenDirty } from "@/hooks/use-warn-when-dirty";
import { ep } from "@/lib/endpoints";
import { useApi } from "@/lib/http";
import { focusFirstError } from "@/lib/form-errors";
import { completeOnboarding } from "@/stores/onboarding";
import { KIND, type UserCustomerType } from "../list";
import { FarmInfoSection } from "./farm-info";
import { Associations, Cooperatives } from "./memberships";
import { type FormValues, GENDERS, toForm } from "./model";
import { UserCustomerHeader } from "./orders-and-payments";
import { GeoDataActions, Plots } from "./plots";

/** `/my-farmers/add`, `/my-farmers/edit/:id` and the collector equivalents. */
export function UserCustomerForm({ type }: { type: UserCustomerType }) {
  const { company, companyId } = useSelectedCompany();
  if (!company || companyId == null) return <FormSkeleton sections={4} />;
  return <Form type={type} companyId={companyId} companyName={company.name ?? ""} />;
}

function Form({ type, companyId, companyName }: { type: UserCustomerType; companyId: number; companyName: string }) {
  const translate = useTranslate();
  const { id } = useParams();
  const isNew = id == null;
  const isFarmer = type === "FARMER";
  const kind = KIND[type];
  const { company } = useSelectedCompany();
  const navigate = useNavigate();
  const back = () => navigate(kind.base);

  const { query } = useOne<ApiUserCustomer>({ resource: "user-customers", id, queryOptions: { enabled: !isNew } });
  const existing = query.data?.data;

  const { data: productTypes = [] } = useApi(
    ep.getCompanyProductTypes,
    { path: { id: companyId }, query: { requestType: "FETCH", limit: 1000 } },
    { select: (r) => r?.items ?? [] }
  );
  const { data: associations = [] } = useApi(
    ep.getAssociations,
    { path: { id: companyId }, query: { requestType: "FETCH", limit: 1000 } },
    { select: (r) => r?.items ?? [] }
  );

  const newDefaults = toForm({
    type,
    hasSmartphone: false,
    cooperatives: [{ company: { id: companyId, name: companyName }, userCustomerType: type }],
    farm: { organic: false },
  });

  const {
    control,
    handleSubmit,
    setValue,
    getValues,
    refineCore: { onFinish, formLoading },
  } = useForm<ApiUserCustomer, any, FormValues>({
    values: existing ? toForm(existing) : undefined,
    defaultValues: newDefaults,
    refineCoreProps: {
      resource: "user-customers",
      action: isNew ? "create" : "edit",
      id,
      meta: { companyId },
      queryOptions: { enabled: false },
      redirect: false,
      onMutationSuccess: () => (isFarmer && isNew && completeOnboarding("farmers") ? navigate("/home") : back()),
    },
  });

  useEffect(() => {
    if (isNew && isFarmer && productTypes.length === 1 && !getValues("productTypes")?.length) {
      setValue("productTypes", productTypes);
    }
  }, [isNew, isFarmer, productTypes, getValues, setValue]);

  const selectedTypes = (useWatch({ control, name: "productTypes" }) as ApiProductType[] | undefined) ?? [];
  useEffect(() => {
    if (!isFarmer) return;
    const current = getValues("farm.farmPlantInformationList") ?? [];
    const next = selectedTypes.map((pt) => current.find((x) => x.productType?.id === pt.id) ?? { productType: pt });
    if (next.length !== current.length || next.some((n, i) => n !== current[i])) {
      setValue("farm.farmPlantInformationList", next);
    }
  }, [isFarmer, selectedTypes, getValues, setValue]);

  const [cardName, cardSurname, cardAddress] = useWatch({ control, name: ["name", "surname", "location.address"] }) as [
    string | undefined,
    string | undefined,
    NonNullable<FormValues["location"]>["address"],
  ];

  useWarnWhenDirty(control);

  if (!isNew && query.isLoading) return <FormSkeleton sections={4} />;

  function submit(v: FormValues) {
    const visible = v.location?.publiclyVisible;
    onFinish({
      ...v,
      type,
      hasSmartphone: !!v.hasSmartphone,
      location: { ...v.location, publiclyVisible: visible == null ? undefined : visible === "true" },
      farm: isFarmer ? { ...v.farm, organic: !!v.farm?.organic } : undefined,
    } as unknown as FormValues);
  }

  return (
    <>
      <UserCustomerHeader type={type} id={isNew ? undefined : Number(id)} />
      <form onSubmit={handleSubmit((v) => submit(v as FormValues), focusFirstError)}>
        <FormLayout control={control}>
          <Section id="basic" title={translate("common.titles.basicInformation")}>
            <div className="flex flex-col gap-6 @3xl:flex-row @3xl:items-start">
              <FieldGroup className="grid flex-1 gap-4 sm:grid-cols-2">
                <TextField
                  control={control}
                  name="name"
                  label={translate("common.fields.firstName")}
                  placeholder={translate("userCustomers.placeholders.enterFirstName")}
                  rules={{ required: translate("common.errors.firstNameIsRequired") }}
                />
                <TextField
                  control={control}
                  name="surname"
                  label={translate("common.fields.lastName")}
                  placeholder={translate("userCustomers.placeholders.enterLastName")}
                  rules={{ required: translate("common.errors.lastNameIsRequired") }}
                />
                <SelectField
                  control={control}
                  name="gender"
                  label={translate("userCustomers.fields.gender")}
                  options={GENDERS}
                  rules={{ required: translate("userCustomers.errors.genderIsRequired") }}
                />
                {!isNew && (
                  <TextField
                    control={control}
                    name="id"
                    label={translate("userCustomers.fields.userId")}
                    disabled
                  />
                )}
                {isFarmer && (
                  <TextField
                    control={control}
                    name="farmerCompanyInternalId"
                    label={translate("userCustomers.fields.companyInternalFarmerId")}
                    placeholder={translate("userCustomers.placeholders.enterCompanyInternalFarmerId")}
                  />
                )}
              </FieldGroup>
              {!isNew && (
                <UserCustomerCard
                  id={Number(id)}
                  name={cardName}
                  surname={cardSurname}
                  village={cardAddress?.village}
                  cell={cardAddress?.cell}
                  sector={cardAddress?.sector}
                />
              )}
            </div>
          </Section>

          <Section id="address" title={translate("userCustomers.titles.address")}>
            <LocationFields control={control} prefix="location" variant="person" showPin={false} />
          </Section>

          {isFarmer && (
            <Section
              id="plots"
              title={translate("userCustomers.titles.plots")}
              actions={existing && <GeoDataActions farmer={existing} onUploaded={() => query.refetch()} />}
            >
              <Plots control={control} productTypes={productTypes} farmerId={existing?.id} />
            </Section>
          )}

          <div className="grid gap-6 @3xl:grid-cols-2">
            <Section id="contact" title={translate("userCustomers.titles.additionalInformationAboutUser")}>
              <FieldGroup>
                <TextField
                  control={control}
                  name="phone"
                  type="tel"
                  label={translate("userCustomers.fields.phoneNumber")}
                  placeholder={translate("userCustomers.placeholders.enterPhoneNumber")}
                />
                <TextField
                  control={control}
                  name="email"
                  type="email"
                  label={translate("common.fields.eMail")}
                  placeholder={translate("userCustomers.placeholders.enterEMailAddress")}
                  rules={{ pattern: EMAIL_PATTERN }}
                />
                <CheckboxField control={control} name="hasSmartphone" label={translate("userCustomers.fields.smartPhone")} />
              </FieldGroup>
            </Section>
            <Section id="bank" title={translate("userCustomers.titles.bankInformation")}>
              <FieldGroup>
                <TextField
                  control={control}
                  name="bank.accountHolderName"
                  label={translate("userCustomers.fields.accountHoldersName")}
                  placeholder={translate("userCustomers.placeholders.enterAccountHoldersName")}
                />
                <TextField
                  control={control}
                  name="bank.accountNumber"
                  label={translate("userCustomers.fields.accountNumber")}
                  placeholder={translate("userCustomers.placeholders.enterAccountNumber")}
                />
                <TextField
                  control={control}
                  name="bank.bankName"
                  label={translate("userCustomers.fields.bankName")}
                  placeholder={translate("userCustomers.placeholders.enterBankName")}
                />
                <TextareaField
                  control={control}
                  name="bank.additionalInformation"
                  label={translate("userCustomers.fields.additionalInformation")}
                  placeholder={translate("userCustomers.placeholders.enterAdditionalInformation")}
                  rows={2}
                />
              </FieldGroup>
            </Section>
          </div>

          <div className="grid gap-6 @3xl:grid-cols-2">
            <Section id="companies" title={translate("userCustomers.titles.companies")}>
              <FieldDescription>{translate("userCustomers.descriptions.supplierOf")}</FieldDescription>
              <Cooperatives control={control} companyId={companyId} companyName={companyName} type={type} />
            </Section>
            <Section id="associations" title={translate("userCustomers.titles.associations")}>
              <Associations control={control} associations={associations} />
            </Section>
          </div>

          {isFarmer && (
            <>
              <Section id="product-types" title={translate("userCustomers.titles.productTypes")}>
                {!company?.valueChains?.length && (
                  <p className="text-xs text-muted-foreground italic">
                    {translate("userCustomers.texts.pleaseSelectAtLeastOne")}
                  </p>
                )}
                <EntityListField
                  control={control}
                  name="productTypes"
                  items={productTypes}
                  getLabel={(p) => p.name ?? ""}
                />
              </Section>
              <FarmInfoSection control={control} />
              <Section id="certification" title={translate("userCustomers.titles.certification")}>
                <CertificationsField control={control} name="certifications" />
              </Section>
            </>
          )}

          <FormActions sticky control={control}>
            <Button type="button" variant="outline" onClick={back}>
              {translate("buttons.cancel")}
            </Button>
            <Button type="submit" disabled={formLoading} data-onboarding={isFarmer ? "farmer-save" : undefined}>
              {formLoading && <Spinner />}
              {translate("buttons.save")}
            </Button>
          </FormActions>
        </FormLayout>
      </form>
    </>
  );
}

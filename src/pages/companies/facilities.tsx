import { useList, useNotification, useOne, useTranslate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router";
import type { ApiFacility, ApiFacilityType, ApiValueChain } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { RowActions, StatusBadge } from "@/components/app/controls";
import {
  CheckboxField,
  EntityListField,
  EntitySelectField,
  SelectField,
  TextField,
} from "@/components/app/form-fields";
import { LocationFields } from "@/components/app/location-fields";
import { FormActions, PageLoader, Section } from "@/components/app/page";
import { MapView } from "@/components/app/map-view";
import { completeOnboarding } from "@/stores/onboarding";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyTabs } from "./company-tabs";
import { call, useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { t } from "@/lib/i18n";

const LANGUAGES = ["EN", "DE", "RW", "ES"] as const;
const YES_NO = [
  { value: "true", get label() { return t("common.fields.yes"); } },
  { value: "false", get label() { return t("common.fields.no"); } },
];

function locationName(f: ApiFacility) {
  const a = f.facilityLocation?.address;
  if (!a) return "";
  const parts = a.country?.code === "RW" ? [a.village, a.cell, a.sector] : [a.city, a.state];
  return [...parts, a.country?.name].filter(Boolean).join(", ");
}

/** `/companies/:id/facilities` */
export function CompanyFacilities() {
  const translate = useTranslate();
  const companyId = Number(useParams().id);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { open: notify } = useNotification();

  const columns = useMemo<ColumnDef<ApiFacility>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        header: translate("common.fields.name"),
        enableSorting: false,
      },
      {
        id: "type",
        header: translate("common.fields.type"),
        enableSorting: false,
        cell: ({ row }) => row.original.facilityType?.label,
      },
      {
        id: "public",
        header: translate("companies.fields.sellable"),
        enableSorting: false,
        cell: ({ row }) => (row.original.isPublic ? translate("common.fields.yes") : translate("common.fields.no")),
      },
      {
        id: "location",
        header: translate("companies.fields.location"),
        enableSorting: false,
        cell: ({ row }) => locationName(row.original),
      },
      {
        id: "status",
        header: translate("common.fields.status"),
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={row.original.deactivated ? "DEACTIVATED" : "ACTIVE"} />,
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        cell: ({ row }) => {
          const f = row.original;
          return (
            <RowActions
              actions={[
                {
                  label: translate("common.fields.edit"),
                  onClick: () => navigate(`/companies/${companyId}/facilities/${f.id}/edit`),
                },
                {
                  label: translate("companies.fields.activate"),
                  hidden: !f.deactivated,
                  onClick: async () => {
                    await call(ep.activateFacility, { path: { id: f.id! } });
                    table.refineCore.tableQuery.refetch();
                  },
                },
                {
                  label: translate("companies.fields.deactivate"),
                  destructive: true,
                  hidden: f.deactivated,
                  onClick: async () => {
                    if (
                      !(await confirm({
                        description: translate("companies.descriptions.areYouSureYouWant"),
                        destructive: true,
                        confirmLabel: translate("companies.buttons.deactivate"),
                      }))
                    )
                      return;
                    await call(ep.deactivateFacility, { path: { id: f.id! } });
                    notify?.({ type: "success", message: translate("companies.notifications.facilityDeactivated") });
                    table.refineCore.tableQuery.refetch();
                  },
                },
              ]}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [companyId]
  );

  const table = useTable<ApiFacility>({
    columns,
    refineCoreProps: { resource: "facilities", meta: { companyId }, syncWithLocation: false },
  });

  return (
    <>
      <CompanyTabs
        companyId={companyId}
        actions={
          <Button data-onboarding="add-facility" onClick={() => navigate(`/companies/${companyId}/facilities/add`)}>
            <Plus />
            {translate("companies.buttons.newFacility")}
          </Button>
        }
      />
      <Section plain
        title={translate("companies.titles.listOfFacilities")}
        description={translate("common.descriptions.total", { total: table.refineCore.result.total ?? 0 })}
      >
        <DataTable table={table} />
      </Section>
      <FacilitiesMap facilities={table.refineCore.result.data} />
    </>
  );
}

function FacilitiesMap({ facilities }: { facilities: ApiFacility[] }) {
  const translate = useTranslate();
  const markers = facilities
    .filter(
      (f) =>
        f.facilityLocation?.publiclyVisible &&
        f.facilityLocation.latitude != null &&
        f.facilityLocation.longitude != null
    )
    .map((f) => ({
      id: f.id!,
      lat: f.facilityLocation!.latitude!,
      lng: f.facilityLocation!.longitude!,
      popup: f.name,
    }));
  if (markers.length === 0) return null;
  return (
    <Section title={translate("companies.titles.map")} description={translate("companies.descriptions.publiclyVisibleFacilities")}>
      <MapView markers={markers} fitKey={markers.map((m) => m.id).join()} />
    </Section>
  );
}

type Translation = { language: (typeof LANGUAGES)[number]; name: string };
type FormValues = Omit<ApiFacility, "isPublic" | "isCollectionFacility" | "translations" | "facilityLocation"> & {
  isPublic: string | null;
  isCollectionFacility: string | null;
  translations: Translation[];
  facilityLocation: Omit<NonNullable<ApiFacility["facilityLocation"]>, "publiclyVisible"> & {
    publiclyVisible?: string | null;
  };
};

const str = (b?: boolean) => (b == null ? null : String(b));
const bool = (s?: string | null) => (s == null ? undefined : s === "true");

/** `/companies/:id/facilities/add` and `/companies/:id/facilities/:facilityId/edit` */
export function FacilityForm() {
  const translate = useTranslate();
  const { id, facilityId } = useParams();
  const companyId = Number(id);
  const isNew = facilityId == null;
  const navigate = useNavigate();
  const back = () => navigate(`/companies/${companyId}/facilities`);

  const { query } = useOne<ApiFacility>({ resource: "facilities", id: facilityId, queryOptions: { enabled: !isNew } });
  const { result: facilityTypes } = useList<ApiFacilityType>({
    resource: "facility-types",
    pagination: { mode: "off" },
  });
  const { data: valueChains = [] } = useApi(
    ep.getCompanyValueChains,
    { path: { id: companyId } },
    { select: (r) => r?.items ?? [] }
  );
  const { data: finalProducts = [] } = useApi(
    ep.getFinalProductsForCompany,
    { path: { companyId }, query: { requestType: "FETCH", limit: 1000 } },
    { select: (r) => r?.items ?? [] }
  );

  const existing = query.data?.data;
  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading },
  } = useForm<ApiFacility, any, FormValues>({
    values: existing ? toForm(existing) : undefined,
    defaultValues: toForm({}),
    refineCoreProps: {
      resource: "facilities",
      action: isNew ? "create" : "edit",
      id: facilityId,
      queryOptions: { enabled: false },
      redirect: false,
      onMutationSuccess: () => (completeOnboarding("facility") ? navigate("/home") : back()),
    },
  });

  const selectedChains = (useWatch({ control, name: "facilityValueChains" }) as ApiValueChain[] | undefined) ?? [];
  const chainIds = selectedChains.map((v) => v.id!).filter(Boolean);
  const { data: semiProducts = [] } = useApi(
    ep.getSemiProductListByValueChains,
    { query: { valueChainIds: chainIds, requestType: "FETCH", limit: 1000 } },
    { enabled: chainIds.length > 0, select: (r) => r?.items ?? [] }
  );

  if (!isNew && query.isLoading) return <PageLoader />;

  function submit(v: FormValues) {
    const english = v.translations.find((t) => t.language === "EN");
    onFinish({
      ...v,
      name: english?.name,
      company: isNew ? { id: companyId } : existing?.company,
      isPublic: bool(v.isPublic),
      isCollectionFacility: bool(v.isCollectionFacility),
      facilityLocation: { ...v.facilityLocation, publiclyVisible: bool(v.facilityLocation?.publiclyVisible) },
    } as unknown as FormValues);
  }

  return (
    <>
      <CompanyTabs
        companyId={companyId}
        title={
          isNew
            ? translate("companies.titles.newFacility")
            : translate("companies.titles.editFacility", { name: existing?.name ?? "" })
        }
      />
      <form onSubmit={handleSubmit((v) => submit(v as FormValues))} className="flex flex-col gap-6">
        <Section title={translate("common.titles.basicInformation")}>
          <FieldGroup>
            <EntitySelectField
              control={control}
              name="facilityType"
              label={translate("companies.fields.facilityType")}
              items={facilityTypes?.data ?? []}
              getLabel={(t) => t.label ?? ""}
              rules={{
                required: translate("companies.errors.facilityTypeIsRequired"),
              }}
            />
            <Tabs defaultValue="EN" className="flex-col">
              <TabsList>
                {LANGUAGES.map((l) => (
                  <TabsTrigger key={l} value={l}>
                    {l}
                  </TabsTrigger>
                ))}
              </TabsList>
              {LANGUAGES.map((l, i) => (
                <TabsContent key={l} value={l} keepMounted className="pt-2">
                  <TextField
                    control={control}
                    name={`translations.${i}.name`}
                    label={translate("companies.fields.nameOfFacility")}
                    rules={l === "EN" ? { required: translate("companies.errors.nameOfFacilityInEnglish") } : undefined}
                  />
                </TabsContent>
              ))}
            </Tabs>
          </FieldGroup>
        </Section>

        <Section title={translate("companies.titles.location")}>
          <LocationFields control={control} prefix="facilityLocation" />
        </Section>

        <Section title={translate("companies.titles.additionalAttributes")}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <SelectField
              control={control}
              name="isCollectionFacility"
              label={translate("companies.fields.isThisACollectionFacility")}
              options={YES_NO}
              rules={{ required: translate("companies.errors.thisFieldIsRequired") }}
            />
            <SelectField
              control={control}
              name="isPublic"
              label={translate("companies.fields.containsSellableSemiProductsOr")}
              options={YES_NO}
              rules={{ required: translate("companies.errors.thisFieldIsRequired") }}
            />
          </FieldGroup>
          <FieldGroup className="grid gap-3 sm:grid-cols-2">
            <CheckboxField
              control={control}
              name="displayMayInvolveCollectors"
              label={translate("companies.fields.mayInvolveCollectors")}
            />
            <CheckboxField
              control={control}
              name="displayOrganic"
              label={translate("companies.fields.organic")}
            />
            <CheckboxField
              control={control}
              name="displayWomenOnly"
              label={translate("companies.fields.womenOnly")}
            />
            <CheckboxField
              control={control}
              name="displayTare"
              label={translate("companies.fields.tare")}
            />
            <CheckboxField
              control={control}
              name="displayPriceDeductionDamage"
              label={translate("companies.fields.priceReductionForDamage")}
            />
            <CheckboxField
              control={control}
              name="displayWeightDeductionDamage"
              label={translate("companies.fields.weightReductionForDamage")}
            />
            <CheckboxField
              control={control}
              name="displayPriceDeterminedLater"
              label={translate("companies.fields.priceDeterminedLater")}
            />
          </FieldGroup>
        </Section>

        <div className="grid gap-6 lg:grid-cols-3">
          <Section title={translate("companies.titles.valueChains")}>
            <EntityListField
              control={control}
              name="facilityValueChains"
              items={valueChains}
              getLabel={(v) => v.name ?? ""}
              rules={{ validate: (v) => (Array.isArray(v) && v.length > 0) || translate("companies.errors.atLeastOneValueChain") }}
            />
          </Section>
          <Section title={translate("companies.titles.containedSemiProducts")}>
            {chainIds.length === 0 ? (
              <p className="text-xs text-muted-foreground">{translate("companies.texts.selectAValueChainFirst")}</p>
            ) : (
              <EntityListField
                control={control}
                name="facilitySemiProductList"
                items={semiProducts}
                getLabel={(s) => s.name ?? ""}
              />
            )}
          </Section>
          <Section
            title={translate("companies.titles.containedFinalProducts")}
          >
            <EntityListField
              control={control}
              name="facilityFinalProducts"
              items={finalProducts}
              getLabel={(f) => `${f.name}${f.product?.name ? ` (${f.product.name})` : ""}`}
            />
          </Section>
        </div>

        <FormActions>
          <Button type="button" variant="outline" onClick={back}>
            {translate("buttons.cancel")}
          </Button>
          <Button type="submit" disabled={formLoading} data-onboarding="facility-save">
            {formLoading && <Spinner />}
            {translate("buttons.save")}
          </Button>
        </FormActions>
      </form>
    </>
  );
}

function toForm(f: ApiFacility): FormValues {
  return {
    ...f,
    isPublic: str(f.isPublic),
    isCollectionFacility: str(f.isCollectionFacility),
    facilityValueChains: f.facilityValueChains ?? [],
    facilitySemiProductList: f.facilitySemiProductList ?? [],
    facilityFinalProducts: f.facilityFinalProducts ?? [],
    facilityLocation: { ...f.facilityLocation, publiclyVisible: str(f.facilityLocation?.publiclyVisible) },
    translations: LANGUAGES.map((language) => ({
      language,
      name: f.translations?.find((t) => t.language === language)?.name ?? "",
    })),
  };
}

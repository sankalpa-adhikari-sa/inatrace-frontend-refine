import { useDelete, useList, useNotification, useOne, useTranslate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import type {
  ApiFacilityType,
  ApiMeasureUnitType,
  ApiProcessingEvidenceField,
  ApiProcessingEvidenceType,
  ApiProductType,
  ApiSemiProduct,
  ApiValueChain,
} from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { RowActions, SearchInput, SimpleSelect, StatusBadge, Toolbar } from "@/components/app/controls";
import { EntityComboboxField, EntityListField, TextField } from "@/components/app/form-fields";
import { FormActions, PageHeader, Section } from "@/components/app/page";
import { FormLayout } from "@/components/app/form-layout";
import { FormSkeleton } from "@/components/app/states";
import { useWarnWhenDirty } from "@/hooks/use-warn-when-dirty";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { SortableHeader } from "@/components/refine-ui/data-table/data-table-sorter";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useIdentity } from "@/hooks/use-session";
import { useTableFilter } from "@/hooks/use-table-filter";
import { ep } from "@/lib/endpoints";
import { call } from "@/lib/http";
import { focusFirstError } from "@/lib/form-errors";

export function ValueChainList() {
  const translate = useTranslate();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { open: notify } = useNotification();
  const { mutate: remove } = useDelete();
  const { user } = useIdentity();
  const readOnly = user?.role === "REGIONAL_ADMIN";

  async function toggle(vc: ApiValueChain, enable: boolean) {
    try {
      if (enable) await call(ep.enableValueChain, { path: { id: vc.id! } });
      else await call(ep.disableValueChain, { path: { id: vc.id! } });
      notify?.({
        type: "success",
        message: translate("valueChains.notifications.success"),
        description: enable
          ? translate("valueChains.descriptions.valueChainHasBeenSuccessfully")
          : translate("valueChains.descriptions.valueChainHasBeenSuccessfullyDisabled"),
      });
      table.refineCore.tableQuery.refetch();
    } catch {
      notify?.({
        type: "error",
        message: translate("notifications.error"),
        description: enable ? translate("valueChains.notifications.cannotEnableValueChain") : translate("valueChains.notifications.cannotDisableValueChain"),
      });
    }
  }

  const columns = useMemo<ColumnDef<ApiValueChain>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        meta: { primary: true },
        header: ({ column }) => <SortableHeader column={column} label={translate("common.fields.name")} />,
      },
      {
        id: "description",
        accessorKey: "description",
        header: translate("common.fields.description"),
        enableSorting: false,
      },
      {
        id: "valueChainStatus",
        accessorKey: "valueChainStatus",
        header: translate("common.fields.status"),
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        cell: ({ row }) => {
          const vc = row.original;
          return (
            <RowActions
              actions={[
                {
                  label: readOnly
                    ? translate("common.fields.view")
                    : translate("common.fields.edit"),
                  onClick: () => navigate(`/value-chains/${vc.id}`),
                },
                {
                  label: translate("valueChains.fields.enable"),
                  disabled: readOnly || vc.valueChainStatus === "ENABLED",
                  onClick: () => toggle(vc, true),
                },
                {
                  label: translate("valueChains.fields.disable"),
                  disabled: readOnly || vc.valueChainStatus === "DISABLED",
                  onClick: () => toggle(vc, false),
                },
                {
                  label: translate("common.fields.delete"),
                  destructive: true,
                  separatorBefore: true,
                  disabled: readOnly,
                  onClick: async () => {
                    if (
                      await confirm({
                        description: translate("valueChains.descriptions.areYouSureYouWant", { name: vc.name }),
                        destructive: true,
                        confirmLabel: translate("buttons.delete"),
                      })
                    ) {
                      remove({
                        resource: "value-chains",
                        id: vc.id!,
                        successNotification: {
                          type: "success",
                          message: translate("valueChains.errors.valueChainHasBeenSuccessfully"),
                        },
                      });
                    }
                  },
                },
              ]}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readOnly]
  );

  const table = useTable<ApiValueChain>({
    columns,
    refineCoreProps: {
      resource: "value-chains",
      sorters: { initial: [{ field: "name", order: "asc" }] },
      syncWithLocation: true,
    },
  });
  const [status, setStatus] = useTableFilter(table, "valueChainStatus");
  const [name, setName] = useTableFilter(table, "name");

  return (
    <>
      <PageHeader
        title={translate("valueChains.titles.valueChains")}
        description={translate("valueChains.descriptions.listOfValueChainsTotal", { total: table.refineCore.result.total ?? 0 })}
        actions={
          <Button onClick={() => navigate("/value-chains/new")}>
            <Plus />
            {translate("valueChains.buttons.newValueChain")}
          </Button>
        }
      />
      <Toolbar>
        <SearchInput value={(name as string) ?? ""} onChange={setName} placeholder={translate("common.placeholders.searchByName")} />
        <SimpleSelect
          className="sm:w-48"
          options={[
            { value: "", label: translate("common.fields.allStatuses") },
            { value: "ENABLED", label: translate("valueChains.fields.active") },
            { value: "DISABLED", label: translate("valueChains.fields.deactivated") },
          ]}
          value={(status as string) ?? ""}
          onChange={setStatus}
        />
      </Toolbar>
      <DataTable table={table} getRowHref={(vc) => `/value-chains/${vc.id}`} />
    </>
  );
}

function useAll<T>(resource: string) {
  const { result } = useList<T & { id?: number }>({ resource, pagination: { mode: "off" } });
  return result?.data ?? [];
}

export function ValueChainDetail() {
  const translate = useTranslate();
  const { id } = useParams();
  const isNew = id == null;
  const { user } = useIdentity();
  const navigate = useNavigate();

  const { query: existing } = useOne<ApiValueChain>({
    resource: "value-chains",
    id,
    queryOptions: { enabled: !isNew },
  });
  const productTypes = useAll<ApiProductType>("product-types");
  const facilityTypes = useAll<ApiFacilityType>("facility-types");
  const measureUnitTypes = useAll<ApiMeasureUnitType>("measurement-unit-types");
  const evidenceTypes = useAll<ApiProcessingEvidenceType>("processing-evidence-types");
  const evidenceFields = useAll<ApiProcessingEvidenceField>("processing-evidence-fields");
  const semiProducts = useAll<ApiSemiProduct>("semi-products");

  const status = existing.data?.data?.valueChainStatus;
  // Disabled value chains and regional admins get a read-only form.
  const readOnly = user?.role === "REGIONAL_ADMIN" || (!isNew && status === "DISABLED");

  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading },
  } = useForm<ApiValueChain>({
    disabled: readOnly,
    defaultValues: {
      name: "",
      description: "",
      facilityTypes: [],
      measureUnitTypes: [],
      processingEvidenceTypes: [],
      processingEvidenceFields: [],
      semiProducts: [],
    },
    refineCoreProps: {
      resource: "value-chains",
      action: isNew ? "create" : "edit",
      id,
      redirect: false,
      onMutationSuccess: () => navigate("/value-chains"),
    },
  });

  useWarnWhenDirty(control);

  if (!isNew && existing.isLoading) return <FormSkeleton sections={3} />;

  return (
    <>
      <PageHeader
        title={isNew ? translate("valueChains.titles.newValueChain") : existing.data?.data?.name}
        breadcrumbs={[{ label: translate("common.fields.valueChains"), to: "/value-chains" }]}
        badge={status && <StatusBadge status={status} />}
      />
      <form onSubmit={handleSubmit((v) => onFinish(v), focusFirstError)}>
        <FormLayout control={control}>
          <Section id="basic" title={translate("common.titles.basicInformation")}>
            <FieldGroup className="grid gap-4 sm:grid-cols-2">
              <TextField
                control={control}
                name="name"
                label={translate("valueChains.fields.valueChainName")}
                rules={{
                  required: translate("valueChains.errors.valueChainNameIsRequired"),
                }}
              />
              <TextField
                control={control}
                name="description"
                label={translate("common.fields.description")}
                rules={{
                  required: translate("common.errors.descriptionIsRequired"),
                }}
              />
              <EntityComboboxField
                control={control}
                name="productType"
                label={translate("valueChains.fields.valueChainProductType")}
                items={productTypes}
                getLabel={(p) => p.name ?? ""}
                rules={{ required: translate("valueChains.errors.productTypeIsRequired") }}
              />
            </FieldGroup>
          </Section>
          <div className="grid gap-6 @3xl:grid-cols-2">
            <Section id="facility-types" title={translate("valueChains.titles.facilityTypes")}>
              <EntityListField
                searchable
                control={control}
                name="facilityTypes"
                items={facilityTypes}
                getLabel={(t) => t.label ?? ""}
              />
            </Section>
            <Section id="measuring-units" title={translate("valueChains.titles.measuringUnitTypes")}>
              <EntityListField
                searchable
                control={control}
                name="measureUnitTypes"
                items={measureUnitTypes}
                getLabel={(t) => t.label ?? ""}
              />
            </Section>
            <Section
              id="evidence-types"
              title={translate("valueChains.titles.processingEvidenceTypes")}
            >
              <EntityListField
                searchable
                control={control}
                name="processingEvidenceTypes"
                items={evidenceTypes}
                getLabel={(t) => t.label ?? ""}
              />
            </Section>
            <Section
              id="evidence-fields"
              title={translate("common.titles.processingEvidenceFields")}
            >
              <EntityListField
                searchable
                control={control}
                name="processingEvidenceFields"
                items={evidenceFields}
                getLabel={(t) => t.label ?? ""}
              />
            </Section>
            <Section
              id="semi-products"
              title={translate("valueChains.titles.semiProducts")}
              className="@3xl:col-span-2"
            >
              <EntityListField
                searchable
                control={control}
                name="semiProducts"
                items={semiProducts}
                getLabel={(t) => t.name ?? ""}
              />
            </Section>
          </div>
          {!readOnly && (
            <FormActions sticky control={control}>
              <Button type="button" variant="outline" disabled={formLoading} onClick={() => navigate("/value-chains")}>
                {translate("buttons.cancel")}
              </Button>
              <Button type="submit" disabled={formLoading}>
                {formLoading && <Spinner />}
                {translate("buttons.save")}
              </Button>
            </FormActions>
          )}
        </FormLayout>
      </form>
    </>
  );
}

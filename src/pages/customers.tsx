import { useDelete, useOne, useTranslate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import type { ApiCompanyCustomer } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { RowActions, SearchInput, Toolbar } from "@/components/app/controls";
import { EMAIL_PATTERN, TextField } from "@/components/app/form-fields";
import { LocationFields } from "@/components/app/location-fields";
import { FormActions, PageHeader, PageLoader, Section } from "@/components/app/page";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useSelectedCompany } from "@/hooks/use-session";
import { useTableFilter } from "@/hooks/use-table-filter";
import { focusFirstError } from "@/lib/form-errors";

/** `/my-customers` */
export function CustomerList() {
  const { companyId } = useSelectedCompany();
  if (companyId == null) return <PageLoader />;
  return <CustomerTable key={companyId} companyId={companyId} />;
}

function CustomerTable({ companyId }: { companyId: number }) {
  const translate = useTranslate();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { mutate: remove } = useDelete();

  const columns = useMemo<ColumnDef<ApiCompanyCustomer>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        meta: { primary: true },
        header: translate("common.fields.name"),
        enableSorting: false,
      },
      {
        id: "contact",
        accessorKey: "contact",
        header: translate("customers.fields.contact"),
        enableSorting: false,
      },
      {
        id: "email",
        accessorKey: "email",
        header: translate("common.fields.eMail"),
        enableSorting: false,
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        cell: ({ row }) => (
          <RowActions
            actions={[
              {
                label: translate("common.fields.edit"),
                onClick: () => navigate(`/my-customers/edit/${row.original.id}`),
              },
              {
                label: translate("common.fields.delete"),
                destructive: true,
                onClick: async () => {
                  if (
                    await confirm({
                      description: translate("customers.descriptions.areYouSureYouWant"),
                      destructive: true,
                      confirmLabel: translate("buttons.delete"),
                    })
                  ) {
                    remove({ resource: "company-customers", id: row.original.id! });
                  }
                },
              },
            ]}
          />
        ),
      },
    ],
    [navigate, confirm, remove]
  );

  const table = useTable<ApiCompanyCustomer>({
    columns,
    refineCoreProps: {
      resource: "company-customers",
      meta: { companyId },
      sorters: { initial: [{ field: "BY_NAME", order: "asc" }] },
      syncWithLocation: true,
    },
  });
  const [query, setQuery] = useTableFilter(table, "query");

  return (
    <>
      <PageHeader
        title={translate("customers.titles.customers")}
        description={translate("customers.descriptions.listOfCustomersTotal", { total: table.refineCore.result.total ?? 0 })}
        actions={
          <Button onClick={() => navigate("/my-customers/add")}>
            <Plus />
            {translate("customers.buttons.addCustomer")}
          </Button>
        }
      />
      <Toolbar>
        <SearchInput value={(query as string) ?? ""} onChange={setQuery} placeholder={translate("customers.placeholders.searchCustomers")} />
      </Toolbar>
      <DataTable table={table} getRowHref={(c) => `/my-customers/edit/${c.id}`} />
    </>
  );
}

/** `/my-customers/add` and `/my-customers/edit/:id` */
export function CustomerForm() {
  const translate = useTranslate();
  const { id } = useParams();
  const isNew = id == null;
  const { companyId } = useSelectedCompany();
  const navigate = useNavigate();
  const back = () => navigate("/my-customers");

  const { query } = useOne<ApiCompanyCustomer>({
    resource: "company-customers",
    id,
    queryOptions: { enabled: !isNew },
  });
  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading },
  } = useForm<ApiCompanyCustomer>({
    values: query.data?.data,
    defaultValues: { location: {} },
    refineCoreProps: {
      resource: "company-customers",
      action: isNew ? "create" : "edit",
      id,
      queryOptions: { enabled: false },
      redirect: false,
      onMutationSuccess: back,
    },
  });

  if (!isNew && query.isLoading) return <PageLoader />;

  return (
    <>
      <PageHeader
        title={
          isNew
            ? translate("customers.titles.newCustomer")
            : translate("customers.titles.editCustomer")
        }
        breadcrumbs={[{ label: translate("common.fields.myCustomers"), to: "/my-customers" }]}
      />
      <form
        onSubmit={handleSubmit((v) => onFinish({ ...v, companyId: companyId ?? undefined }), focusFirstError)}
        className="flex flex-col gap-6"
      >
        <Section title={translate("common.titles.basicInformation")}>
          <FieldGroup className="grid gap-4 sm:grid-cols-2">
            <TextField
              control={control}
              name="name"
              label={translate("common.fields.companyName")}
              rules={{ required: translate("common.errors.companyNameIsRequired") }}
            />
            <TextField
              control={control}
              name="officialCompanyName"
              label={translate("customers.fields.officialCompanyName")}
            />
            <TextField
              control={control}
              name="vatId"
              label={translate("customers.fields.companyVat")}
            />
            <TextField
              control={control}
              name="contact"
              label={translate("customers.fields.contact")}
            />
            <TextField
              control={control}
              name="email"
              type="email"
              label={translate("common.fields.eMail")}
              rules={{ pattern: EMAIL_PATTERN }}
            />
            <TextField
              control={control}
              name="phone"
              type="tel"
              label={translate("customers.fields.phoneNumber")}
            />
          </FieldGroup>
        </Section>
        <Section title={translate("customers.titles.location")}>
          <LocationFields control={control} prefix="location" variant="person" showVisibility={false} flat />
        </Section>
        <FormActions>
          <Button type="button" variant="outline" onClick={back}>
            {translate("buttons.cancel")}
          </Button>
          <Button type="submit" disabled={formLoading}>
            {formLoading && <Spinner />}
            {translate("buttons.save")}
          </Button>
        </FormActions>
      </form>
    </>
  );
}

import { useDelete, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Plus, Upload } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { ApiUserCustomer } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { RowActions, SearchInput, SimpleSelect, Toolbar, humanize } from "@/components/app/controls";
import { PageHeader, PageLoader, Section } from "@/components/app/page";
import { PlotsMap, WhispDialog } from "@/components/app/plots-map";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { sortable } from "@/components/refine-ui/data-table/data-table-sorter";
import { Button } from "@/components/ui/button";
import { useSelectedCompany } from "@/hooks/use-session";
import { useTableFilter } from "@/hooks/use-table-filter";
import { download, useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";
import { t } from "@/lib/i18n";
import { GENDERS } from "./form/model";

export type UserCustomerType = "FARMER" | "COLLECTOR";

export const KIND = {
  FARMER: {
    get title() { return t("userCustomers.titles.farmers"); },
    get one() { return t("userCustomers.fields.farmer"); },
    get add() { return t("buttons.addFarmer"); },
    get search() { return t("userCustomers.placeholders.searchFarmers"); },
    get confirmDelete() { return t("userCustomers.descriptions.deleteFarmerConfirm"); },
    listDescription: (total: number) => t("userCustomers.descriptions.listOfFarmersTotal", { total }),
    base: "/my-farmers",
  },
  COLLECTOR: {
    get title() { return t("userCustomers.titles.collectors"); },
    get one() { return t("userCustomers.fields.collector"); },
    get add() { return t("userCustomers.buttons.addCollector"); },
    get search() { return t("userCustomers.placeholders.searchCollectors"); },
    get confirmDelete() { return t("userCustomers.descriptions.deleteCollectorConfirm"); },
    listDescription: (total: number) => t("userCustomers.descriptions.listOfCollectorsTotal", { total }),
    base: "/my-collectors",
  },
} as const;

export function formatLocation(uc: ApiUserCustomer) {
  const a = uc.location?.address;
  if (!a) return "";
  if (a.country?.code === "RW") return [a.village, a.cell, a.sector].filter(Boolean).join(", ");
  if (a.country?.code === "HN") return [a.hondurasVillage, a.hondurasMunicipality].filter(Boolean).join(", ");
  return [a.city, a.state].filter(Boolean).join(", ");
}


/** `/my-farmers` and `/my-collectors` */
export function UserCustomerList({ type }: { type: UserCustomerType }) {
  const { companyId } = useSelectedCompany();
  if (companyId == null) return <PageLoader />;
  return <UserCustomerTable key={`${type}-${companyId}`} type={type} companyId={companyId} />;
}

function UserCustomerTable({ type, companyId }: { type: UserCustomerType; companyId: number }) {
  const translate = useTranslate();
  const kind = KIND[type];
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { mutate: remove } = useDelete();
  const [exporting, setExporting] = useState(false);

  const columns = useMemo<ColumnDef<ApiUserCustomer>[]>(
    () => [
      // Column ids are the backend's sortBy keys.
      { id: "BY_NAME", accessorKey: "name", header: sortable(translate("common.fields.firstName")), meta: { primary: true } },
      { id: "BY_SURNAME", accessorKey: "surname", header: sortable(translate("common.fields.lastName")) },
      {
        id: "gender",
        accessorKey: "gender",
        header: translate("userCustomers.fields.gender"),
        enableSorting: false,
        cell: ({ getValue }) => {
          const gender = getValue<string>();
          return GENDERS.find((g) => g.value === gender)?.label ?? humanize(gender);
        },
      },
      { id: "BY_ID", accessorKey: "id", header: sortable(translate("userCustomers.fields.userId")) },
      {
        id: "location",
        header: translate("userCustomers.fields.location"),
        enableSorting: false,
        cell: ({ row }) => formatLocation(row.original),
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
                onClick: () => navigate(`${kind.base}/edit/${row.original.id}`),
              },
              {
                label: translate("common.fields.delete"),
                destructive: true,
                onClick: async () => {
                  if (
                    await confirm({
                      description: kind.confirmDelete,
                      destructive: true,
                      confirmLabel: translate("buttons.delete"),
                    })
                  ) {
                    remove({ resource: "user-customers", id: row.original.id! });
                  }
                },
              },
            ]}
          />
        ),
      },
    ],
    [kind, navigate, confirm, remove]
  );

  const table = useTable<ApiUserCustomer>({
    columns,
    refineCoreProps: {
      resource: "user-customers",
      meta: { companyId, type },
      sorters: { initial: [{ field: "BY_NAME", order: "asc" }] },
      filters: { initial: [{ field: "searchBy", operator: "eq", value: "BY_NAME" }] },
      syncWithLocation: true,
    },
  });

  const [query, setQuery] = useTableFilter(table, "query");
  const [searchBy, setSearchBy] = useTableFilter(table, "searchBy");

  return (
    <>
      <PageHeader
        title={kind.title}
        description={kind.listDescription(table.refineCore.result.total ?? 0)}
        actions={
          <>
            {type === "FARMER" && (
              <>
                <Button
                  variant="outline"
                  disabled={exporting}
                  onClick={async () => {
                    setExporting(true);
                    try {
                      await download(ep.exportFarmerDataByCompany, { path: { companyId } }, "farmers_data.zip");
                    } finally {
                      setExporting(false);
                    }
                  }}
                >
                  <Download />
                  {translate("userCustomers.buttons.exportFarmerData")}
                </Button>
                <Button variant="outline" onClick={() => navigate(`${kind.base}/import`)}>
                  <Upload />
                  {translate("userCustomers.buttons.importFarmers")}
                </Button>
              </>
            )}
            <Button
              data-onboarding={type === "FARMER" ? "add-farmer" : undefined}
              onClick={() => navigate(`${kind.base}/add`)}
            >
              <Plus />
              {kind.add}
            </Button>
          </>
        }
      />
      <Toolbar>
        <SimpleSelect
          className="sm:w-40"
          options={[
            { value: "BY_NAME", label: translate("common.fields.firstName") },
            { value: "BY_SURNAME", label: translate("common.fields.lastName") },
          ]}
          value={(searchBy as string) ?? "BY_NAME"}
          onChange={(v) => setSearchBy(v ?? "BY_NAME")}
        />
        <SearchInput
          value={(query as string) ?? ""}
          onChange={setQuery}
          placeholder={kind.search}
        />
      </Toolbar>
      <DataTable table={table} getRowHref={(u) => `${kind.base}/edit/${u.id}`} />
      {type === "FARMER" && <CompanyPlots companyId={companyId} />}
    </>
  );
}

function CompanyPlots({ companyId }: { companyId: number }) {
  const translate = useTranslate();
  const { data } = useApi(ep.getUserCustomersPlotsForCompany, { path: { companyId } });
  const plots = Array.isArray(data) ? data : [];
  const [whisp, setWhisp] = useState<string | null>(null);
  if (plots.length === 0) return null;
  return (
    <Section
      title={translate("userCustomers.titles.plots")}
      description={translate("userCustomers.descriptions.plots", { plotsCount: plots.length })}
    >
      <PlotsMap className="h-[28rem]" plots={plots} onOpenWhisp={setWhisp} />
      {whisp && <WhispDialog geoId={whisp} onClose={() => setWhisp(null)} />}
    </Section>
  );
}

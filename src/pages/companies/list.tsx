import { useNotification, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import type { ApiCompanyListResponse } from "@/client/types.gen";
import { RowActions, SearchInput, SimpleSelect, StatusBadge, Toolbar, humanize } from "@/components/app/controls";
import { PageHeader } from "@/components/app/page";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { sortable } from "@/components/refine-ui/data-table/data-table-sorter";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useIdentity } from "@/hooks/use-session";
import { useTableFilter } from "@/hooks/use-table-filter";
import { call, useApi } from "@/lib/http";
import { ep } from "@/lib/endpoints";

const STATUS_OPTIONS = ["ACTIVE", "DEACTIVATED", "REGISTERED"].map((v) => ({ value: v, get label() { return humanize(v); } }));

export function CompanyList() {
  const translate = useTranslate();
  const { user } = useIdentity();
  const navigate = useNavigate();
  const { open: notify } = useNotification();
  const isSystemAdmin = user?.role === "SYSTEM_ADMIN";
  const [mineOnly, setMineOnly] = useState(true);
  const [merging, setMerging] = useState<ApiCompanyListResponse | null>(null);

  const columns = useMemo<ColumnDef<ApiCompanyListResponse>[]>(
    () => [
      {
        id: "name",
        accessorKey: "name",
        meta: { primary: true },
        header: sortable(translate("common.fields.name")),
      },
      {
        id: "status",
        accessorKey: "status",
        header: translate("common.fields.status"),
        meta: { card: "badge" },
        enableSorting: false,
        cell: ({ getValue }) => <StatusBadge status={getValue<string>()} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        size: 48,
        cell: ({ row }) => {
          const c = row.original;
          return (
            <RowActions
              actions={[
                {
                  label: translate("common.fields.edit"),
                  onClick: () => navigate(`/companies/${c.id}`),
                },
                {
                  label: translate("companies.fields.activate"),
                  hidden: c.status === "ACTIVE",
                  onClick: () => execute(c, "ACTIVATE_COMPANY"),
                },
                {
                  label: translate("companies.fields.deactivate"),
                  destructive: true,
                  hidden: c.status === "DEACTIVATED",
                  onClick: () => execute(c, "DEACTIVATE_COMPANY"),
                },
                { label: translate("companies.fields.mergeTo"), separatorBefore: true, onClick: () => setMerging(c) },
              ]}
            />
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const table = useTable<ApiCompanyListResponse>({
    columns,
    refineCoreProps: {
      resource: "companies",
      meta: { scope: isSystemAdmin && !mineOnly ? "all" : "mine" },
      sorters: { initial: [{ field: "name", order: "asc" }] },
      syncWithLocation: true,
    },
  });

  const [status, setStatus] = useTableFilter(table, "status");
  const [name, setName] = useTableFilter(table, "name");

  async function execute(c: ApiCompanyListResponse, action: "ACTIVATE_COMPANY" | "DEACTIVATE_COMPANY") {
    try {
      await call(ep.executeCompanyAction, { path: { action }, body: { companyId: c.id! } });
      table.refineCore.tableQuery.refetch();
    } catch {
      notify?.({
        type: "error",
        message: translate("companies.notifications.error"),
        description:
          action === "ACTIVATE_COMPANY"
            ? translate("companies.descriptions.cannotActivateCompany")
            : translate("companies.descriptions.cannotDeactivateCompany"),
      });
    }
  }

  return (
    <>
      <PageHeader
        title={translate("companies.titles.companies")}
        description={translate("companies.descriptions.listOfCompaniesTotal", { total: table.refineCore.result.total ?? 0 })}
        actions={
          <Button onClick={() => navigate("/companies/new")}>
            <Plus />
            {translate("companies.buttons.newCompany")}
          </Button>
        }
      />
      <Toolbar>
        <SearchInput value={(name as string) ?? ""} onChange={setName} placeholder={translate("common.placeholders.searchByName")} />
        <SimpleSelect
          className="sm:w-48"
          options={[{ value: "", label: translate("common.fields.allStatuses") }, ...STATUS_OPTIONS]}
          value={(status as string) ?? ""}
          onChange={setStatus}
        />
        {isSystemAdmin && (
          <div className="flex items-center gap-2">
            <Switch id="my-companies" checked={mineOnly} onCheckedChange={setMineOnly} />
            <Label htmlFor="my-companies">{translate("companies.fields.myCompaniesOnly")}</Label>
          </div>
        )}
      </Toolbar>
      <DataTable table={table} getRowHref={(c) => `/companies/${c.id}`} />
      <MergeDialog
        company={merging}
        onClose={() => setMerging(null)}
        onMerged={(target) => {
          setMerging(null);
          table.refineCore.tableQuery.refetch();
          notify?.({
            type: "success",
            message: translate("companies.notifications.merged"),
            description: translate("companies.notifications.companyHasBeenSuccessfullyMerged", { name: target.name }),
          });
        }}
      />
    </>
  );
}

function MergeDialog({
  company,
  onClose,
  onMerged,
}: {
  company: ApiCompanyListResponse | null;
  onClose: () => void;
  onMerged: (target: ApiCompanyListResponse) => void;
}) {
  const translate = useTranslate();
  const [targetId, setTargetId] = useState<number | null>(null);
  const [pending, setPending] = useState(false);
  const { data: companies = [] } = useApi(
    ep.listCompaniesAdmin,
    { query: { requestType: "FETCH", limit: 1000, sortBy: "name", sort: "ASC" } },
    { enabled: company != null, select: (r) => r?.items ?? [] }
  );

  const options = companies
    .filter((c) => c.id !== company?.id)
    .map((c) => ({ value: c.id as number, label: c.name ?? "" }));

  async function merge() {
    const target = companies.find((c) => c.id === targetId);
    if (!company || !target) return;
    setPending(true);
    try {
      await call(ep.executeCompanyAction, {
        path: { action: "MERGE_TO_COMPANY" },
        body: { companyId: company.id!, otherCompanyId: target.id },
      });
      setTargetId(null);
      onMerged(target);
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open={company != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{translate("companies.titles.mergeToCompany")}</DialogTitle>
          <DialogDescription>
            {translate("companies.descriptions.mergeCompanyTo", { name: company?.name })}
          </DialogDescription>
        </DialogHeader>
        <SimpleSelect
          options={options}
          value={targetId}
          onChange={setTargetId}
          placeholder={translate("companies.placeholders.selectCompany")}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
          <Button variant="destructive" disabled={targetId == null || pending} onClick={merge}>
            {translate("companies.buttons.merge")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

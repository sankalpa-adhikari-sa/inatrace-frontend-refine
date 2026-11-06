import { useDelete, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import type { ApiProcessingAction } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { RowActions } from "@/components/app/controls";
import { Section } from "@/components/app/page";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CompanyTabs } from "../company-tabs";
import { typeLabel } from "./action-types";

/** `/companies/:id/processingActions` */
export function CompanyProcessingActions() {
  const translate = useTranslate();
  const companyId = Number(useParams().id);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { mutate: remove } = useDelete();

  const columns = useMemo<ColumnDef<ApiProcessingAction>[]>(
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
        cell: ({ row }) => typeLabel(row.original.type),
      },
      {
        id: "input",
        header: translate("companies.processingActions.fields.input"),
        enableSorting: false,
        cell: ({ row }) => {
          const pa = row.original;
          if (pa.inputSemiProduct) return pa.inputSemiProduct.name;
          if (pa.inputFinalProduct) return `${pa.inputFinalProduct.name} (${pa.inputFinalProduct.product?.name ?? ""})`;
          return "";
        },
      },
      {
        id: "output",
        header: translate("companies.processingActions.fields.output"),
        enableSorting: false,
        cell: ({ row }) => {
          const pa = row.original;
          if (pa.outputFinalProduct)
            return `${pa.outputFinalProduct.name} (${pa.outputFinalProduct.product?.name ?? ""})`;
          return (pa.outputSemiProducts ?? []).map((o) => o.name).join(", ");
        },
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
                onClick: () => navigate(`/companies/${companyId}/processingActions/${row.original.id}/edit`),
              },
              {
                label: translate("common.fields.delete"),
                destructive: true,
                onClick: async () => {
                  if (
                    await confirm({
                      description: translate("companies.processingActions.descriptions.areYouSureYouWant"),
                      destructive: true,
                      confirmLabel: translate("buttons.delete"),
                    })
                  ) {
                    remove({ resource: "processing-actions", id: row.original.id! });
                  }
                },
              },
            ]}
          />
        ),
      },
    ],
    [companyId, navigate, confirm, remove]
  );

  const table = useTable<ApiProcessingAction>({
    columns,
    refineCoreProps: { resource: "processing-actions", meta: { companyId }, syncWithLocation: false },
  });

  return (
    <>
      <CompanyTabs
        companyId={companyId}
        actions={
          <Button
            data-onboarding="add-processing-action"
            onClick={() => navigate(`/companies/${companyId}/processingActions/new`)}
          >
            <Plus />
            {translate("companies.processingActions.buttons.newProcessingAction")}
          </Button>
        }
      />
      <Section plain
        title={translate("companies.processingActions.titles.listOfProcessingActions")}
        description={translate("common.descriptions.total", { total: table.refineCore.result.total ?? 0 })}
      >
        <DataTable table={table} />
      </Section>
    </>
  );
}

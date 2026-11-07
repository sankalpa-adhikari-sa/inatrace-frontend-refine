import { useDelete, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarX, Factory, Plus } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router";
import type { ApiProductLabelBatch } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { RowActions, SearchInput, Toolbar } from "@/components/app/controls";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { useTableFilter } from "@/hooks/use-table-filter";
import { LabelPageHeader, useLabelParams } from "./shared";

/** `/product-labels/:id/labels/:labelId/batches` (BatchesListComponent) */
export function LabelBatches() {
  const translate = useTranslate();
  const { productId, labelId } = useLabelParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { mutate: remove } = useDelete();
  const base = `/product-labels/${productId}/labels/${labelId}/batches`;

  const columns = useMemo<ColumnDef<ApiProductLabelBatch>[]>(
    () => [
      {
        id: "number",
        accessorKey: "number",
        header: translate("products.labelPages.fields.batchNumber"),
        meta: { card: "title" },
      },
      {
        id: "productionDate",
        accessorKey: "productionDate",
        header: translate("products.labelPages.fields.productionDate"),
        meta: { card: "meta", icon: Factory },
      },
      {
        id: "expiryDate",
        accessorKey: "expiryDate",
        header: translate("products.labelPages.fields.expiryDate"),
        meta: { card: "meta", icon: CalendarX },
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
                onClick: () => navigate(`${base}/${row.original.id}`),
              },
              {
                label: translate("common.fields.delete"),
                destructive: true,
                onClick: async () => {
                  if (
                    await confirm({
                      description: translate("products.labelPages.descriptions.areYouSureYouWant"),
                      destructive: true,
                      confirmLabel: translate("buttons.delete"),
                    })
                  ) {
                    remove({ resource: "label-batches", id: row.original.id! });
                  }
                },
              },
            ]}
          />
        ),
      },
    ],
    [navigate, confirm, remove, base]
  );

  const table = useTable<ApiProductLabelBatch>({
    columns,
    refineCoreProps: {
      resource: "label-batches",
      meta: { labelId },
      sorters: { initial: [{ field: "number", order: "asc" }] },
      syncWithLocation: true,
    },
  });
  const [number, setNumber] = useTableFilter(table, "number");

  return (
    <>
      <LabelPageHeader
        title={translate("products.labelPages.titles.batches2")}
        actions={
          <Button onClick={() => navigate(`${base}/new`)}>
            <Plus />
            {translate("products.labelPages.buttons.newBatch")}
          </Button>
        }
      />
      <Toolbar>
        <SearchInput
          value={(number as string) ?? ""}
          onChange={setNumber}
          placeholder={translate("products.labelPages.placeholders.searchBatchNumber")}
        />
        <span className="text-xs text-muted-foreground">
          {table.refineCore.result.total ?? 0} {translate("products.labelPages.titles.batches")}
        </span>
      </Toolbar>
      <DataTable table={table} />
    </>
  );
}

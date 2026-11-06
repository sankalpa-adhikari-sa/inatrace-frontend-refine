import { useCreate, useDelete, useList, useOne, useUpdate, useTranslate } from "@refinedev/core";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { useParams } from "react-router";
import type { ApiFinalProduct, ApiMeasureUnitType, ApiProductLabelBase } from "@/client/types.gen";
import { useConfirm } from "@/components/app/confirm";
import { RowActions } from "@/components/app/controls";
import { EntityListField, EntitySelectField, TextField, TextareaField } from "@/components/app/form-fields";
import { PageLoader } from "@/components/app/page";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useSelectedCompany } from "@/hooks/use-session";
import { ep } from "@/lib/endpoints";
import { useApi } from "@/lib/http";
import { ProductTabs } from "./tabs";

/** `/product-labels/:id/final-products` (FinalProductComponent + FinalProductListComponent) */
export function FinalProducts() {
  const translate = useTranslate();
  const productId = Number(useParams().id);
  const { companyId } = useSelectedCompany();
  const { data: product } = useApi(ep.getProduct, { path: { id: productId } });
  // Only the product's owner company manages its final products.
  const isProductAdmin = !!product?.associatedCompanies?.some((c) => c.type === "OWNER" && c.company?.id === companyId);
  const confirm = useConfirm();
  const { mutate: remove } = useDelete();
  const [editing, setEditing] = useState<number | "new" | null>(null);

  const columns = useMemo<ColumnDef<ApiFinalProduct>[]>(
    () => [
      { id: "name", accessorKey: "name", header: translate("common.fields.name") },
      {
        id: "description",
        accessorKey: "description",
        header: translate("common.fields.description"),
        enableSorting: false,
      },
      {
        id: "unitLabel",
        accessorFn: (f) => f.measurementUnitType?.label,
        header: translate("products.fields.unitLabel"),
        enableSorting: false,
      },
      {
        id: "actions",
        header: "",
        size: 48,
        enableSorting: false,
        cell: ({ row }) =>
          isProductAdmin && (
            <RowActions
              actions={[
                { label: translate("common.fields.edit"), onClick: () => setEditing(row.original.id!) },
                {
                  label: translate("common.fields.delete"),
                  destructive: true,
                  onClick: async () => {
                    const ok = await confirm({
                      description: translate("products.descriptions.areYouSureYouWantToRemoveFinal", { name: row.original.name }),
                      destructive: true,
                      confirmLabel: translate("buttons.remove"),
                    });
                    if (ok) remove({ resource: "final-products", id: row.original.id!, meta: { productId } });
                  },
                },
              ]}
            />
          ),
      },
    ],
    [isProductAdmin, confirm, remove, productId]
  );

  const table = useTable<ApiFinalProduct>({
    columns,
    refineCoreProps: {
      resource: "final-products",
      meta: { productId },
      sorters: { initial: [{ field: "name", order: "asc" }] },
      syncWithLocation: true,
    },
  });

  return (
    <>
      <ProductTabs
        productId={productId}
        actions={
          isProductAdmin && (
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus />
              {translate("products.buttons.newFinalProduct")}
            </Button>
          )
        }
      />
      <DataTable table={table} />
      {editing != null && (
        <FinalProductDialog
          productId={productId}
          id={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  );
}

/** FinalProductDetailModalComponent */
function FinalProductDialog({ productId, id, onClose }: { productId: number; id?: number; onClose: () => void }) {
  const isNew = id == null;
  const { query } = useOne<ApiFinalProduct>({
    resource: "final-products",
    id,
    meta: { productId },
    queryOptions: { enabled: !isNew },
  });
  const { result: units } = useList<ApiMeasureUnitType>({
    resource: "measurement-unit-types",
    pagination: { mode: "off" },
  });
  const { data: labels = [] } = useApi(ep.getProductLabels, { path: { id: productId } });

  if (!isNew && query.isLoading) {
    return (
      <Dialog open onOpenChange={(open) => !open && onClose()}>
        <DialogContent>
          <PageLoader />
        </DialogContent>
      </Dialog>
    );
  }
  return (
    <FinalProductForm
      productId={productId}
      initial={query.data?.data ?? { labels: [] }}
      units={units.data}
      labels={labels}
      onClose={onClose}
    />
  );
}

function FinalProductForm({
  productId,
  initial,
  units,
  labels,
  onClose,
}: {
  productId: number;
  initial: ApiFinalProduct;
  units: ApiMeasureUnitType[];
  labels: ApiProductLabelBase[];
  onClose: () => void;
}) {
  const translate = useTranslate();
  const isNew = initial.id == null;
  const { control, handleSubmit } = useForm<ApiFinalProduct>({ defaultValues: { labels: [], ...initial } });
  const { mutate: create, mutation: createMutation } = useCreate();
  const { mutate: update, mutation: updateMutation } = useUpdate();
  const pending = createMutation.isPending || updateMutation.isPending;

  function submit(values: ApiFinalProduct) {
    const meta = { productId };
    const options = { onSuccess: onClose };
    if (isNew) create({ resource: "final-products", values, meta }, options);
    else update({ resource: "final-products", id: initial.id!, values, meta }, options);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isNew
              ? translate("products.titles.addNewFinalProduct")
              : translate("products.titles.editFinalProduct")}
          </DialogTitle>
        </DialogHeader>
        <form id="final-product-form" onSubmit={handleSubmit(submit)}>
          <FieldGroup>
            <TextField
              control={control}
              name="name"
              label={translate("common.fields.name")}
              rules={{ required: translate("products.errors.nameIsRequired") }}
            />
            <TextareaField
              control={control}
              name="description"
              label={translate("common.fields.description")}
              rules={{
                required: translate("common.errors.descriptionIsRequired"),
              }}
            />
            <EntitySelectField
              control={control}
              name="measurementUnitType"
              label={translate("products.fields.measurementUnitType")}
              items={units}
              getLabel={(u) => u.label ?? ""}
              rules={{ required: translate("products.errors.measurementUnitTypeIsRequired") }}
            />
            <EntityListField
              control={control}
              name="labels"
              label={translate("products.fields.productLabels")}
              items={labels}
              getLabel={(l) => `${l.title || translate("products.productPage.titles.untitled")}${l.status === "UNPUBLISHED" ? translate("products.texts.unpublished") : ""}`}
            />
          </FieldGroup>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
          <Button type="submit" form="final-product-form" disabled={pending}>
            {pending && <Spinner />}
            {translate("buttons.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

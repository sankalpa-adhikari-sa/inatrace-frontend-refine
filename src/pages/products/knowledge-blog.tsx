import { useOne, useTranslate } from "@refinedev/core";
import { useForm } from "@refinedev/react-hook-form";
import { useTable } from "@refinedev/react-table";
import type { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useFieldArray } from "react-hook-form";
import { Navigate, useNavigate, useParams } from "react-router";
import type { ApiDocument, ApiKnowledgeBlog, ApiKnowledgeBlogBase } from "@/client/types.gen";
import { RowActions, SimpleSelect, Toolbar, humanize } from "@/components/app/controls";
import { DateField, TextField } from "@/components/app/form-fields";
import { FormActions, PageLoader, Section } from "@/components/app/page";
import { RichTextField } from "@/components/app/rich-text-field";
import { UploadField } from "@/components/app/upload-field";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { useTableFilter } from "@/hooks/use-table-filter";
import { ProductTabs } from "./tabs";
import { t } from "@/lib/i18n";

type BlogType = NonNullable<ApiKnowledgeBlog["type"]>;
const BLOG_TYPES: { value: BlogType; label: string }[] = [
  { value: "FAIRNESS", get label() { return t("products.fields.fairness"); } },
  { value: "QUALITY", get label() { return t("common.fields.quality"); } },
  { value: "PROVENANCE", get label() { return t("products.fields.provenance"); } },
];
const DOCUMENT_TYPES = "application/pdf,image/png,image/jpeg,image/jpg";

/** `/product-labels/:id/knowledge-blog` (ProductLabelKnowledgeBlogComponent) */
/** The public page of a blog entry (KnowledgeBlogFrontComponent), opened in a new tab like a visitor sees it. */
const openBlogPage = (productId: number, type: string | undefined, id: number | string | undefined) =>
  window.open(`/blog/${productId}/${type?.toLowerCase()}/${id}`, "_blank", "noopener");

export function KnowledgeBlogList() {
  const translate = useTranslate();
  const productId = Number(useParams().id);
  const navigate = useNavigate();
  const [choosing, setChoosing] = useState(false);
  const base = `/product-labels/${productId}/knowledge-blog`;

  const columns = useMemo<ColumnDef<ApiKnowledgeBlogBase>[]>(
    () => [
      { id: "title", accessorKey: "title", header: translate("products.fields.title") },
      { id: "date", accessorKey: "date", header: translate("common.fields.date") },
      {
        id: "type",
        accessorKey: "type",
        header: translate("common.fields.type"),
        cell: ({ getValue }) => humanize(getValue() as string),
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
                onClick: () => navigate(`${base}/${row.original.type?.toLowerCase()}/${row.original.id}`),
              },
              {
                label: translate("products.fields.viewPage"),
                onClick: () => openBlogPage(productId, row.original.type, row.original.id),
              },
            ]}
          />
        ),
      },
    ],
    [navigate, base]
  );

  const table = useTable<ApiKnowledgeBlogBase>({
    columns,
    refineCoreProps: {
      resource: "knowledge-blogs",
      meta: { productId },
      sorters: { initial: [{ field: "title", order: "asc" }] },
      syncWithLocation: true,
    },
  });
  const [type, setType] = useTableFilter(table, "type");

  return (
    <>
      <ProductTabs
        productId={productId}
        actions={
          <Button size="sm" onClick={() => setChoosing(true)}>
            <Plus />
            {translate("products.buttons.newBlogEntry")}
          </Button>
        }
      />
      <Toolbar>
        <SimpleSelect
          options={[{ value: "", label: translate("products.fields.allTypes") }, ...BLOG_TYPES]}
          value={(type as string) ?? ""}
          onChange={(v) => setType(v)}
          className="w-44"
        />
        <span className="text-xs text-muted-foreground">
          {table.refineCore.result.total ?? 0}{" "}
          {translate("products.titles.knowledgeBlogs")}
        </span>
      </Toolbar>
      <DataTable table={table} />
      {choosing && (
        <TypeDialog onClose={() => setChoosing(false)} onSelect={(t) => navigate(`${base}/${t.toLowerCase()}/new`)} />
      )}
    </>
  );
}

/** KnowledgeBlogSelectSectionModalComponent */
function TypeDialog({ onClose, onSelect }: { onClose: () => void; onSelect: (type: BlogType) => void }) {
  const translate = useTranslate();
  const [type, setType] = useState<BlogType | null>(null);
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{translate("products.titles.typeSelection")}</DialogTitle>
        </DialogHeader>
        <Field>
          <FieldLabel>
            {translate("products.fields.selectType")}
          </FieldLabel>
          <SimpleSelect options={BLOG_TYPES} value={type} onChange={setType} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {translate("buttons.cancel")}
          </Button>
          <Button disabled={!type} onClick={() => type && onSelect(type)}>
            {translate("buttons.continue")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** `/product-labels/:id/knowledge-blog/:type/new` and `.../:type/:knowledgeBlogId` (KnowledgeBlogPartComponent) */
export function KnowledgeBlogForm() {
  const translate = useTranslate();
  const params = useParams();
  const productId = Number(params.id);
  const blogId = params.knowledgeBlogId;
  const isNew = blogId == null;
  const type = BLOG_TYPES.find((t) => t.value.toLowerCase() === params.type);
  const navigate = useNavigate();
  const back = () => navigate(`/product-labels/${productId}/knowledge-blog`);

  const { query } = useOne<ApiKnowledgeBlog>({
    resource: "knowledge-blogs",
    id: blogId,
    queryOptions: { enabled: !isNew },
  });
  const {
    control,
    handleSubmit,
    refineCore: { onFinish, formLoading },
  } = useForm<ApiKnowledgeBlog>({
    values: query.data?.data,
    defaultValues: { documents: [] },
    refineCoreProps: {
      resource: "knowledge-blogs",
      action: isNew ? "create" : "edit",
      id: blogId,
      meta: { productId },
      queryOptions: { enabled: false },
      redirect: false,
      onMutationSuccess: back,
    },
  });
  const documents = useFieldArray({ control, name: "documents", keyName: "key" });

  if (!type) return <Navigate to={`/product-labels/${productId}/knowledge-blog`} replace />;
  if (!isNew && query.isLoading) return <PageLoader />;

  return (
    <>
      <ProductTabs productId={productId} />
      <form
        onSubmit={handleSubmit((v) =>
          onFinish({ ...v, type: type.value, documents: v.documents?.filter((d: ApiDocument) => d?.storageKey) })
        )}
        className="flex flex-col gap-6"
      >
        <Section
          title={
            isNew
              ? translate("products.titles.addEntry", { label: type.label.toLowerCase() })
              : translate("products.titles.editEntry", { label: type.label.toLowerCase() })
          }
          actions={
            !isNew && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                title={translate("products.titles.showsTheSavedVersion")}
                onClick={() => openBlogPage(productId, type.value, blogId)}
              >
                <ExternalLink />
                {translate("products.buttons.viewPage")}
              </Button>
            )
          }
        >
          <FieldGroup>
            <TextField
              control={control}
              name="title"
              label={translate("products.fields.title")}
              className="max-w-xl"
            />
            <RichTextField
              control={control}
              name="summary"
              label={translate("products.fields.abstract")}
            />
            <RichTextField
              control={control}
              name="content"
              label={translate("products.fields.content")}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <DateField
                control={control}
                name="date"
                label={translate("common.fields.date")}
              />
              <TextField
                control={control}
                name="youtubeUrl"
                type="url"
                label={translate("products.fields.youTubeUrl")}
              />
            </div>
          </FieldGroup>
        </Section>
        <Section
          title={translate("products.titles.documents")}
          description={translate("products.descriptions.pdfPngJpgAndJpeg")}
        >
          {documents.fields.map((f, i) => (
            <div key={f.key} className="flex items-end gap-2">
              <UploadField control={control} name={`documents.${i}`} accept={DOCUMENT_TYPES} className="flex-1" />
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={translate("products.buttons.removeDocument")}
                onClick={() => documents.remove(i)}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => documents.append({})}>
            <Plus />
            {translate("products.buttons.addDocument")}
          </Button>
        </Section>
        <FormActions>
          <Button type="button" variant="outline" onClick={back}>
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
